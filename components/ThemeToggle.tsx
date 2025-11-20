import React from 'react';
import { useStore } from '../store/useStore';
import { IconSun, IconMoon } from '@tabler/icons-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useStore();

  return (
    <button 
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 rounded-full bg-slate-200 dark:bg-dark-800 hover:bg-slate-300 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-700 transition text-slate-700 dark:text-slate-300"
      title="Toggle Theme"
    >
      {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
    </button>
  );
};