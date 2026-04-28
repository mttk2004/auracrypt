
import React from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import {
    IconX, IconShieldCheck, IconBrandReact, IconDatabase,
    IconLock, IconBrandGithub, IconMail, IconInfoCircle
} from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language } = useStore();
  const t = translations[language].about;

  if (!isOpen) return null;

  const TechBadge = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-dark-800 rounded-full border border-slate-200 dark:border-dark-700 text-xs font-medium text-slate-600 dark:text-slate-300">
        <Icon size={14} />
        {label}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-dark-800">
           <div className="flex items-center gap-2 text-primary-600 dark:text-primary-500">
                <IconInfoCircle size={24} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.title}</h3>
           </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-800 transition text-slate-400">
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

            {/* Hero */}
            <div className="text-center">
                <div className="inline-flex p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl mb-4 text-primary-600 dark:text-primary-500">
                    <IconShieldCheck size={48} />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">AuraCrypt Web</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {t.desc}
                </p>
            </div>

            {/* Zero-Knowledge */}
            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 -mr-10 -mt-10">
                    <IconLock size={150} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <IconLock className="text-green-400" size={20} />
                    {t.zkTitle}
                </h4>
                <p className="text-sm opacity-90 leading-relaxed relative z-10">
                    {t.zkDesc}
                </p>
            </div>

            {/* Tech Stack */}
            <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-dark-800 pb-2">
                    {t.techStack}
                </h4>
                <div className="flex flex-wrap gap-3">
                    <TechBadge icon={IconBrandReact} label="React 19" />
                    <TechBadge icon={IconBrandReact} label="Vite v8" />
                    <TechBadge icon={IconDatabase} label="Supabase" />
                    <TechBadge icon={IconLock} label="Web Crypto API (AES-GCM)" />
                    <TechBadge icon={IconShieldCheck} label="PBKDF2 Key Derivation" />
                    <TechBadge icon={IconBrandReact} label="Tailwind CSS v4" />
                    <TechBadge icon={IconBrandReact} label="Zustand State" />
                </div>
            </div>

            {/* Author */}
            <div className="bg-slate-50 dark:bg-dark-950 rounded-xl p-6 border border-slate-200 dark:border-dark-800">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.authorTitle}</h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <a
                        href="mailto:mttk2004@hotmail.com"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition text-slate-700 dark:text-slate-300 font-medium group"
                    >
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                             <IconMail size={18} />
                        </div>
                        <div className="text-left">
                            <div className="text-xs text-slate-400 uppercase">Email</div>
                            <div className="text-sm group-hover:text-primary-600 transition">mttk2004@hotmail.com</div>
                        </div>
                    </a>

                    <a
                        href="https://github.com/mttk2004"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition text-slate-700 dark:text-slate-300 font-medium group"
                    >
                        <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white rounded-full">
                             <IconBrandGithub size={18} />
                        </div>
                        <div className="text-left">
                             <div className="text-xs text-slate-400 uppercase">Github</div>
                             <div className="text-sm group-hover:text-slate-900 dark:group-hover:text-white transition">@mttk2004</div>
                        </div>
                    </a>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
