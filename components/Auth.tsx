import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { IconShieldLock, IconLogin, IconUserPlus } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { language } = useStore();
  const t = translations[language].auth;
  const commonT = translations[language].common;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert(t.checkEmail);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-dark-950 p-4 relative transition-colors duration-300">
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl transition-colors duration-300">
        <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-primary-100 dark:bg-primary-500/10 rounded-full mb-4">
                <IconShieldLock size={48} className="text-primary-600 dark:text-primary-500" />
            </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">AuraCrypt</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t.title}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.emailLabel}</label>
            <input
              type="email"
              required
              className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-800 focus:border-primary-500 dark:focus:border-primary-500 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.passwordLabel}</label>
            <input
              type="password"
              required
              className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-300 dark:border-dark-800 focus:border-primary-500 dark:focus:border-primary-500 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none transition"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
                <span>{commonT.loading}</span>
            ) : isSignUp ? (
                <>
                    <IconUserPlus size={20} /> {t.signUpBtn}
                </>
            ) : (
                <>
                    <IconLogin size={20} /> {t.signInBtn}
                </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition"
          >
            {isSignUp ? t.switchToSignIn : t.switchToSignUp}
          </button>
        </div>
      </div>
    </div>
  );
};