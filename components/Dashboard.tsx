
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { DecryptedEntry } from '../types';
import { useVaultData } from '../hooks/useVaultData';

// Components
import { EntryModal } from './EntryModal';
import { SettingsModal } from './SettingsModal';
import { HealthCheckModal } from './HealthCheckModal';
import { CategoryModal } from './CategoryModal';
import { AboutModal } from './AboutModal';
import { ShareModal } from './ShareModal';
import { SkeletonEntry } from './SkeletonEntry';
import { Sidebar } from './Sidebar';
import { EntryCard } from './EntryCard';

import { translations } from '../i18n/locales';
import { 
    IconSearch, IconPlus, IconFolder, IconShieldExclamation, IconMenu2 
} from '@tabler/icons-react';

export const Dashboard = () => {
  const { user, lockVault, language, fetchCategories, addToast } = useStore();
  const t = translations[language].dashboard;
  const commonT = translations[language].common;

  // Data Hook
  const { 
      entries, isLoadingData, searchTerm, setSearchTerm, 
      selectedCategory, setSelectedCategory, handleSaveEntry, handleDeleteEntry 
  } = useVaultData();
  
  // Modals State
  const [isModalOpen, setModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<DecryptedEntry | null>(null);
  const [activeModal, setActiveModal] = useState<'settings' | 'health' | 'category' | 'about' | 'share' | null>(null);
  const [entryToShare, setEntryToShare] = useState<DecryptedEntry | null>(null);

  // UI State
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fetch Categories on mount
  useEffect(() => {
      if (user) fetchCategories();
  }, [user, fetchCategories]);

  const handleAddNewClick = () => {
      setEntryToEdit(null);
      setModalOpen(true);
      setMobileMenuOpen(false);
  };

  const handleEditClick = (entry: DecryptedEntry) => {
      setEntryToEdit(entry);
      setModalOpen(true);
  };

  const handleShareClick = (entry: DecryptedEntry) => {
      setEntryToShare(entry);
      setActiveModal('share');
  };

  const handleDeleteWrapper = async (id: string) => {
      if(!confirm(commonT.confirm)) return;
      try {
          await handleDeleteEntry(id);
          addToast('success', "Entry deleted successfully");
      } catch (e) {
          addToast('error', "Failed to delete entry");
      }
  }

  const handleLogout = async () => {
      lockVault();
      await supabase.auth.signOut();
      sessionStorage.clear();
      window.location.reload();
  }

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
      
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col z-20">
        <Sidebar 
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onCloseMobile={() => setMobileMenuOpen(false)}
            onOpenModal={setActiveModal}
            onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
            ></div>
            <div className="absolute inset-y-0 left-0 w-72 z-50 animate-in slide-in-from-left duration-300 shadow-2xl">
                <Sidebar 
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    onCloseMobile={() => setMobileMenuOpen(false)}
                    onOpenModal={setActiveModal}
                    onLogout={handleLogout}
                />
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-dark-900/50 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300 z-10">
            <div className="flex items-center gap-3 flex-1">
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

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {isLoadingData ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => <SkeletonEntry key={i} />)}
                 </div>
            ) : entries.length === 0 && !searchTerm && selectedCategory === 'All' ? (
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
            ) : entries.length === 0 ? (
                // NO SEARCH RESULTS STATE
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <IconFolder size={48} className="mb-4 opacity-20" />
                    <p>{t.noResults}</p>
                </div>
            ) : (
                // LIST STATE
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
                    {entries.map(entry => (
                        <EntryCard 
                            key={entry.id} 
                            entry={entry} 
                            onEdit={handleEditClick}
                            onDelete={handleDeleteWrapper}
                            onShare={handleShareClick}
                        />
                    ))}
                </div>
            )}
        </div>
      </main>

      <EntryModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={(data) => handleSaveEntry(data, entryToEdit)}
        entryToEdit={entryToEdit}
      />

      <ShareModal
        isOpen={activeModal === 'share'}
        onClose={() => setActiveModal(null)}
        entry={entryToShare}
      />

      <SettingsModal 
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
      />

      <HealthCheckModal
        isOpen={activeModal === 'health'}
        onClose={() => setActiveModal(null)}
      />
      
      <CategoryModal
        isOpen={activeModal === 'category'}
        onClose={() => setActiveModal(null)}
      />

      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};
