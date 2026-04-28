
import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { DecryptedEntry } from '../types';
import { useVaultData } from '../hooks/useVaultData';

import { SkeletonEntry } from './SkeletonEntry';
import { Sidebar } from './Sidebar';
import { EntryCard } from './EntryCard';

import { translations } from '../i18n/locales';
import { 
    IconSearch, IconPlus, IconFolder, IconShieldExclamation, IconMenu2,
    IconLock, IconAlertTriangle, IconCategory
} from '@tabler/icons-react';

// Lazy Load Modals to reduce initial bundle size
const EntryModal = lazy(() => import('./EntryModal').then(m => ({ default: m.EntryModal })));
const SettingsModal = lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const HealthCheckModal = lazy(() => import('./HealthCheckModal').then(m => ({ default: m.HealthCheckModal })));
const CategoryModal = lazy(() => import('./CategoryModal').then(m => ({ default: m.CategoryModal })));
const AboutModal = lazy(() => import('./AboutModal').then(m => ({ default: m.AboutModal })));
const ShareModal = lazy(() => import('./ShareModal').then(m => ({ default: m.ShareModal })));

const StatCard = ({ label, value, icon: Icon, colorClass, onClick }: any) => (
    <button 
        onClick={onClick}
        type={onClick ? "button" : undefined}
        disabled={!onClick}
        className={`w-full text-left bg-white/60 dark:bg-dark-900/60 backdrop-blur-md border border-slate-200 dark:border-dark-800 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-transform group ${onClick ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
    >
        <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h4>
        </div>
    </button>
);

export const Dashboard = () => {
  const { user, lockVault, language, fetchCategories, addToast, categories } = useStore();
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

  // Calculate Stats
  const stats = useMemo(() => {
      const total = entries.length;
      // Simple heuristic for dashboard: length < 8 or no numbers is considered "attention needed"
      const weak = entries.filter(e => e.type === 'login' && (e.password.length < 8 || !/\d/.test(e.password))).length;
      return { total, weak };
  }, [entries]);

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
    <div className="flex h-screen bg-transparent text-slate-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex flex-col z-20 bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-dark-800">
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
            <div className="absolute inset-y-0 left-0 w-72 z-50 animate-in slide-in-from-left duration-300 shadow-2xl bg-white dark:bg-dark-900">
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
        <header className="h-20 flex items-center justify-between px-4 sm:px-8 transition-colors duration-300 z-10 pt-4">
            <div className="flex items-center gap-3 flex-1">
                <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-white/50 dark:hover:bg-dark-800 rounded-lg"
                    aria-label="Open menu"
                    title="Open menu"
                >
                    <IconMenu2 size={24} />
                </button>

                <div className="relative w-full max-w-md">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        aria-label={t.searchPlaceholder}
                        className="w-full bg-white/60 dark:bg-dark-900/60 backdrop-blur-md border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-500 dark:placeholder:text-slate-600 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                            aria-label="Clear search"
                            title="Clear search"
                        >
                            <IconX size={16} />
                        </button>
                    )}
                </div>
            </div>
            <button 
                onClick={handleAddNewClick}
                aria-label={t.addEntryBtn}
                title={t.addEntryBtn}
                className="ml-3 bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white px-4 sm:px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-0.5 whitespace-nowrap"
            >
                <IconPlus size={20} /> <span className="hidden sm:inline">{t.addEntryBtn}</span>
            </button>
        </header>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            
            {/* Stats Overview */}
            {!isLoadingData && entries.length > 0 && !searchTerm && selectedCategory === 'All' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <StatCard 
                        label={t.statsTotal} 
                        value={stats.total} 
                        icon={IconLock} 
                        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    />
                    <StatCard 
                        label={t.statsWeak} 
                        value={stats.weak > 0 ? stats.weak : t.secure} 
                        icon={IconAlertTriangle} 
                        colorClass={stats.weak > 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" : "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"}
                        onClick={() => setActiveModal('health')}
                    />
                     <StatCard 
                        label={t.statsCats} 
                        value={categories.length} 
                        icon={IconCategory} 
                        colorClass="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                        onClick={() => setActiveModal('category')}
                    />
                </div>
            )}

            {isLoadingData ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => <SkeletonEntry key={i} />)}
                 </div>
            ) : entries.length === 0 && !searchTerm && selectedCategory === 'All' ? (
                <div className="flex flex-col items-center justify-center h-full pb-20">
                    <div className="max-w-2xl w-full bg-white/60 dark:bg-dark-900/60 backdrop-blur-md border border-slate-200 dark:border-dark-800 rounded-3xl p-10 text-center animate-in fade-in zoom-in duration-500 shadow-2xl">
                        <div className="inline-flex p-5 rounded-full bg-amber-100 dark:bg-amber-500/10 mb-6 shadow-inner">
                            <IconShieldExclamation size={64} className="text-amber-600 dark:text-amber-500" />
                        </div>
                        
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">{t.emptyTitle}</h2>
                        
                        <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg leading-relaxed max-w-lg mx-auto">
                            {renderEmptyDesc()}
                        </p>
                        
                        <div className="bg-slate-50/80 dark:bg-dark-950/50 p-5 rounded-xl border border-slate-200 dark:border-dark-800 mb-8 text-sm text-slate-600 dark:text-slate-500 max-w-lg mx-auto">
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
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <IconFolder size={48} className="mb-4 opacity-20" />
                    <p>{t.noResults}</p>
                </div>
            ) : (
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

      {/* Lazy Loaded Modals Wrapped in Suspense */}
      <Suspense fallback={null}>
        {isModalOpen && (
            <EntryModal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)} 
                onSave={(data) => handleSaveEntry(data, entryToEdit)}
                entryToEdit={entryToEdit}
            />
        )}

        {activeModal === 'share' && (
            <ShareModal
                isOpen={activeModal === 'share'}
                onClose={() => setActiveModal(null)}
                entry={entryToShare}
            />
        )}

        {activeModal === 'settings' && (
            <SettingsModal 
                isOpen={activeModal === 'settings'}
                onClose={() => setActiveModal(null)}
            />
        )}

        {activeModal === 'health' && (
            <HealthCheckModal
                isOpen={activeModal === 'health'}
                onClose={() => setActiveModal(null)}
            />
        )}
        
        {activeModal === 'category' && (
            <CategoryModal
                isOpen={activeModal === 'category'}
                onClose={() => setActiveModal(null)}
            />
        )}

        {activeModal === 'about' && (
            <AboutModal
                isOpen={activeModal === 'about'}
                onClose={() => setActiveModal(null)}
            />
        )}
      </Suspense>
    </div>
  );
};
