import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useStore } from './store/useStore';
import { Auth } from './components/Auth';
import { VaultUnlock } from './components/VaultUnlock';
import { Dashboard } from './components/Dashboard';
import { decryptData } from './services/cryptoUtils';
import { DatabaseEntry, DecryptedEntry } from './types';
import { translations } from './i18n/locales';

const App = () => {
  const { session, setSession, isVaultUnlocked, initializeVaultFromStorage, language } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
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
          // If logged out, clear vault state (handled in store, but double check)
          useStore.getState().lockVault();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, initializeVaultFromStorage]);

  // Handling special decrypted notes format inside Dashboard component mostly, 
  // but here we just structure the layout.

  if (isInitializing) {
    return (
        <div className="h-screen w-full bg-dark-950 flex items-center justify-center text-primary-500">
            <div className="animate-pulse font-mono text-xl">
                {translations[language].common.initializing}
            </div>
        </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      {!isVaultUnlocked && <VaultUnlock />}
      {isVaultUnlocked ? <Dashboard /> : (
          <div className="h-screen w-full bg-dark-950 flex items-center justify-center text-slate-500 blur-sm scale-95 transition-all">
             <div className="text-center">
                 <h1 className="text-4xl font-bold mb-4">AuraCrypt</h1>
                 <p>{translations[language].common.vaultLocked}</p>
             </div>
          </div>
      )}
    </>
  );
};

export default App;