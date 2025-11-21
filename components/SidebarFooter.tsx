import React from 'react';
import { User } from '@supabase/supabase-js';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { translations, Language } from '../i18n/locales';
import { IconSettings, IconInfoCircle, IconLogout } from '@tabler/icons-react';

interface Props {
    user: User | null;
    language: Language;
    onOpenModal: (type: 'settings' | 'about') => void;
    onLogout: () => void;
}

export const SidebarFooter: React.FC<Props> = ({ user, language, onOpenModal, onLogout }) => {
    const t = translations[language].dashboard;

    return (
        <div className="p-4 border-t border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex flex-col min-w-0 mr-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">ACCOUNT</span>
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
                    onClick={() => onOpenModal('settings')} 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition border border-transparent hover:border-slate-200 dark:hover:border-dark-700 hover:shadow-sm"
                >
                    <IconSettings size={16} /> {t.settings}
                </button>

                <button 
                    onClick={() => onOpenModal('about')} 
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
    );
};