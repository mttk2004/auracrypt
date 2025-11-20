import React, { useState } from 'react';
import { deriveKeyFromPassword } from '../services/cryptoUtils';
import { useStore } from '../store/useStore';
import { IconKey, IconLockOpen } from '@tabler/icons-react';

export const VaultUnlock = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setMasterKey = useStore((state) => state.setMasterKey);
  const session = useStore((state) => state.session);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a tiny delay for UX so the user feels the "decryption" effort
    setTimeout(async () => {
        try {
            const key = await deriveKeyFromPassword(password);
            await setMasterKey(key);
        } catch (err) {
            console.error(err);
            alert("Failed to derive key");
        } finally {
            setLoading(false);
        }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4">
                <IconKey size={32} className="text-primary-500" />
            </div>
          <h2 className="text-2xl font-bold text-white">Unlock Vault</h2>
          <p className="text-slate-400 text-sm mt-2">
            Enter your Master Password to decrypt your data locally.
          </p>
          <p className="text-xs text-slate-500 mt-1">Logged in as: {session?.user.email}</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            autoFocus
            required
            className="w-full bg-dark-800 border border-dark-700 focus:border-primary-500 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest focus:ring-1 focus:ring-primary-500 outline-none transition"
            placeholder="MASTER PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Deriving Keys...' : (
                <><IconLockOpen size={20} /> Unlock</>
            )}
          </button>
        </form>
        
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-500 text-center">
                <strong>Warning:</strong> AuraCrypt does not store your master password. If you lose it, your data is lost forever.
            </p>
        </div>
      </div>
    </div>
  );
};
