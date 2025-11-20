
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useStore } from './store/useStore';
import { Auth } from './components/Auth';
import { VaultUnlock } from './components/VaultUnlock';
import { Dashboard } from './components/Dashboard';
import { AutoLockHandler } from './components/AutoLockHandler';
import { ToastContainer } from './components/Toast';
import { translations } from './i18n/locales';

const App = () => {
  const { session, setSession, isVaultUnlocked, initializeVaultFromStorage, language, theme } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 0. Initialize Theme
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // 1. Check Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      // 2. If session exists, try to restore Vault Key from SessionStorage
      if (session) {
        initializeVaultFromStorage().then(() => {
            setIsInitializing(false);
        });
      } else {
          setIsInitializing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
          // If logged out, clear vault state
          useStore.getState().lockVault();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, initializeVaultFromStorage, theme]);

  if (isInitializing) {
    return (
        <div className="h-screen w-full bg-slate-50 dark:bg-dark-950 flex items-center justify-center text-primary-600 dark:text-primary-500">
            <div className="animate-pulse font-mono text-xl">
                {translations[language].common.initializing}
            </div>
        </div>
    );
  }

  if (!session) {
    return (
      <>
        <ToastContainer />
        <Auth />
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      <AutoLockHandler />
      {!isVaultUnlocked && <VaultUnlock />}
      {isVaultUnlocked ? <Dashboard /> : (
          <div className="h-screen w-full bg-slate-50 dark:bg-dark-950 flex items-center justify-center text-slate-400 dark:text-slate-500 blur-sm scale-95 transition-all">
             <div className="text-center">
                 <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">AuraCrypt</h1>
                 <p>{translations[language].common.vaultLocked}</p>
             </div>
          </div>
      )}
    </>
  );
};

export default App;
