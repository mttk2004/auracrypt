import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store/useStore';
import { deriveKeyFromPassword, decryptData } from '../services/cryptoUtils';
import { DatabaseEntry } from '../types';
import { translations } from '../i18n/locales';

export type VaultMode = 'checking' | 'setup' | 'unlock';

export const useVaultAuth = () => {
    const [mode, setMode] = useState<VaultMode>('checking');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [testEntry, setTestEntry] = useState<DatabaseEntry | null>(null);

    const { session, setMasterKey, language } = useStore();
    const t = translations[language].vault;

    // 1. Check Vault Status on Mount
    useEffect(() => {
        const checkVaultStatus = async () => {
            if (!session?.user) return;
            
            try {
                const { data, error } = await supabase
                    .from('entries')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) throw error;

                if (!data || data.length === 0) {
                    setMode('setup');
                    setTestEntry(null);
                } else {
                    setTestEntry(data[0] as DatabaseEntry);
                    setMode('unlock');
                }
            } catch (err) {
                console.error("Failed to check vault status:", err);
                setErrorMsg(t.networkError);
            }
        };

        checkVaultStatus();
    }, [session, t.networkError]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        const cleanPassword = password.trim(); 

        try {
            const key = await deriveKeyFromPassword(cleanPassword);

            // Verify against the test entry
            if (testEntry) {
                try {
                    await decryptData(testEntry.encrypted_password, testEntry.iv, key);
                    await setMasterKey(key);
                } catch (decryptionError) {
                    throw new Error(t.incorrectPw);
                }
            } else {
                 // Fallback for edge cases
                 await setMasterKey(key);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to unlock.");
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const cleanPassword = password.trim();
        const cleanConfirm = confirmPassword.trim();

        if (cleanPassword !== cleanConfirm) {
            setErrorMsg(t.passwordMismatch);
            return;
        }
        
        if (cleanPassword.length < 6) {
            setErrorMsg(t.passwordTooShort);
            return;
        }

        setLoading(true);
        try {
            const key = await deriveKeyFromPassword(cleanPassword);
            await setMasterKey(key); 
        } catch (err) {
            console.error(err);
            setErrorMsg("Failed to generate key encryption.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencyReset = async () => {
        if (!session?.user) {
            alert("Session invalid. Please refresh.");
            return;
        }

        const confirmed = window.confirm(t.resetConfirm);
        if (!confirmed) return;

        setLoading(true);
        setErrorMsg(null);

        try {
            const { error } = await supabase
                .from('entries')
                .delete()
                .eq('user_id', session.user.id);

            if (error) throw error;

            setMode('setup');
            setTestEntry(null);
            setPassword('');
            setConfirmPassword('');
            alert(t.resetSuccess);
        } catch (err: any) {
            console.error("Reset Error:", err);
            setErrorMsg("Reset failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        mode,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        loading,
        errorMsg,
        handleUnlock,
        handleSetup,
        handleEmergencyReset
    };
};