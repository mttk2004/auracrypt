import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { deriveKeyFromPassword, encryptData, decryptData } from '../services/cryptoUtils';
import { generateCSV, parseImportCSV } from '../services/dataUtils';
import { supabase } from '../supabaseClient';
import { DecryptedEntry } from '../types';

export const useSettings = () => {
    const { language, entries, setEntries, setMasterKey, user, addToast } = useStore();
    const t = translations[language].settings;
    const commonT = translations[language].common;

    // Password Change State
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmNewPw, setConfirmNewPw] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [msg, setMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

    // Import/Export State
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);

        if (newPw !== confirmNewPw) {
            setMsg({ type: 'error', text: t.pwMismatch });
            return;
        }
        if (newPw.length < 6) {
            setMsg({ type: 'error', text: t.pwTooShort });
            return;
        }
        if (!user) return;

        setIsUpdating(true);

        try {
            // 1. Verify Current Password
            const oldKey = await deriveKeyFromPassword(currentPw);
            
            if (entries.length > 0) {
                const { data, error } = await supabase
                    .from('entries')
                    .select('encrypted_password, iv')
                    .limit(1)
                    .single();
                
                if (error && error.code !== 'PGRST116') throw error;

                if (data) {
                    try {
                        await decryptData(data.encrypted_password, data.iv, oldKey);
                    } catch (e) {
                        throw new Error(t.incorrectCurrent);
                    }
                }
            }

            // 2. Generate New Key & Re-encrypt
            const newKey = await deriveKeyFromPassword(newPw);

            const updates = await Promise.all(entries.map(async (entry) => {
                const pwEnc = await encryptData(entry.password, newKey);
                
                let notesPayload = null;
                if (entry.notes) {
                    const notesEnc = await encryptData(entry.notes, newKey);
                    notesPayload = `${notesEnc.iv}:${notesEnc.cipherText}`;
                }

                return {
                    id: entry.id,
                    encrypted_password: pwEnc.cipherText,
                    iv: pwEnc.iv,
                    encrypted_notes: notesPayload,
                };
            }));

            // 3. Batch Update
            let successCount = 0;
            for (const update of updates) {
                const { error, data } = await supabase
                    .from('entries')
                    .update({
                        encrypted_password: update.encrypted_password,
                        iv: update.iv,
                        encrypted_notes: update.encrypted_notes
                    })
                    .eq('id', update.id)
                    .select('id');
                
                if (error) throw error;
                if (data && data.length > 0) successCount++;
            }

            await setMasterKey(newKey);
            addToast('success', t.success);
            setMsg({ type: 'success', text: t.success });
            setCurrentPw('');
            setNewPw('');
            setConfirmNewPw('');

        } catch (err: any) {
            console.error(err);
            setMsg({ type: 'error', text: err.message || commonT.error });
            addToast('error', err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        const csv = generateCSV(entries);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auracrypt_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        addToast('success', "Vault exported to CSV");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const masterKey = useStore.getState().masterKey;
        if (!masterKey) return;

        setIsImporting(true);
        setMsg(null);

        try {
            const payloads = await parseImportCSV(file);
            
            if (payloads.length === 0) {
                setMsg({ type: 'error', text: "No valid entries found in CSV." });
                addToast('error', "No valid entries found");
                return;
            }

            const newDecryptedEntries: DecryptedEntry[] = [];
            const dbInserts = await Promise.all(payloads.map(async (p) => {
                const pwEnc = await encryptData(p.password, masterKey);
                let notesPayload = null;
                if (p.notes) {
                    const notesEnc = await encryptData(p.notes, masterKey);
                    notesPayload = `${notesEnc.iv}:${notesEnc.cipherText}`;
                }

                return {
                    user_id: user.id,
                    type: p.type,
                    service_name: p.service_name,
                    username: p.username,
                    url: p.url || null,
                    category: p.category,
                    encrypted_password: pwEnc.cipherText,
                    iv: pwEnc.iv,
                    encrypted_notes: notesPayload
                };
            }));

            const { data, error } = await supabase.from('entries').insert(dbInserts).select();
            if (error) throw error;

            if (data) {
                data.forEach((dbEntry, idx) => {
                    const payload = payloads[idx];
                    newDecryptedEntries.push({
                        id: dbEntry.id,
                        user_id: user.id,
                        type: payload.type,
                        service_name: payload.service_name,
                        username: payload.username,
                        url: payload.url,
                        category: payload.category,
                        created_at: dbEntry.created_at,
                        password: payload.password,
                        notes: payload.notes
                    });
                });
                setEntries([...newDecryptedEntries, ...entries]);
                const successMsg = t.importSuccess.replace('{{count}}', String(newDecryptedEntries.length));
                setMsg({ type: 'success', text: successMsg });
                addToast('success', successMsg);
            }

        } catch (err: any) {
            console.error("Import failed", err);
            setMsg({ type: 'error', text: "Import failed: " + err.message });
            addToast('error', "Import failed");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return {
        currentPw, setCurrentPw,
        newPw, setNewPw,
        confirmNewPw, setConfirmNewPw,
        isUpdating, msg,
        isImporting, fileInputRef,
        handleChangePassword,
        handleExport,
        handleImportClick,
        handleFileChange
    };
};