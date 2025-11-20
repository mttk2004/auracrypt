import React, { useState } from 'react';
import { CreateEntryPayload, CATEGORIES, Category } from '../types';
import { IconX, IconDeviceFloppy } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEntryPayload) => Promise<void>;
}

export const EntryModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateEntryPayload>({
    service_name: '',
    username: '',
    password: '',
    category: 'Other',
    notes: ''
  });
  
  const { language } = useStore();
  const t = translations[language].modal;
  const commonT = translations[language].common;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      setFormData({
        service_name: '',
        username: '',
        password: '',
        category: 'Other',
        notes: ''
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-dark-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="entry-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">{t.serviceLabel}</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none transition"
                        value={formData.service_name}
                        onChange={e => setFormData({...formData, service_name: e.target.value})}
                        placeholder="e.g. Netflix, Google"
                    />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">{t.categoryLabel}</label>
                    <select
                        className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none transition"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                        {CATEGORIES.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">{t.usernameLabel}</label>
                    <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none transition"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">{t.passwordLabel}</label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-primary-500 outline-none transition"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">{t.notesLabel}</label>
                    <textarea
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none transition"
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-900/50 rounded-b-xl flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-dark-800 transition"
            >
                {commonT.cancel}
            </button>
            <button 
                type="submit" 
                form="entry-form"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
                {loading ? t.encrypting : <><IconDeviceFloppy size={18} /> {t.saveBtn}</>}
            </button>
        </div>
      </div>
    </div>
  );
};