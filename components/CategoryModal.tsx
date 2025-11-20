
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { IconX, IconPlus, IconTrash, IconFolder } from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { categories, addCategory, deleteCategory, language, addToast } = useStore();
  const t = translations[language].catManager;
  
  const [newCatName, setNewCatName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newCatName.trim();
      if (!name) return;

      if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          addToast('error', t.exists);
          return;
      }

      setIsAdding(true);
      try {
          await addCategory(name);
          addToast('success', t.added);
          setNewCatName('');
      } catch (e) {
          console.error(e);
          addToast('error', "Failed to add category");
      } finally {
          setIsAdding(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm(translations[language].common.confirm)) return;
      try {
          await deleteCategory(id);
          addToast('success', t.deleted);
      } catch (e) {
          console.error(e);
          addToast('error', "Failed to delete category");
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
            <IconX size={20} />
          </button>
        </div>

        <div className="p-5">
            <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                <input 
                    type="text"
                    className="flex-1 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                    placeholder={t.addPlaceholder}
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                />
                <button 
                    type="submit"
                    disabled={!newCatName || isAdding}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                    <IconPlus size={18} />
                </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {categories.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-4">{t.empty}</p>
                ) : (
                    categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-800 rounded-lg border border-slate-100 dark:border-dark-700">
                            <div className="flex items-center gap-3">
                                <IconFolder size={18} className="text-slate-400" />
                                <span className="text-slate-700 dark:text-slate-200 font-medium">{cat.name}</span>
                            </div>
                            <button 
                                onClick={() => handleDelete(cat.id)}
                                className="text-slate-400 hover:text-red-500 transition"
                            >
                                <IconTrash size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
