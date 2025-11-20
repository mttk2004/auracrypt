
import React, { useState, useEffect } from 'react';
import { CreateEntryPayload, CATEGORIES, DecryptedEntry } from '../types';
import { 
    IconX, IconDeviceFloppy, IconWand, IconRefresh, 
    IconCheck, IconUser, IconLock, IconWorld, 
    IconCategory, IconNote, IconLink, IconEye, IconEyeOff
} from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEntryPayload) => Promise<void>;
  entryToEdit?: DecryptedEntry | null;
}

export const EntryModal: React.FC<Props> = ({ isOpen, onClose, onSave, entryToEdit }) => {
  const { language, addToast } = useStore();
  const t = translations[language].modal;
  const commonT = translations[language].common;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateEntryPayload>({
    service_name: '',
    username: '',
    url: '',
    password: '',
    category: 'Other',
    notes: ''
  });

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  
  // Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [includeNum, setIncludeNum] = useState(true);
  const [includeSym, setIncludeSym] = useState(true);
  const [generatedPass, setGeneratedPass] = useState('');

  // Reset or Populate state when opening
  useEffect(() => {
    if (isOpen) {
        if (entryToEdit) {
            // Edit Mode: Pre-fill data
            setFormData({
                service_name: entryToEdit.service_name,
                username: entryToEdit.username || '',
                url: entryToEdit.url || '',
                password: entryToEdit.password,
                category: entryToEdit.category,
                notes: entryToEdit.notes || ''
            });
        } else {
            // Create Mode: Reset
            setFormData({
                service_name: '',
                username: '',
                url: '',
                password: '',
                category: 'Other',
                notes: ''
            });
        }
        setShowGenerator(false);
        setShowPassword(false);
    }
  }, [isOpen, entryToEdit]);

  // Password Generator Logic
  useEffect(() => {
      if (showGenerator) {
          generatePassword();
      }
  }, [genLength, includeNum, includeSym, showGenerator]);

  const generatePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nums = '0123456789';
      const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      let charset = chars;
      if (includeNum) charset += nums;
      if (includeSym) charset += syms;

      let pass = '';
      // Ensure at least one of each selected type exists
      const required = [];
      if (includeNum) required.push(nums[Math.floor(Math.random() * nums.length)]);
      if (includeSym) required.push(syms[Math.floor(Math.random() * syms.length)]);

      // Fill the rest
      for (let i = 0; i < genLength - required.length; i++) {
          pass += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      // Add required chars and shuffle
      pass += required.join('');
      pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
      
      setGeneratedPass(pass);
  };

  const useGeneratedPassword = () => {
      setFormData({ ...formData, password: generatedPass });
      setShowGenerator(false);
      setShowPassword(true); // Show password when generated
  };

  // Auto-fix URL
  const handleUrlBlur = () => {
      let url = formData.url.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
          setFormData({ ...formData, url });
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      addToast('success', "Entry saved successfully");
      onClose();
    } catch (error) {
      console.error(error);
      addToast('error', "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 backdrop-blur-sm">
          <div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {entryToEdit ? commonT.edit : t.title}
             </h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {entryToEdit ? "Update your encrypted credentials" : "Add credentials to your secure vault"}
             </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="entry-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Row 1: Service & Category */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Service Name (8 cols) */}
                <div className="md:col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.serviceLabel}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconWorld className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                        </div>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm"
                            value={formData.service_name}
                            onChange={e => setFormData({...formData, service_name: e.target.value})}
                            placeholder="e.g. Netflix, Google, Binance"
                            autoFocus
                        />
                    </div>
                </div>
                
                {/* Category (4 cols) */}
                <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.categoryLabel}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconCategory className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                        </div>
                        <select
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-8 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm appearance-none truncate"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            {CATEGORIES.filter(c => c !== 'All').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Username & URL */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.usernameLabel}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconUser className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                        </div>
                        <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm"
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            placeholder="username@example.com"
                        />
                    </div>
                </div>

                <div className="md:col-span-6 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.urlLabel}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconLink className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                        </div>
                        <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm"
                            value={formData.url || ''}
                            onChange={e => setFormData({...formData, url: e.target.value})}
                            onBlur={handleUrlBlur}
                            placeholder="google.com"
                        />
                    </div>
                </div>
            </div>


            {/* Row 3: Password & Generator */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.passwordLabel}</label>
                    <button 
                        type="button"
                        onClick={() => setShowGenerator(!showGenerator)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition ${showGenerator ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-primary-600 hover:bg-primary-50 dark:hover:bg-dark-800'}`}
                    >
                        <IconWand size={14} />
                        {showGenerator ? 'Hide Generator' : t.genBtn}
                    </button>
                </div>

                <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconLock className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        className={`w-full bg-slate-50 dark:bg-dark-950 border rounded-xl py-3 pl-10 pr-12 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm ${showGenerator ? 'border-primary-500 dark:border-primary-500' : 'border-slate-200 dark:border-dark-700'}`}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        tabIndex={-1}
                    >
                        {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                </div>

                {/* Password Generator Panel */}
                {showGenerator && (
                    <div className="mt-3 p-4 bg-slate-50 dark:bg-dark-800/50 border border-slate-200 dark:border-dark-700 rounded-xl animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-lg p-3 relative">
                                    <span className="font-mono text-lg break-all text-slate-800 dark:text-slate-200 flex-1">{generatedPass}</span>
                                    <div className="flex items-center gap-1 pl-2 border-l border-slate-100 dark:border-dark-800">
                                        <button 
                                            type="button"
                                            onClick={generatePassword}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-dark-800 rounded text-slate-500 dark:text-slate-400 hover:text-primary-500 transition"
                                            title="Regenerate"
                                        >
                                            <IconRefresh size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 dark:bg-dark-700 rounded-full mt-2 overflow-hidden">
                                    <div 
                                        className="h-full transition-all duration-300 rounded-full"
                                        style={{
                                            width: `${Math.min(100, (genLength / 32) * 100)}%`,
                                            backgroundColor: genLength < 10 ? '#ef4444' : genLength < 16 ? '#eab308' : '#22c55e'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-center gap-3 min-w-[140px]">
                                <button 
                                    type="button"
                                    onClick={useGeneratedPassword}
                                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-primary-500/20"
                                >
                                    <IconCheck size={16} /> {t.usePassBtn}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-3 min-w-[120px]">
                                <span className="font-medium text-xs uppercase tracking-wide">{t.length}: <span className="text-primary-600 dark:text-primary-400 font-bold">{genLength}</span></span>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="32" 
                                    value={genLength} 
                                    onChange={(e) => setGenLength(Number(e.target.value))}
                                    className="h-2 bg-slate-200 dark:bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                            
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={includeNum}
                                    onChange={(e) => setIncludeNum(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span>{t.includeNum}</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={includeSym}
                                    onChange={(e) => setIncludeSym(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span>{t.includeSym}</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Row 4: Notes */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.notesLabel}</label>
                <div className="relative group">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                        <IconNote className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                    </div>
                    <textarea
                        rows={4}
                        className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm resize-none"
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="Secure notes, PIN codes, etc."
                    />
                </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 backdrop-blur-sm flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-dark-800 font-medium transition"
            >
                {commonT.cancel}
            </button>
            <button 
                type="submit" 
                form="entry-form"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.encrypting}
                    </span>
                ) : (
                    <><IconDeviceFloppy size={20} /> {t.saveBtn}</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
