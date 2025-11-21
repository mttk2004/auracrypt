
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { encryptData, decryptData } from '../services/cryptoUtils';
import { DecryptedEntry, CreateEntryPayload, DatabaseEntry } from '../types';
import { EntryModal } from './EntryModal';
import { SettingsModal } from './SettingsModal';
import { HealthCheckModal } from './HealthCheckModal';
import { CategoryModal } from './CategoryModal';
import { AboutModal } from './AboutModal';
import { SkeletonEntry } from './SkeletonEntry';
import { translations } from '../i18n/locales';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { 
    IconSearch, IconPlus, IconLogout, IconCopy, 
    IconEye, IconEyeOff, IconFolder, IconShieldCheck, IconTrash,
    IconShieldExclamation, IconSettings, IconActivity, IconExternalLink, 
    IconWorld, IconPencil, IconNote, IconMenu2, IconX, IconCategory, IconInfoCircle
} from '@tabler/icons-react';

export const Dashboard = () => {
  const { user, masterKey, entries, setEntries, lockVault, session, language, addToast, categories, fetchCategories } = useStore();
  
  // Modals
  const [isModalOpen, setModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<DecryptedEntry | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isHealthOpen, setHealthOpen] = useState(false);
  const [isCatModalOpen, setCatModalOpen] = useState(false);
  const [isAboutOpen, setAboutOpen] = useState(false);
  
  // UI State
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const t = translations[language].dashboard;
  const commonT = translations[language].common;
  const modalT = translations[language].modal;

  // Fetch Categories on mount
  useEffect(() => {
      if (user) fetchCategories();
  }, [user, fetchCategories]);

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
        addToast('error', "Failed to fetch data from server.");
        setIsLoadingData(false);
        return;
      }

      // Decrypt client-side
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
                    try {
                        notes = await decryptData(entry.encrypted_notes, entry.iv, masterKey);
                    } catch (e) {
                        console.warn(`Failed to decrypt notes for entry ${entry.id}`);
                    }
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

  // Save Handler
  const onSaveEntry = async (payload: CreateEntryPayload) => {
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

  const handleAddNewClick = () => {
      setEntryToEdit(null);
      setModalOpen(true);
      setMobileMenuOpen(false);
  };

  const handleEditClick = (entry: DecryptedEntry) => {
      setEntryToEdit(entry);
      setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
      if(!confirm(commonT.confirm)) return;
      
      const { error } = await supabase.from('entries').delete().eq('id', id);
      
      if (error) {
          addToast('error', "Failed to delete entry");
      } else {
          setEntries(entries.filter(e => e.id !== id));
          addToast('success', "Entry deleted successfully");
      }
  }

  const toggleReveal = (id: string) => {
      const newSet = new Set(revealedPasswords);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setRevealedPasswords(newSet);
  }

  const copyToClipboard = (id: string, text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      addToast('success', modalT.copied);
      setTimeout(() => setCopiedId(null), 2000);
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
  
  const getFaviconUrl = (url: string | null) => {
      if (!url) return null;
      try {
          const domain = new URL(url).hostname;
          return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch (e) {
          return null;
      }
  };

  const formatUrl = (url: string | null) => {
      if (!url) return '';
      try {
          const urlObj = new URL(url);
          return urlObj.hostname;
      } catch(e) {
          return url;
      }
  }

  // Sidebar Content Component
  const SidebarContent = () => (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-600 rounded-lg">
                    <IconShieldCheck size={24} className="text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">AuraCrypt</span>
            </div>
            <button 
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg"
            >
                <IconX size={24} />
            </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                {t.categories}
                <button 
                    onClick={() => { setCatModalOpen(true); setMobileMenuOpen(false); }} 
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1 rounded transition"
                    title={t.manageCats}
                >
                    <IconCategory size={14} />
                </button>
            </div>
            
            <button
                onClick={() => {
                    setSelectedCategory('All');
                    setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectedCategory === 'All' 
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
                <IconFolder size={18} />
                {t.categoryAll}
            </button>

            {categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => {
                        setSelectedCategory(cat.name);
                        setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedCategory === cat.name
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                    <IconFolder size={18} />
                    {cat.name}
                </button>
            ))}

             <div className="my-4 border-t border-slate-200 dark:border-dark-800"></div>
             <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tools</div>
             
             <button 
                onClick={() => { setHealthOpen(true); setMobileMenuOpen(false); }} 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition"
             >
                <IconActivity size={18} className="text-red-500" />
                {t.healthCheck}
             </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-dark-800 space-y-3 bg-slate-50/50 dark:bg-dark-900/50">
            <div className="flex items-center justify-between px-2 gap-2">
                <ThemeToggle />
                <LanguageToggle />
            </div>
            <div className="px-3 text-xs text-slate-500 truncate font-mono">
                {user?.email}
            </div>

            <button 
                onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }} 
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition"
            >
                <IconSettings size={18} /> {t.settings}
            </button>

            <button 
                onClick={() => { setAboutOpen(true); setMobileMenuOpen(false); }} 
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition"
            >
                <IconInfoCircle size={18} /> {t.about}
            </button>

            <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
            >
                <IconLogout size={18} /> {t.logout}
            </button>
        </div>
      </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-dark-800 hidden md:flex flex-col transition-colors duration-300">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
            ></div>
            {/* Sidebar Panel */}
            <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-dark-900 shadow-2xl animate-in slide-in-from-left duration-300">
                <SidebarContent />
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-dark-900/50 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300 z-10">
            <div className="flex items-center gap-3 flex-1">
                {/* Mobile Menu Button */}
                <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg"
                >
                    <IconMenu2 size={24} />
                </button>

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
                onClick={handleAddNewClick}
                className="ml-3 bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-primary-500/20 whitespace-nowrap"
            >
                <IconPlus size={18} /> <span className="hidden sm:inline">{t.addEntryBtn}</span>
            </button>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {isLoadingData ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => <SkeletonEntry key={i} />)}
                 </div>
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
                            onClick={handleAddNewClick}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
                    {filteredEntries.map(entry => (
                        <div key={entry.id} className="group relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary-500/30 transition-all duration-300 flex flex-col overflow-hidden">
                            
                            {/* 1. HEADER (Identity) */}
                            <div className="p-5 pb-0 flex items-start justify-between">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700 flex items-center justify-center shrink-0 p-2">
                                        {getFaviconUrl(entry.url) ? (
                                            <img src={getFaviconUrl(entry.url)!} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <IconWorld className="text-slate-400 dark:text-slate-500" size={24} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate leading-tight">{entry.service_name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{entry.username || '—'}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md border border-slate-200 dark:border-dark-700 shrink-0">
                                    {entry.category}
                                </span>
                            </div>

                            {/* 2. SECURE ZONE (Password) */}
                            <div className="p-5">
                                <div className="bg-slate-50 dark:bg-dark-950/50 border border-slate-200 dark:border-dark-800 rounded-xl p-1 pl-4 flex items-center justify-between group/pass transition-colors hover:border-primary-500/30 hover:bg-primary-50/5 dark:hover:bg-primary-900/10">
                                    <div className="font-mono text-lg tracking-wide text-slate-700 dark:text-slate-300 truncate mr-2 select-all">
                                        {revealedPasswords.has(entry.id) ? entry.password : '•••••••••••••'}
                                    </div>
                                    <div className="flex gap-1 pr-1">
                                        <button 
                                            onClick={() => copyToClipboard(entry.id, entry.password)}
                                            className={`p-2 rounded-lg border shadow-sm transition-all active:scale-95 ${copiedId === entry.id 
                                                ? 'bg-green-500 border-green-500 text-white' 
                                                : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-500 dark:text-slate-400 hover:bg-primary-600 hover:border-primary-600 hover:text-white'
                                            }`}
                                            title="Copy Password"
                                        >
                                            {copiedId === entry.id ? <IconShieldCheck size={18} /> : <IconCopy size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => toggleReveal(entry.id)}
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"
                                            title={revealedPasswords.has(entry.id) ? "Hide" : "Show"}
                                        >
                                            {revealedPasswords.has(entry.id) ? <IconEyeOff size={18}/> : <IconEye size={18}/>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 3. FOOTER ACTION BAR */}
                            <div className="mt-auto border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/30 px-4 py-3 flex items-center justify-between">
                                {/* Left: Launch / Meta */}
                                <div className="flex items-center gap-3">
                                    {entry.url && (
                                        <a 
                                            href={entry.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-500 hover:underline group/link"
                                        >
                                            <IconExternalLink size={14} className="group-hover/link:scale-110 transition-transform" /> 
                                            <span className="truncate max-w-[120px]">{formatUrl(entry.url)}</span>
                                        </a>
                                    )}
                                    {entry.notes && (
                                        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-600 cursor-help" title="Has encrypted notes">
                                            <IconNote size={14} />
                                        </div>
                                    )}
                                </div>

                                {/* Right: Manage Actions */}
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleEditClick(entry)} 
                                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded transition" 
                                        title={commonT.edit}
                                    >
                                        <IconPencil size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(entry.id)} 
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition" 
                                        title={commonT.delete}
                                    >
                                        <IconTrash size={16} />
                                    </button>
                                </div>
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
        entryToEdit={entryToEdit}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <HealthCheckModal
        isOpen={isHealthOpen}
        onClose={() => setHealthOpen(false)}
      />
      
      <CategoryModal
        isOpen={isCatModalOpen}
        onClose={() => setCatModalOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setAboutOpen(false)}
      />
    </div>
  );
};