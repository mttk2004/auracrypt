
import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { deriveKeyFromPassword, encryptData, decryptData } from '../services/cryptoUtils';
import { generateCSV, parseImportCSV } from '../services/dataUtils';
import { supabase } from '../supabaseClient';
import { DecryptedEntry } from '../types';
import { 
    IconX, IconSettings, IconShieldLock, IconClock, IconCheck, IconLoader2, 
    IconAlertTriangle, IconDatabaseImport, IconDownload, IconUpload, IconFileSpreadsheet
} from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, autoLockDuration, setAutoLockDuration, entries, setEntries, setMasterKey, user, addToast } = useStore();
  const t = translations[language].settings;
  const commonT = translations[language].common;

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'data'>('general');
  
  // Change Password State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                encrypted_password: pwEnc.cipherText,
                iv: pwEnc.iv,
                encrypted_notes: notesPayload,
            };
        }));

        // 4. Batch Update Supabase
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

        if (entries.length > 0 && successCount === 0) {
            throw new Error("Database update failed. No entries were modified.");
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

  // --- EXPORT HANDLER ---
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

  // --- IMPORT HANDLER ---
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
          // 1. Parse CSV
          const payloads = await parseImportCSV(file);
          
          if (payloads.length === 0) {
              setMsg({ type: 'error', text: "No valid entries found in CSV." });
              addToast('error', "No valid entries found");
              return;
          }

          // 2. Encrypt & Prepare Batches
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
                  service_name: p.service_name,
                  username: p.username,
                  url: p.url || null,
                  category: p.category,
                  encrypted_password: pwEnc.cipherText,
                  iv: pwEnc.iv,
                  encrypted_notes: notesPayload
              };
          }));

          // 3. Batch Insert to Supabase
          const { data, error } = await supabase
              .from('entries')
              .insert(dbInserts)
              .select();

          if (error) throw error;

          // 4. Update Local State
          if (data) {
              data.forEach((dbEntry, idx) => {
                  const payload = payloads[idx];
                  newDecryptedEntries.push({
                      id: dbEntry.id,
                      user_id: user.id,
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
             <button 
                onClick={() => setActiveTab('data')}
                className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'data' ? 'text-primary-600 dark:text-primary-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <span className="flex items-center justify-center gap-2">
                    <IconDatabaseImport size={16} /> {t.data}
                </span>
                {activeTab === 'data' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-500" />}
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {/* --- GENERAL TAB --- */}
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

            {/* --- SECURITY TAB --- */}
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

            {/* --- DATA TAB --- */}
            {activeTab === 'data' && (
                <div className="space-y-6">
                    {/* Export Section */}
                    <div className="bg-white dark:bg-dark-950 rounded-xl p-5 border border-slate-200 dark:border-dark-800">
                         <div className="flex items-center gap-3 mb-3 text-slate-900 dark:text-white">
                            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                <IconDownload size={24} />
                            </div>
                            <h4 className="font-bold text-lg">{t.exportTitle}</h4>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.exportDesc}</p>
                        
                        <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20 mb-4 text-xs text-red-600 dark:text-red-400">
                            <strong>WARNING:</strong> {t.exportWarn}
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={entries.length === 0}
                            className="w-full py-2.5 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                             <IconFileSpreadsheet size={18} /> {t.exportBtn}
                        </button>
                    </div>

                    {/* Import Section */}
                    <div className="bg-white dark:bg-dark-950 rounded-xl p-5 border border-slate-200 dark:border-dark-800">
                        <div className="flex items-center gap-3 mb-3 text-slate-900 dark:text-white">
                            <div className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg">
                                <IconUpload size={24} />
                            </div>
                            <h4 className="font-bold text-lg">{t.importTitle}</h4>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.importDesc}</p>

                        <input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef}
                            className="hidden" 
                            onChange={handleFileChange}
                        />

                        <button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
                        >
                             {isImporting ? <IconLoader2 className="animate-spin" size={18} /> : <IconDatabaseImport size={18} />}
                             {isImporting ? t.importing : t.importBtn}
                        </button>

                        {msg && activeTab === 'data' && (
                             <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                {msg.type === 'success' ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                                {msg.text}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
