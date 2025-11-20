
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { deriveKeyFromPassword, encryptData, decryptData } from '../services/cryptoUtils';
import { supabase } from '../supabaseClient';
import { IconX, IconSettings, IconShieldLock, IconClock, IconCheck, IconLoader2, IconAlertTriangle } from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, autoLockDuration, setAutoLockDuration, entries, setEntries, setMasterKey, user } = useStore();
  const t = translations[language].settings;
  const commonT = translations[language].common;

  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  
  // Change Password State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // Validation
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
        // 1. Verify Current Password by deriving key and checking against first entry (if exists)
        const oldKey = await deriveKeyFromPassword(currentPw);
        
        if (entries.length > 0) {
            // Verify against the database to ensure we have the right permission/key
            const { data, error } = await supabase
                .from('entries')
                .select('encrypted_password, iv')
                .eq('user_id', user.id)
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

        // 2. Generate New Key
        const newKey = await deriveKeyFromPassword(newPw);

        // 3. Re-encrypt ALL local entries
        const updates = await Promise.all(entries.map(async (entry) => {
            const pwEnc = await encryptData(entry.password, newKey);
            
            let notesPayload = null;
            if (entry.notes) {
                const notesEnc = await encryptData(entry.notes, newKey);
                notesPayload = `${notesEnc.iv}:${notesEnc.cipherText}`;
            }

            return {
                id: entry.id,
                encrypted_password: pwEnc.cipherText, // New Cipher
                iv: pwEnc.iv, // New IV
                encrypted_notes: notesPayload, // New Note Cipher
            };
        }));

        // 4. Batch Update Supabase
        let successCount = 0;
        
        // We loop through updates because Supabase bulk update requires uniform values or complicated SQL
        for (const update of updates) {
            // Rely on RLS for user_id check. 
            // explicitly checking user_id sometimes causes issues if session state is slightly out of sync with row RLS
            const { error, data } = await supabase
                .from('entries')
                .update({
                    encrypted_password: update.encrypted_password,
                    iv: update.iv,
                    encrypted_notes: update.encrypted_notes
                })
                .eq('id', update.id)
                .select('id'); // Select ID to confirm the row was returned/updated
            
            if (error) {
                console.error("Error updating entry:", update.id, error);
                throw error;
            }

            // If data is returned, the update was successful
            if (data && data.length > 0) {
                successCount++;
            } else {
                console.warn(`Entry ${update.id} update returned no data. Possible RLS restriction or ID mismatch.`);
            }
        }

        // If we have entries but 0 were updated, throw error
        if (entries.length > 0 && successCount === 0) {
            throw new Error("Database update failed. No entries were modified. Please check your connection.");
        }

        // 5. Update Local State
        await setMasterKey(newKey);
        setMsg({ type: 'success', text: t.success });
        setCurrentPw('');
        setNewPw('');
        setConfirmNewPw('');
        
        // Update store entries with new key encrypted versions conceptually (or just rely on masterKey update)
        // Since we have entries in memory as decrypted, we don't strictly need to update 'entries' state 
        // because 'entries' stores DECRYPTED data. 
        // However, if we reload, we need the new key. We already setMasterKey.
        // So we are good.

    } catch (err: any) {
        console.error(err);
        setMsg({ type: 'error', text: err.message || commonT.error });
    } finally {
        setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-200 dark:bg-dark-800 rounded-lg text-slate-700 dark:text-slate-300">
                <IconSettings size={24} />
             </div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-dark-800">
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'general' ? 'text-primary-600 dark:text-primary-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <span className="flex items-center justify-center gap-2">
                    <IconClock size={16} /> {t.general}
                </span>
                {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-500" />}
            </button>
            <button 
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'security' ? 'text-primary-600 dark:text-primary-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <span className="flex items-center justify-center gap-2">
                    <IconShieldLock size={16} /> {t.security}
                </span>
                {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-500" />}
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-dark-950 rounded-xl p-5 border border-slate-200 dark:border-dark-800">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <label className="font-bold text-slate-900 dark:text-white block mb-1">{t.autoLockLabel}</label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.autoLockDesc}</p>
                            </div>
                            <IconClock className="text-slate-400" size={24} />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            {[0, 5, 15, 30, 60].map(min => (
                                <button
                                    key={min}
                                    onClick={() => setAutoLockDuration(min)}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${
                                        autoLockDuration === min
                                        ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:border-primary-500 dark:text-primary-400'
                                        : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:border-primary-400 dark:hover:border-primary-600'
                                    }`}
                                >
                                    {min === 0 ? t.off : `${min} ${t.min}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 text-sm flex gap-3">
                        <IconAlertTriangle className="shrink-0" size={20} />
                        <p>{t.changePwDesc}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.currentPw}</label>
                            <input 
                                type="password"
                                required
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                                value={currentPw}
                                onChange={(e) => setCurrentPw(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.newPw}</label>
                                <input 
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.confirmNewPw}</label>
                                <input 
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                                    value={confirmNewPw}
                                    onChange={(e) => setConfirmNewPw(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {msg && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                            {msg.type === 'success' ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                            {msg.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isUpdating ? (
                            <>
                                <IconLoader2 className="animate-spin" size={20} />
                                {t.reencrypting}
                            </>
                        ) : (
                            t.updateBtn
                        )}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};
    