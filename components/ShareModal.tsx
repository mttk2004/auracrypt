
import React, { useState } from 'react';
import { DecryptedEntry, ShareConfig } from '../types';
import { createShareLink } from '../services/shareService';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { 
    IconX, IconShare, IconClock, IconEye, IconLink, IconCheck, IconCopy, IconLoader2, IconShieldLock 
} from '@tabler/icons-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    entry: DecryptedEntry | null;
}

export const ShareModal: React.FC<Props> = ({ isOpen, onClose, entry }) => {
    const { language, addToast } = useStore();
    const t = translations[language].share;
    const commonT = translations[language].common;

    const [config, setConfig] = useState<ShareConfig>({ views: 1, hours: 1 });
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen || !entry) return null;

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const url = await createShareLink(entry, config);
            setGeneratedUrl(url);
        } catch (e) {
            console.error(e);
            addToast('error', "Failed to generate link");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedUrl) {
            navigator.clipboard.writeText(generatedUrl);
            setIsCopied(true);
            addToast('success', t.copied);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const reset = () => {
        setGeneratedUrl(null);
        setConfig({ views: 1, hours: 1 });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <IconShare size={24} />
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.title}</h3>
                             <p className="text-xs text-slate-500 dark:text-slate-400">{entry.service_name}</p>
                        </div>
                    </div>
                    <button onClick={reset} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                        <IconX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {!generatedUrl ? (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {t.desc}
                            </p>

                            <div className="bg-slate-50 dark:bg-dark-800 p-4 rounded-xl border border-slate-200 dark:border-dark-700 space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 mb-2">
                                        <IconEye size={14} /> {t.views}
                                    </label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setConfig({...config, views: 1})}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition ${config.views === 1 ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400' : 'bg-white dark:bg-dark-950 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'}`}
                                        >
                                            1 ({t.burn})
                                        </button>
                                        <button 
                                            onClick={() => setConfig({...config, views: 5})}
                                            className={`w-16 py-2 px-3 rounded-lg text-sm font-medium border transition ${config.views === 5 ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400' : 'bg-white dark:bg-dark-950 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'}`}
                                        >
                                            5
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 mb-2">
                                        <IconClock size={14} /> {t.expiration}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[1, 24, 168].map(h => (
                                            <button 
                                                key={h}
                                                onClick={() => setConfig({...config, hours: h})}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${config.hours === h ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400' : 'bg-white dark:bg-dark-950 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                {h === 1 ? t.hour1 : h === 24 ? t.hour24 : t.day7}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                {isLoading ? <IconLoader2 className="animate-spin" /> : <IconLink />}
                                {isLoading ? t.generating : "Create Magic Link"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="text-center">
                                <div className="inline-flex p-3 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 rounded-full mb-3">
                                    <IconCheck size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.ready}</h3>
                            </div>

                            <div className="bg-slate-100 dark:bg-dark-800 p-4 rounded-xl break-all font-mono text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-700 max-h-32 overflow-y-auto">
                                {generatedUrl}
                            </div>

                            <button
                                onClick={handleCopy}
                                className={`w-full py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition ${
                                    isCopied 
                                    ? 'bg-green-600 text-white shadow-green-500/20' 
                                    : 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200'
                                }`}
                            >
                                {isCopied ? <IconCheck /> : <IconCopy />}
                                {isCopied ? t.copied : t.copy}
                            </button>

                            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                <IconShieldLock size={16} className="shrink-0 mt-0.5" />
                                <p>{t.warning}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
