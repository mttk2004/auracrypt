
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useStore } from './store/useStore';
import { Auth } from './components/Auth';
import { VaultUnlock } from './components/VaultUnlock';
import { Dashboard } from './components/Dashboard';
import { ExtensionDashboard } from './components/ExtensionDashboard'; // Import new component
import { AutoLockHandler } from './components/AutoLockHandler';
import { ToastContainer } from './components/Toast';
import { translations } from './i18n/locales';

declare var chrome: any;

const App = () => {
  const { session, setSession, isVaultUnlocked, initializeVaultFromStorage, language, theme } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    // 0. Initialize Theme
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    // Check if running in Extension environment (Chrome/Edge)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        setIsExtension(true);
        // In extension popup, body width is usually fixed small
        document.body.style.width = '350px';
        document.body.style.height = '500px';
        document.body.classList.add('overflow-hidden');
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
          useStore.getState().lockVault();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, initializeVaultFromStorage, theme]);

  if (isInitializing) {
    return (
        <div className={`h-screen w-full bg-slate-50 dark:bg-dark-950 flex items-center justify-center text-primary-600 dark:text-primary-500 ${isExtension ? 'h-[500px]' : ''}`}>
            <div className="animate-pulse font-mono text-xl">
                {isExtension ? 'Loading...' : translations[language].common.initializing}
            </div>
        </div>
    );
  }

  if (!session) {
    return (
      <>
        <ToastContainer />
        {/* Reuse Auth, it works fine in extension size due to responsive CSS */}
        <Auth /> 
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      {/* AutoLock is less relevant in Popup as popup closes when clicked away, but kept for consistency */}
      <AutoLockHandler /> 
      
      {!isVaultUnlocked && <VaultUnlock />}
      
      {isVaultUnlocked && (
          isExtension ? <ExtensionDashboard /> : <Dashboard />
      )}
    </>
  );
};

export default App;