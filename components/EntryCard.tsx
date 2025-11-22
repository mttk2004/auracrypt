import React, { useState } from 'react';
import { DecryptedEntry, CardData, IdentityData } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { 
    IconWorld, IconShieldCheck, IconCopy, IconEye, 
    IconEyeOff, IconExternalLink, IconNote, IconPencil, IconTrash, IconShare,
    IconCreditCard, IconId
} from '@tabler/icons-react';

interface Props {
    entry: DecryptedEntry;
    onEdit: (entry: DecryptedEntry) => void;
    onDelete: (id: string) => void;
    onShare: (entry: DecryptedEntry) => void;
}

export const EntryCard = React.memo(({ entry, onEdit, onDelete, onShare }: Props) => {
    const { language, addToast } = useStore();
    const commonT = translations[language].common;
    const modalT = translations[language].modal;

    const [isRevealed, setIsRevealed] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Helper to parse payload based on type
    const getDisplayPayload = () => {
        if (entry.type === 'card') {
            try {
                return JSON.parse(entry.password) as CardData;
            } catch { return null; }
        }
        if (entry.type === 'identity') {
            try {
                return JSON.parse(entry.password) as IdentityData;
            } catch { return null; }
        }
        return null;
    };

    const payload = getDisplayPayload();

    const copyToClipboard = () => {
        let textToCopy = entry.password;
        
        if (entry.type === 'card' && payload) {
            textToCopy = (payload as CardData).number;
        } else if (entry.type === 'identity' && payload) {
            textToCopy = (payload as IdentityData).license || (payload as IdentityData).passport || '';
        }

        navigator.clipboard.writeText(textToCopy);
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

    // Determine Strength Color (Simple heuristic)
    const getStrengthColor = () => {
        if (entry.type !== 'login') return 'bg-slate-300 dark:bg-slate-600'; // Neutral for non-passwords
        const len = entry.password.length;
        if (len === 0) return 'bg-slate-300';
        if (len < 8) return 'bg-red-500 shadow-red-500/50';
        if (len < 12) return 'bg-amber-500 shadow-amber-500/50';
        return 'bg-green-500 shadow-green-500/50';
    };

    // --- Render Content based on Type ---
    const renderContent = () => {
        if (entry.type === 'card' && payload) {
             const card = payload as CardData;
             return (
                 <div className="flex flex-col gap-1">
                     <div className="font-mono text-lg tracking-wider text-slate-700 dark:text-slate-300 select-all">
                        {isRevealed ? card.number : `**** **** **** ${card.number.slice(-4)}`}
                     </div>
                     {isRevealed && (
                         <div className="flex gap-4 text-xs text-slate-500 font-mono mt-1">
                             <span>EXP: {card.expiry}</span>
                             <span>CVV: {card.cvv}</span>
                             {card.pin && <span>PIN: {card.pin}</span>}
                         </div>
                     )}
                 </div>
             );
        } 
        
        if (entry.type === 'identity' && payload) {
            const id = payload as IdentityData;
            return (
                <div className="flex flex-col gap-1 text-sm">
                     <div className="font-bold text-slate-700 dark:text-slate-300">{id.fullName}</div>
                     {id.license && (
                         <div className="flex justify-between text-slate-500">
                             <span>License:</span>
                             <span className="font-mono">{isRevealed ? id.license : '••••••••'}</span>
                         </div>
                     )}
                     {id.passport && (
                         <div className="flex justify-between text-slate-500">
                             <span>Passport:</span>
                             <span className="font-mono">{isRevealed ? id.passport : '••••••••'}</span>
                         </div>
                     )}
                </div>
            );
        }

        // Default Login
        return (
            <div className="font-mono text-lg tracking-wide text-slate-700 dark:text-slate-300 truncate mr-2 select-all">
                {isRevealed ? entry.password : '•••••••••••••'}
            </div>
        );
    };

    return (
        <div className="group relative bg-white/70 dark:bg-dark-900/70 backdrop-blur-md border border-slate-200 dark:border-dark-800 rounded-2xl shadow-sm hover:shadow-xl hover:border-primary-500/30 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
            
            {/* 1. HEADER (Identity) */}
            <div className="p-5 pb-0 flex items-start justify-between">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-800 border border-slate-100 dark:border-dark-700 flex items-center justify-center shrink-0 p-2 shadow-sm">
                        {entry.type === 'card' ? (
                             <IconCreditCard className="text-slate-400 dark:text-slate-500" size={24} />
                        ) : entry.type === 'identity' ? (
                             <IconId className="text-slate-400 dark:text-slate-500" size={24} />
                        ) : getFaviconUrl(entry.url) ? (
                            <img src={getFaviconUrl(entry.url)!} alt="" className="w-full h-full object-contain" />
                        ) : (
                            <IconWorld className="text-slate-400 dark:text-slate-500" size={24} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate leading-tight">{entry.service_name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{entry.username || '—'}</p>
                            {entry.type === 'login' && (
                                <div className={`w-2 h-2 rounded-full shadow-sm ${getStrengthColor()}`} title="Password Strength Indicator" />
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                     <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md border border-slate-200 dark:border-dark-700 shrink-0">
                        {entry.category}
                    </span>
                </div>
            </div>

            {/* 2. SECURE ZONE (Password / Data) */}
            <div className="p-5">
                <div className="bg-slate-50/80 dark:bg-dark-950/50 border border-slate-200 dark:border-dark-800 rounded-xl p-3 pl-4 flex items-center justify-between group/pass transition-colors hover:border-primary-500/30 hover:bg-primary-50/10 dark:hover:bg-primary-900/10">
                    <div className="flex-1 min-w-0">
                        {renderContent()}
                    </div>
                    <div className="flex gap-1 pl-2 shrink-0">
                        <button 
                            onClick={copyToClipboard}
                            className={`p-2 rounded-lg border shadow-sm transition-all active:scale-95 ${isCopied 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-500 dark:text-slate-400 hover:bg-primary-600 hover:border-primary-600 hover:text-white'
                            }`}
                            title="Copy"
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
            <div className="mt-auto border-t border-slate-100 dark:border-dark-800 bg-slate-50/30 dark:bg-dark-900/30 px-4 py-3 flex items-center justify-between">
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                        onClick={() => onShare(entry)} 
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition" 
                        title="Secure Share"
                    >
                        <IconShare size={16} />
                    </button>
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
                 {/* Keep one visible if not hovering for mobile mostly, but css handles hover primarily */}
                 <div className="flex md:hidden items-center gap-1">
                    <button onClick={() => onEdit(entry)} className="p-1.5 text-slate-500"><IconPencil size={16} /></button>
                 </div>
            </div>
        </div>
    );
});