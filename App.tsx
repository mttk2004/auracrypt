import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useStore } from './store/useStore';
import { Auth } from './components/Auth';
import { VaultUnlock } from './components/VaultUnlock';
import { Dashboard } from './components/Dashboard';
import { decryptData } from './services/cryptoUtils';
import { DatabaseEntry, DecryptedEntry } from './types';

const App = () => {
  const { session, setSession, isVaultUnlocked, initializeVaultFromStorage } = useStore();
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
  
  // Monkey patch the decrypt logic for the Dashboard's usage if needed, 
  // or better, ensure Dashboard handles the "IV:Cipher" split for notes.
  // (Handled in Dashboard.tsx comments logic, refined below)

  const GlobalDecryptHelper = async (entry: DatabaseEntry, key: CryptoKey): Promise<DecryptedEntry> => {
      const password = await decryptData(entry.encrypted_password, entry.iv, key);
      let notes = '';
      if (entry.encrypted_notes) {
          if (entry.encrypted_notes.includes(':')) {
              const [iv, cipher] = entry.encrypted_notes.split(':');
              notes = await decryptData(cipher, iv, key);
          } else {
              // Fallback if user inserted old format or something
              notes = "Error: Invalid format";
          }
      }
      return {
          ...entry,
          password,
          notes
      } as DecryptedEntry;
  }
  // We attach this helper indirectly via the logic in Dashboard.tsx, 
  // I included the logic inside Dashboard.tsx directly for simplicity.

  if (isInitializing) {
    return (
        <div className="h-screen w-full bg-dark-950 flex items-center justify-center text-primary-500">
            <div className="animate-pulse font-mono text-xl">INITIALIZING SECURE ENVIRONMENT...</div>
        </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      {!isVaultUnlocked && <VaultUnlock />}
      {/* We render Dashboard behind the modal or only when unlocked? 
          Better to render it but maybe blurred if locked, 
          but for security, don't render sensitive data until unlocked.
          Since `entries` are empty in store until fetch (which requires key),
          it's safe to render Dashboard structure.
       */}
      {isVaultUnlocked ? <Dashboard /> : (
          <div className="h-screen w-full bg-dark-950 flex items-center justify-center text-slate-500 blur-sm scale-95 transition-all">
             <div className="text-center">
                 <h1 className="text-4xl font-bold mb-4">AuraCrypt</h1>
                 <p>Vault Locked</p>
             </div>
          </div>
      )}
    </>
  );
};

export default App;
