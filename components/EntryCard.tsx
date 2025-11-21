
import React, { useState } from 'react';
import { DecryptedEntry } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { 
    IconWorld, IconShieldCheck, IconCopy, IconEye, 
    IconEyeOff, IconExternalLink, IconNote, IconPencil, IconTrash 
} from '@tabler/icons-react';

interface Props {
    entry: DecryptedEntry;
    onEdit: (entry: DecryptedEntry) => void;
    onDelete: (id: string) => void;
}

export const EntryCard: React.FC<Props> = ({ entry, onEdit, onDelete }) => {
    const { language, addToast } = useStore();
    const commonT = translations[language].common;
    const modalT = translations[language].modal;

    const [isRevealed, setIsRevealed] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(entry.password);
        setIsCopied(true);
        addToast('success', modalT.copied);
        setTimeout(() => setIsCopied(false), 2000);
    };

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
    };

    return (
        <div className="group relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary-500/30 transition-all duration-300 flex flex-col overflow-hidden">
            
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
                        {isRevealed ? entry.password : '•••••••••••••'}
                    </div>
                    <div className="flex gap-1 pr-1">
                        <button 
                            onClick={copyToClipboard}
                            className={`p-2 rounded-lg border shadow-sm transition-all active:scale-95 ${isCopied 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-500 dark:text-slate-400 hover:bg-primary-600 hover:border-primary-600 hover:text-white'
                            }`}
                            title="Copy Password"
                        >
                            {isCopied ? <IconShieldCheck size={18} /> : <IconCopy size={18} />}
                        </button>
                        <button 
                            onClick={() => setIsRevealed(!isRevealed)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"
                            title={isRevealed ? "Hide" : "Show"}
                        >
                            {isRevealed ? <IconEyeOff size={18}/> : <IconEye size={18}/>}
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
                        onClick={() => onEdit(entry)} 
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded transition" 
                        title={commonT.edit}
                    >
                        <IconPencil size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(entry.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition" 
                        title={commonT.delete}
                    >
                        <IconTrash size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
