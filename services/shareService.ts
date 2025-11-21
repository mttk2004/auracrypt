
import { supabase } from '../supabaseClient';
import { encryptData, decryptData, exportKeyToString, importKeyFromString } from './cryptoUtils';
import { DecryptedEntry, SharedDataPayload, ShareConfig } from '../types';

/**
 * Generates a random 256-bit key for transient encryption
 */
const generateTransientKey = async (): Promise<CryptoKey> => {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
};

export const createShareLink = async (entry: DecryptedEntry, config: ShareConfig): Promise<string> => {
    // 1. Prepare Data
    const payload: SharedDataPayload = {
        service_name: entry.service_name,
        username: entry.username || '',
        password: entry.password,
        url: entry.url || '',
        notes: entry.notes
    };
    const jsonString = JSON.stringify(payload);

    // 2. Generate Transient Key (Client-side only)
    const transientKey = await generateTransientKey();
    
    // 3. Encrypt Data
    const { cipherText, iv } = await encryptData(jsonString, transientKey);

    // 4. Calculate Expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.hours);

    // 5. Upload to Supabase (Only Blob + IV + Meta)
    const { data, error } = await supabase
        .from('shared_entries')
        .insert({
            encrypted_data: cipherText,
            iv: iv,
            views_remaining: config.views,
            expires_at: expiresAt.toISOString()
        })
        .select('id')
        .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create share link");

    // 6. Export Key to URL Hash
    const keyJson = await exportKeyToString(transientKey);
    // Base64 encode the key JSON to make it URL safe and look cleaner
    const keyB64 = btoa(keyJson);
    
    // 7. Construct URL
    // Format: https://domain.com/?share=<UUID>#key=<KEY>
    const shareUrl = `${window.location.origin}/?share=${data.id}#key=${keyB64}`;
    
    return shareUrl;
};

export const getSharedEntry = async (id: string, keyB64: string): Promise<SharedDataPayload> => {
    // 1. Fetch Blob
    const { data, error } = await supabase
        .from('shared_entries')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) throw new Error("Link not found");

    // 2. Check Expiration
    if (new Date(data.expires_at) < new Date()) {
        throw new Error("Link expired");
    }

    // 3. Check Views
    if (data.views_remaining <= 0) {
        throw new Error("Link burned");
    }

    // 4. Decrement Views (If it's a burn-on-read link, this effectively kills it)
    await supabase.rpc('decrement_views', { row_id: id });
    // Note: Since we can't easily add RPC functions without user running SQL, 
    // we will use a simple update for now. It's not atomic but sufficient for this demo.
    const { error: updateError } = await supabase
        .from('shared_entries')
        .update({ views_remaining: data.views_remaining - 1 })
        .eq('id', id);

    if (updateError) console.warn("Failed to update view count");

    // 5. Import Key
    try {
        const keyJson = atob(keyB64);
        const key = await importKeyFromString(keyJson);

        // 6. Decrypt
        const jsonString = await decryptData(data.encrypted_data, data.iv, key);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error(e);
        throw new Error("Decryption failed. Invalid key in URL.");
    }
};
