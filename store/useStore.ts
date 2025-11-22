
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { DecryptedEntry, CategoryItem, DEFAULT_CATEGORIES } from '../types';
import { exportKeyToString, importKeyFromString } from '../services/cryptoUtils';
import { Language } from '../i18n/locales';

type Theme = 'light' | 'dark';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

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
  
  // Settings State
  autoLockDuration: number; // in minutes, 0 = off
  setAutoLockDuration: (minutes: number) => void;

  // Data State
  entries: DecryptedEntry[];
  setEntries: (entries: DecryptedEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Category State
  categories: CategoryItem[];
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Toast State
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;

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
  
  // Auto Lock Settings
  autoLockDuration: Number(localStorage.getItem('auracrypt_autolock')) || 0,
  setAutoLockDuration: (minutes) => {
      localStorage.setItem('auracrypt_autolock', String(minutes));
      set({ autoLockDuration: minutes });
  },

  entries: [],
  setEntries: (entries) => set({ entries }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // CATEGORY LOGIC
  categories: [],
  fetchCategories: async () => {
    const user = get().user;
    if (!user) return;

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    if (error) {
        console.error("Failed to fetch categories", error);
        return;
    }

    // Auto-initialize defaults if empty
    if (!data || data.length === 0) {
        const defaults = DEFAULT_CATEGORIES.map(name => ({
            user_id: user.id,
            name
        }));
        const { data: newCats, error: insertError } = await supabase
            .from('categories')
            .insert(defaults)
            .select();
        
        if (!insertError && newCats) {
            set({ categories: newCats });
        }
    } else {
        set({ categories: data });
    }
  },

  addCategory: async (name: string) => {
      const user = get().user;
      if (!user) return;
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
          set(state => ({ categories: [...state.categories, data].sort((a, b) => a.name.localeCompare(b.name)) }));
      }
  },

  deleteCategory: async (id: string) => {
      const user = get().user;
      if (!user) throw new Error("Authentication required");

      // Explicitly ask for count to verify deletion
      const { error, count } = await supabase
          .from('categories')
          .delete({ count: 'exact' })
          .eq('id', id)
          .eq('user_id', user.id); // Ensure RLS match

      if (error) throw error;

      // If count is 0, it means nothing was deleted (likely RLS or ID mismatch)
      if (count === 0 || count === null) {
          throw new Error("Category could not be deleted. Please check permissions.");
      }

      set(state => ({ categories: state.categories.filter(c => c.id !== id) }));
  },

  // Toast Logic
  toasts: [],
  addToast: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        get().removeToast(id);
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

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
