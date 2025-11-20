import React, { useState, useEffect } from 'react';
import { deriveKeyFromPassword, decryptData } from '../services/cryptoUtils';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { DatabaseEntry } from '../types';
import { 
  IconKey, IconLockOpen, IconShieldLock, IconAlertTriangle, 
  IconTrash, IconCheck, IconLoader2 
} from '@tabler/icons-react';

type VaultMode = 'checking' | 'setup' | 'unlock';

export const VaultUnlock = () => {
  const [mode, setMode] = useState<VaultMode>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testEntry, setTestEntry] = useState<DatabaseEntry | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setMasterKey = useStore((state) => state.setMasterKey);
  const session = useStore((state) => state.session);

  // 1. Check Vault Status on Mount
  useEffect(() => {
    const checkVaultStatus = async () => {
      if (!session?.user) return;
      
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }) // QUAN TRỌNG: Luôn kiểm tra entry mới nhất
          .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
          setMode('setup');
        } else {
          setTestEntry(data[0] as DatabaseEntry);
          setMode('unlock');
        }
      } catch (err) {
        console.error("Failed to check vault status:", err);
        setErrorMsg("Network error. Please check console.");
      }
    };

    checkVaultStatus();
  }, [session]);

  // 2. Logic for Unlock (Existing User)
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    // Clean input to avoid space issues
    const cleanPassword = password.trim(); 

    try {
      // Derive Key
      const key = await deriveKeyFromPassword(cleanPassword);

      // Verify against the test entry fetched earlier
      if (testEntry) {
        try {
          await decryptData(testEntry.encrypted_password, testEntry.iv, key);
          // If no error thrown, key is correct
          await setMasterKey(key);
        } catch (decryptionError) {
          console.error("Decryption verification failed for entry ID:", testEntry.id);
          throw new Error("Incorrect password.");
        }
      } else {
         // Fallback should not happen in unlock mode
         await setMasterKey(key);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to unlock.");
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  // 3. Logic for Setup (New User)
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanPassword !== cleanConfirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    
    if (cleanPassword.length < 6) {
        setErrorMsg("Password is too short (min 6 chars).");
        return;
    }

    setLoading(true);
    try {
      const key = await deriveKeyFromPassword(cleanPassword);
      await setMasterKey(key); 
    } catch (err) {
      setErrorMsg("Failed to generate key.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Logic for Emergency Reset
  const handleEmergencyReset = async () => {
    if (!window.confirm("DANGER: This will PERMANENTLY DELETE all your passwords to reset the vault. This action cannot be undone. Are you sure?")) {
      return;
    }

    if (!session?.user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;

      alert("Vault reset successful. Please set a new Master Password.");
      setMode('setup');
      setTestEntry(null); // Clear test entry
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      alert("Reset failed (Check RLS Policy?): " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'checking') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="flex flex-col items-center gap-4 text-primary-500">
          <IconLoader2 className="animate-spin" size={48} />
          <p className="text-sm font-mono">Connecting to Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        
        <div className="text-center mb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            mode === 'setup' ? 'bg-primary-500/10 text-primary-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            {mode === 'setup' ? <IconShieldLock size={32} /> : <IconLockOpen size={32} />}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'setup' ? 'Setup Your Vault' : 'Unlock Vault'}
          </h2>
          <p className="text-slate-400 text-sm mt-2 px-4">
            {mode === 'setup' 
              ? "Create a Master Password to encrypt your data." 
              : "Enter your Master Password to decrypt your data."}
          </p>
        </div>

        <form onSubmit={mode === 'setup' ? handleSetup : handleUnlock} className="space-y-5">
          
          <div>
            <input
              type="password"
              autoFocus
              required
              className="w-full bg-dark-800 border border-dark-700 focus:border-primary-500 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest focus:ring-1 focus:ring-primary-500 outline-none transition placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-base"
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === 'setup' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
               <input
                type="password"
                required
                className="w-full bg-dark-800 border border-dark-700 focus:border-primary-500 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest focus:ring-1 focus:ring-primary-500 outline-none transition placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-base"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-pulse">
              <IconAlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className={`w-full py-3 rounded-lg text-white font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'setup' 
                ? 'bg-primary-600 hover:bg-primary-500' 
                : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            {loading ? (
              <IconLoader2 className="animate-spin" size={20} />
            ) : mode === 'setup' ? (
              <><IconCheck size={20} /> Create Vault</>
            ) : (
              <><IconLockOpen size={20} /> Unlock</>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-dark-800 text-center">
          <button
            onClick={handleEmergencyReset}
            className="text-xs text-slate-600 hover:text-red-500 transition flex items-center justify-center gap-1 mx-auto group"
          >
            <IconTrash size={14} className="group-hover:scale-110 transition-transform" />
            <span>Reset Vault / Forgot Password?</span>
          </button>
        </div>

      </div>
    </div>
  );
};