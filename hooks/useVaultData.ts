
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store/useStore';
import { decryptData, encryptData } from '../services/cryptoUtils';
import { DatabaseEntry, DecryptedEntry, CreateEntryPayload } from '../types';

export const useVaultData = () => {
    const { user, masterKey, entries, setEntries, addToast } = useStore();
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Fetch and Decrypt
    useEffect(() => {
        if (!user || !masterKey) return;

        const fetchEntries = async () => {
            setIsLoadingData(true);
            const { data, error } = await supabase
                .from('entries')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching entries:", error);
                addToast('error', "Failed to fetch data from server.");
                setIsLoadingData(false);
                return;
            }

            const decryptedList: DecryptedEntry[] = [];
            for (const entry of (data as DatabaseEntry[])) {
                try {
                    const password = await decryptData(entry.encrypted_password, entry.iv, masterKey);
                    
                    let notes = '';
                    if (entry.encrypted_notes) {
                        if (entry.encrypted_notes.includes(':')) {
                            const [noteIv, noteCipher] = entry.encrypted_notes.split(':');
                            if (noteIv && noteCipher) {
                                notes = await decryptData(noteCipher, noteIv, masterKey);
                            }
                        } else {
                            // Legacy fallback
                            try {
                                notes = await decryptData(entry.encrypted_notes, entry.iv, masterKey);
                            } catch (e) {}
                        }
                    }
                    
                    decryptedList.push({
                        id: entry.id,
                        user_id: entry.user_id,
                        service_name: entry.service_name,
                        username: entry.username,
                        url: entry.url,
                        category: entry.category,
                        created_at: entry.created_at,
                        password,
                        notes
                    });
                } catch (e) {
                    console.error(`Failed to decrypt entry ${entry.id}`, e);
                }
            }
            setEntries(decryptedList);
            setIsLoadingData(false);
        };

        fetchEntries();
    }, [user, masterKey, setEntries, addToast]);

    // Create / Update Logic
    const handleSaveEntry = async (payload: CreateEntryPayload, entryToEdit?: DecryptedEntry | null) => {
        if (!user || !masterKey) return;
      
        const pwEnc = await encryptData(payload.password, masterKey);
      
        let notesPayload = null;
        if (payload.notes) {
             const notesEnc = await encryptData(payload.notes, masterKey);
             notesPayload = `${notesEnc.iv}:${notesEnc.cipherText}`;
        }

        if (entryToEdit) {
            const { data, error } = await supabase.from('entries').update({
                service_name: payload.service_name,
                username: payload.username,
                url: payload.url || null,
                category: payload.category,
                encrypted_password: pwEnc.cipherText,
                iv: pwEnc.iv,
                encrypted_notes: notesPayload
            })
            .eq('id', entryToEdit.id)
            .select();

            if (error) throw error;

            if (data) {
                const updatedEntry: DecryptedEntry = {
                    ...entryToEdit,
                    service_name: payload.service_name,
                    username: payload.username,
                    url: payload.url,
                    category: payload.category,
                    password: payload.password,
                    notes: payload.notes
                };
                setEntries(entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
            }
        } else {
            const { data, error } = await supabase.from('entries').insert({
                user_id: user.id,
                service_name: payload.service_name,
                username: payload.username,
                url: payload.url || null,
                category: payload.category,
                encrypted_password: pwEnc.cipherText,
                iv: pwEnc.iv,
                encrypted_notes: notesPayload
            }).select();

            if (error) throw error;

            if (data) {
                const newEntry: DecryptedEntry = {
                    id: data[0].id,
                    user_id: user.id,
                    service_name: payload.service_name,
                    username: payload.username,
                    url: payload.url,
                    category: payload.category,
                    created_at: data[0].created_at,
                    password: payload.password,
                    notes: payload.notes
                };
                setEntries([newEntry, ...entries]);
            }
        }
    };

    const handleDeleteEntry = async (id: string) => {
        const { error } = await supabase.from('entries').delete().eq('id', id);
        if (error) throw error;
        setEntries(entries.filter(e => e.id !== id));
    };

    // Filtering
    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const matchesSearch = e.service_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (e.username && e.username.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [entries, searchTerm, selectedCategory]);

    return {
        entries: filteredEntries,
        totalEntries: entries.length,
        isLoadingData,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        handleSaveEntry,
        handleDeleteEntry
    };
};
