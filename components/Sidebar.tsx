
import React from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { 
    IconShieldCheck, IconX, IconCategory, IconFolder, 
    IconActivity, IconSettings, IconInfoCircle, IconLogout 
} from '@tabler/icons-react';

interface Props {
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    onCloseMobile: () => void;
    onOpenModal: (type: 'settings' | 'health' | 'category' | 'about') => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<Props> = ({ 
    selectedCategory, 
    onSelectCategory, 
    onCloseMobile,
    onOpenModal,
    onLogout
}) => {
    const { user, categories, language } = useStore();
    const t = translations[language].dashboard;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-dark-800 transition-colors duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-600 rounded-lg">
                        <IconShieldCheck size={24} className="text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">AuraCrypt</span>
                </div>
                <button 
                    onClick={onCloseMobile}
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg"
                >
                    <IconX size={24} />
                </button>
            </div>
            
            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                    {t.categories}
                    <button 
                        onClick={() => { onOpenModal('category'); onCloseMobile(); }} 
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1 rounded transition"
                        title={t.manageCats}
                    >
                        <IconCategory size={14} />
                    </button>
                </div>
                
                <button
                    onClick={() => { onSelectCategory('All'); onCloseMobile(); }}
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
                        onClick={() => { onSelectCategory(cat.name); onCloseMobile(); }}
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
                    onClick={() => { onOpenModal('health'); onCloseMobile(); }} 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition"
                >
                    <IconActivity size={18} className="text-red-500" />
                    {t.healthCheck}
                </button>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex flex-col min-w-0 mr-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Account</span>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate font-mono" title={user?.email}>
                            {user?.email}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 scale-90 origin-right">
                        <ThemeToggle />
                        <LanguageToggle />
                    </div>
                </div>

                <div className="space-y-1">
                    <button 
                        onClick={() => { onOpenModal('settings'); onCloseMobile(); }} 
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition border border-transparent hover:border-slate-200 dark:hover:border-dark-700 hover:shadow-sm"
                    >
                        <IconSettings size={16} /> {t.settings}
                    </button>

                    <button 
                        onClick={() => { onOpenModal('about'); onCloseMobile(); }} 
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition border border-transparent hover:border-slate-200 dark:hover:border-dark-700 hover:shadow-sm"
                    >
                        <IconInfoCircle size={16} /> {t.about}
                    </button>

                    <button 
                        onClick={onLogout} 
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition group"
                    >
                        <IconLogout size={16} className="group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" /> {t.logout}
                    </button>
                </div>
            </div>
        </div>
    );
};
