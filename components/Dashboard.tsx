
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { encryptData, decryptData } from '../services/cryptoUtils';
import { DecryptedEntry, CreateEntryPayload, DatabaseEntry, Category, CATEGORIES } from '../types';
import { EntryModal } from './EntryModal';
import { SettingsModal } from './SettingsModal';
import { HealthCheckModal } from './HealthCheckModal';
import { translations } from '../i18n/locales';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { 
    IconSearch, IconPlus, IconLogout, IconCopy, 
    IconEye, IconEyeOff, IconFolder, IconShieldCheck, IconTrash,
    IconShieldExclamation, IconDatabaseImport, IconSettings, IconActivity
} from '@tabler/icons-react';

export const Dashboard = () => {
  const { user, masterKey, entries, setEntries, lockVault, session, language } = useStore();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isHealthOpen, setHealthOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const t = translations[language].dashboard;
  const commonT = translations[language].common;

  // Fetch and Decrypt Data
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
        setIsLoadingData(false);
        return;
      }

      // Decrypt client-side
      const decryptedList: DecryptedEntry[] = [];
      for (const entry of (data as DatabaseEntry[])) {
        try {
            // Metadata is plaintext, sensitive data is decrypted
            
            // 1. Decrypt Password using the primary IV column
            const password = await decryptData(entry.encrypted_password, entry.iv, masterKey);
            
            // 2. Decrypt Notes
            let notes = '';
            if (entry.encrypted_notes) {
                if (entry.encrypted_notes.includes(':')) {
                    // New Format: "IV:Ciphertext"
                    const [noteIv, noteCipher] = entry.encrypted_notes.split(':');
                    if (noteIv && noteCipher) {
                         notes = await decryptData(noteCipher, noteIv, masterKey);
                    }
                } else {
                    // Fallback: Try using the entry's main IV (legacy format or data)
                    try {
                        notes = await decryptData(entry.encrypted_notes, entry.iv, masterKey);
                    } catch (e) {
                        // If fallback fails, assume empty or corrupted
                        console.warn(`Failed to decrypt notes for entry ${entry.id} using fallback IV`);
                    }
                }
            }
            
            decryptedList.push({
                id: entry.id,
                user_id: entry.user_id,
                service_name: entry.service_name,
                username: entry.username,
                category: entry.category,
                created_at: entry.created_at,
                password,
                notes
            });
        } catch (e) {
            console.error(`Failed to decrypt entry ${entry.id}`, e);
            // We intentionally skip pushing failed entries so the UI doesn't break
        }
      }
      setEntries(decryptedList);
      setIsLoadingData(false);
    };

    fetchEntries();
  }, [user, masterKey, setEntries]);

  // Save Handler
  const onSaveEntry = async (payload: CreateEntryPayload) => {
      if (!user || !masterKey) return;
      
      const pwEnc = await encryptData(payload.password, masterKey);
      
      let notesPayload = null;
      if (payload.notes) {
           const notesEnc = await encryptData(payload.notes, masterKey);
           // Store as "IV:CIPHER" to ensure unique IV for notes
           notesPayload = `${notesEnc.iv}:${notesEnc.cipherText}`;
      }

      const { data, error } = await supabase.from('entries').insert({
          user_id: user.id,
          service_name: payload.service_name,
          username: payload.username,
          category: payload.category,
          encrypted_password: pwEnc.cipherText,
          iv: pwEnc.iv,
          encrypted_notes: notesPayload
      }).select();

      if (error) throw error;

      if (data) {
          // Optimistically add to UI
          const newEntry: DecryptedEntry = {
              id: data[0].id,
              user_id: user.id,
              service_name: payload.service_name,
              username: payload.username,
              category: payload.category,
              created_at: data[0].created_at,
              password: payload.password,
              notes: payload.notes
          };
          setEntries([newEntry, ...entries]);
      }
  };

  const handleDelete = async (id: string) => {
      if(!confirm(commonT.confirm)) return;
      await supabase.from('entries').delete().eq('id', id);
      setEntries(entries.filter(e => e.id !== id));
  }

  const toggleReveal = (id: string) => {
      const newSet = new Set(revealedPasswords);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setRevealedPasswords(newSet);
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  }

  const handleLogout = async () => {
      lockVault();
      await supabase.auth.signOut();
      sessionStorage.clear();
      window.location.reload();
  }

  const filteredEntries = useMemo(() => {
      return entries.filter(e => {
          const matchesSearch = e.service_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (e.username && e.username.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
          return matchesSearch && matchesCategory;
      });
  }, [entries, searchTerm, selectedCategory]);

  // Helper to render the empty state description with bold parts
  const renderEmptyDesc = () => {
      const parts = t.emptyDesc.split(/<1>(.*?)<\/1>/);
      if (parts.length === 3) {
          return (
              <>
                {parts[0]} <strong className="text-amber-600 dark:text-amber-100">{parts[1]}</strong> {parts[2]}
              </>
          );
      }
      return t.emptyDesc;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-dark-800 flex flex-col hidden md:flex transition-colors duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-dark-800 flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg">
                <IconShieldCheck size={24} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">AuraCrypt</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.categories}</div>
            {CATEGORIES.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedCategory === cat 
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                    <IconFolder size={18} />
                    {cat === 'All' ? t.categoryAll : cat}
                </button>
            ))}

             <div className="my-4 border-t border-slate-200 dark:border-dark-800"></div>
             <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tools</div>
             
             <button onClick={() => setHealthOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition">
                <IconActivity size={18} className="text-red-500" />
                {t.healthCheck}
             </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-dark-800 space-y-3">
            <div className="flex items-center justify-between px-2 gap-2">
                <ThemeToggle />
                <LanguageToggle />
            </div>
            <div className="px-3 text-xs text-slate-500 truncate">
                {user?.email}
            </div>

            <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition">
                <IconSettings size={18} /> {t.settings}
            </button>

            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition">
                <IconLogout size={18} /> {t.logout}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-dark-900/50 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 flex items-center justify-between px-6 transition-colors duration-300">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-slate-100 dark:bg-dark-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 placeholder:text-slate-500 dark:placeholder:text-slate-600 transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <button 
                onClick={() => setModalOpen(true)}
                className="ml-4 bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-primary-500/20"
            >
                <IconPlus size={18} /> <span className="hidden sm:inline">{t.addEntryBtn}</span>
            </button>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
            {isLoadingData ? (
                <div className="flex items-center justify-center h-full text-slate-500">{t.decrypting}</div>
            ) : entries.length === 0 ? (
                // ZERO-KNOWLEDGE INITIALIZATION ONBOARDING STATE
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <div className="max-w-2xl w-full bg-white dark:bg-dark-900/50 border-2 border-dashed border-amber-300 dark:border-amber-500/30 rounded-3xl p-10 text-center animate-in fade-in zoom-in duration-500">
                        <div className="inline-flex p-5 rounded-full bg-amber-100 dark:bg-amber-500/10 mb-6">
                            <IconShieldExclamation size={64} className="text-amber-600 dark:text-amber-500" />
                        </div>
                        
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">{t.emptyTitle}</h2>
                        
                        <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg leading-relaxed max-w-lg mx-auto">
                            {renderEmptyDesc()}
                        </p>
                        
                        <div className="bg-slate-50 dark:bg-dark-950/50 p-5 rounded-xl border border-slate-200 dark:border-dark-800 mb-8 text-sm text-slate-600 dark:text-slate-500 max-w-lg mx-auto">
                            <strong>{t.emptyNotice.split(':')[0]}:</strong> {t.emptyNotice.split(':')[1]}
                        </div>
                        
                        <button
                            onClick={() => setModalOpen(true)}
                            className="bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 mx-auto transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
                        >
                            <IconPlus size={24} /> {t.createFirstBtn}
                        </button>
                    </div>
                </div>
            ) : filteredEntries.length === 0 ? (
                // NO SEARCH RESULTS STATE
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <IconFolder size={48} className="mb-4 opacity-20" />
                    <p>{t.noResults}</p>
                </div>
            ) : (
                // LIST STATE
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredEntries.map(entry => (
                        <div key={entry.id} className="group bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-xl p-5 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md relative">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{entry.service_name}</h3>
                                    <p className="text-xs text-slate-500">{entry.username || 'No username'}</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">
                                    {entry.category}
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-dark-950 rounded-lg p-3 mb-3 border border-slate-200 dark:border-dark-800 flex items-center justify-between">
                                <div className="font-mono text-sm truncate mr-2 text-primary-700 dark:text-primary-200">
                                    {revealedPasswords.has(entry.id) ? entry.password : '•••••••••••••'}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => toggleReveal(entry.id)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-dark-800 transition">
                                        {revealedPasswords.has(entry.id) ? <IconEyeOff size={16}/> : <IconEye size={16}/>}
                                    </button>
                                    <button onClick={() => copyToClipboard(entry.password)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-dark-800 transition">
                                        <IconCopy size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            {entry.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 italic border-l-2 border-slate-200 dark:border-dark-700 pl-2">
                                    {entry.notes}
                                </p>
                            )}

                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2">
                                <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition">
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>

      <EntryModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={onSaveEntry}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <HealthCheckModal
        isOpen={isHealthOpen}
        onClose={() => setHealthOpen(false)}
      />
    </div>
  );
};