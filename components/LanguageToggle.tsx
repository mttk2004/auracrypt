
import { useStore } from '../store/useStore';
import { IconWorld } from '@tabler/icons-react';

export const LanguageToggle = () => {
  const { language, setLanguage } = useStore();

  const toggle = () => {
    setLanguage(language === 'en' ? 'vn' : 'en');
  };

  return (
    <button 
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 hover:bg-dark-700 border border-dark-700 transition text-xs font-medium text-slate-300 hover:text-white"
      title="Switch Language"
    >
      <IconWorld size={16} />
      <span>{language === 'en' ? 'EN' : 'VN'}</span>
    </button>
  );
};
