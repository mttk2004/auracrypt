
import { useState } from 'react';
import { getSharedEntry } from '../services/shareService';
import { SharedDataPayload } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { 
    IconShieldCheck, IconLoader2, IconLockOpen, 
    IconEyeOff, IconCopy, IconCheck, IconAlertOctagon 
} from '@tabler/icons-react';

export const ShareView = () => {
    const { language } = useStore();
    const t = translations[language].share;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SharedDataPayload | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleReveal = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Parse URL from Hash
            // Expected format: #share?id=...&key=...
            const hash = window.location.hash;
            if (!hash.startsWith('#share')) {
                throw new Error("Invalid Link Format");
            }

            // Extract query string part from hash (remove #share)
            // #share?id=... -> ?id=...
            const queryString = hash.replace('#share', '');
            const urlParams = new URLSearchParams(queryString);
            
            const id = urlParams.get('id');
            const keyB64 = urlParams.get('key');

            if (!id || !keyB64) {
                throw new Error("Invalid Link Parameters");
            }

            // Service Call
            const result = await getSharedEntry(id, keyB64);
            setData(result);
            setRevealed(true);

        } catch (e: any) {
            console.error(e);
            setError(e.message === "Link burned" ? t.viewBurned : t.viewExpired);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col items-center justify-center p-4 text-slate-900 dark:text-white transition-colors duration-300">
            <div className="absolute top-6 right-6 flex items-center gap-3">
                <ThemeToggle />
                <LanguageToggle />
            </div>

            <div className="w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="bg-primary-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm text-white">
                        <IconShieldCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">AuraCrypt Share</h1>
                    <p className="text-primary-100 mt-2 text-sm">{t.viewDesc}</p>
                </div>

                <div className="p-8">
                    {error ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500">
                                <IconAlertOctagon size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.viewExpired}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">{error}</p>
                        </div>
                    ) : !revealed ? (
                        <div className="text-center py-6">
                            <IconLockOpen size={48} className="mx-auto mb-6 text-slate-300 dark:text-slate-600" />
                            <button 
                                onClick={handleReveal}
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg rounded-xl hover:scale-[1.02] transition-transform shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:transform-none"
                            >
                                {loading ? <IconLoader2 className="animate-spin" /> : <IconShieldCheck />}
                                {loading ? t.viewLoading : t.viewOpen}
                            </button>
                            <p className="text-xs text-slate-400 mt-4">
                                By clicking, you will decrypt the data locally. <br/> If this is a "burn-on-read" link, it will be destroyed immediately.
                            </p>
                        </div>
                    ) : data && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold">{data.service_name}</h2>
                                {data.username && <p className="text-slate-500">{data.username}</p>}
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Password</label>
                                    <div className="bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl p-4 font-mono text-lg break-all pr-12 relative">
                                        {data.password}
                                        <button 
                                            onClick={() => copyToClipboard(data.password)}
                                            className="absolute top-1/2 -translate-y-1/2 right-3 p-2 text-slate-400 hover:text-primary-600 transition"
                                        >
                                            {copied ? <IconCheck size={20} className="text-green-500" /> : <IconCopy size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {data.url && (
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">URL</label>
                                        <a href={data.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline break-all">
                                            {data.url}
                                        </a>
                                    </div>
                                )}

                                {data.notes && (
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Notes</label>
                                        <div className="bg-slate-50 dark:bg-dark-950/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap border border-slate-100 dark:border-dark-800">
                                            {data.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-dark-800 text-center">
                                <p className="text-xs text-red-500 flex items-center justify-center gap-1 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                                    <IconEyeOff size={14} /> Security Warning: Don't refresh. The link might be gone.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
