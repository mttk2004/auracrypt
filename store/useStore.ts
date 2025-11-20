import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { DecryptedEntry, DatabaseEntry } from '../types';
import { exportKeyToString, importKeyFromString } from '../services/cryptoUtils';
import { Language } from '../i18n/locales';

type Theme = 'light' | 'dark';

interface AppState {
  // Theme State
  theme: Theme;
  toggleTheme: () => void;

  // Language State
  language: Language;
  setLanguage: (lang: Language) => void;

  // Auth State
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;

  // Vault State
  masterKey: CryptoKey | null;
  setMasterKey: (key: CryptoKey) => Promise<void>;
  isVaultUnlocked: boolean;
  
  // Data State
  entries: DecryptedEntry[];
  setEntries: (entries: DecryptedEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Actions
  initializeVaultFromStorage: () => Promise<boolean>;
  lockVault: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Theme Logic
  theme: (localStorage.getItem('auracrypt_theme') as Theme) || 'dark',
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('auracrypt_theme', newTheme);
    set({ theme: newTheme });
    
    // Apply class immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Default to EN or load from localStorage
  language: (localStorage.getItem('auracrypt_lang') as Language) || 'en',
  setLanguage: (lang) => {
      localStorage.setItem('auracrypt_lang', lang);
      set({ language: lang });
  },

  session: null,
  user: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),

  masterKey: null,
  isVaultUnlocked: false,
  
  entries: [],
  setEntries: (entries) => set({ entries }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  setMasterKey: async (key) => {
    const keyStr = await exportKeyToString(key);
    sessionStorage.setItem('auracrypt_key', keyStr);
    set({ masterKey: key, isVaultUnlocked: true });
  },

  initializeVaultFromStorage: async () => {
    const keyStr = sessionStorage.getItem('auracrypt_key');
    if (keyStr) {
      try {
        const key = await importKeyFromString(keyStr);
        set({ masterKey: key, isVaultUnlocked: true });
        return true;
      } catch (e) {
        console.error("Failed to restore key", e);
        sessionStorage.removeItem('auracrypt_key');
        return false;
      }
    }
    return false;
  },

  lockVault: () => {
    sessionStorage.removeItem('auracrypt_key');
    set({ masterKey: null, isVaultUnlocked: false, entries: [] });
  }
}));