import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { encryptData, decryptData } from '../services/cryptoUtils';
import { DecryptedEntry, CreateEntryPayload, DatabaseEntry, Category, CATEGORIES } from '../types';
import { EntryModal } from './EntryModal';
import { 
    IconSearch, IconPlus, IconLogout, IconCopy, 
    IconEye, IconEyeOff, IconFolder, IconShieldCheck, IconTrash
} from '@tabler/icons-react';

export const Dashboard = () => {
  const { user, masterKey, entries, setEntries, lockVault, session } = useStore();
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fetch and Decrypt Data
  useEffect(() => {
    if (!user || !masterKey) return;

    const fetchEntries = async () => {
      setIsLoadingData(true);
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching entries:", error);
        setIsLoadingData(false);
        return;
      }

      // Decrypt client-side
      const decryptedList: DecryptedEntry[] = [];
      for (const entry of (data as DatabaseEntry[])) {
        try {
            // Metadata is plaintext, sensitive data is decrypted
            
            // 1. Decrypt Password using the primary IV column
            const password = await decryptData(entry.encrypted_password, entry.iv, masterKey);
            
            // 2. Decrypt Notes
            let notes = '';
            if (entry.encrypted_notes) {
                if (entry.encrypted_notes.includes(':')) {
                    // New Format: "IV:Ciphertext"
                    const [noteIv, noteCipher] = entry.encrypted_notes.split(':');
                    if (noteIv && noteCipher) {
                         notes = await decryptData(noteCipher, noteIv, masterKey);
                    }
                } else {
                    // Fallback: Try using the entry's main IV (legacy format or data)
                    try {
                        notes = await decryptData(entry.encrypted_notes, entry.iv, masterKey);
                    } catch (e) {
                        // If fallback fails, assume empty or corrupted
                        console.warn(`Failed to decrypt notes for entry ${entry.id} using fallback IV`);
                    }
                }
            }
            
            decryptedList.push({
                id: entry.id,
                user_id: entry.user_id,
                service_name: entry.service_name,
                username: entry.username,
                category: entry.category,
                created_at: entry.created_at,
                password,
                notes
            });
        } catch (e) {
            console.error(`Failed to decrypt entry ${entry.id}`, e);
            // We intentionally skip pushing failed entries so the UI doesn't break
        }
      }
      setEntries(decryptedList);
      setIsLoadingData(false);
    };

    fetchEntries();
  }, [user, masterKey, setEntries]);

  // Save Handler
  const onSaveEntry = async (payload: CreateEntryPayload) => {
      if (!user || !masterKey) return;
      
      const pwEnc = await encryptData(payload.password, masterKey);
      
      let notesPayload = null;
      if (payload.notes) {
           const notesEnc = await encryptData(payload.notes, masterKey);
           // Store as "IV:CIPHER" to ensure unique IV for notes
           notesPayload = `${notesEnc.iv}:${notesEnc.cipherText}`;
      }

      const { data, error } = await supabase.from('entries').insert({
          user_id: user.id,
          service_name: payload.service_name,
          username: payload.username,
          category: payload.category,
          encrypted_password: pwEnc.cipherText,
          iv: pwEnc.iv,
          encrypted_notes: notesPayload
      }).select();

      if (error) throw error;

      if (data) {
          // Optimistically add to UI
          const newEntry: DecryptedEntry = {
              id: data[0].id,
              user_id: user.id,
              service_name: payload.service_name,
              username: payload.username,
              category: payload.category,
              created_at: data[0].created_at,
              password: payload.password,
              notes: payload.notes
          };
          setEntries([newEntry, ...entries]);
      }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Are you sure?")) return;
      await supabase.from('entries').delete().eq('id', id);
      setEntries(entries.filter(e => e.id !== id));
  }

  const toggleReveal = (id: string) => {
      const newSet = new Set(revealedPasswords);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setRevealedPasswords(newSet);
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      // In a real app, show a toast
  }

  const handleLogout = async () => {
      lockVault();
      await supabase.auth.signOut();
      sessionStorage.clear();
      window.location.reload();
  }

  const filteredEntries = useMemo(() => {
      return entries.filter(e => {
          const matchesSearch = e.service_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (e.username && e.username.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
          return matchesSearch && matchesCategory;
      });
  }, [entries, searchTerm, selectedCategory]);

  return (
    <div className="flex h-screen bg-dark-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-dark-800 flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg">
                <IconShieldCheck size={24} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">AuraCrypt</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</div>
            {CATEGORIES.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedCategory === cat 
                        ? 'bg-primary-500/10 text-primary-400' 
                        : 'text-slate-400 hover:bg-dark-800 hover:text-slate-200'
                    }`}
                >
                    <IconFolder size={18} />
                    {cat}
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-dark-800">
            <div className="mb-4 px-3 text-xs text-slate-500 truncate">
                {user?.email}
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition">
                <IconLogout size={18} /> Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-dark-900/50 backdrop-blur-md border-b border-dark-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search vault..." 
                        className="w-full bg-dark-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-primary-500 placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <button 
                onClick={() => setModalOpen(true)}
                className="ml-4 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-primary-500/20"
            >
                <IconPlus size={18} /> <span className="hidden sm:inline">Add Entry</span>
            </button>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
            {isLoadingData ? (
                <div className="flex items-center justify-center h-full text-slate-500">Decrypting Vault...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <IconFolder size={48} className="mb-4 opacity-20" />
                    <p>No entries found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredEntries.map(entry => (
                        <div key={entry.id} className="group bg-dark-900 border border-dark-800 rounded-xl p-5 hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md relative">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{entry.service_name}</h3>
                                    <p className="text-xs text-slate-500">{entry.username || 'No username'}</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-dark-800 text-slate-400 px-2 py-1 rounded">
                                    {entry.category}
                                </span>
                            </div>

                            <div className="bg-dark-950 rounded-lg p-3 mb-3 border border-dark-800 flex items-center justify-between">
                                <div className="font-mono text-sm truncate mr-2 text-primary-200">
                                    {revealedPasswords.has(entry.id) ? entry.password : '•••••••••••••'}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => toggleReveal(entry.id)} className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-dark-800">
                                        {revealedPasswords.has(entry.id) ? <IconEyeOff size={16}/> : <IconEye size={16}/>}
                                    </button>
                                    <button onClick={() => copyToClipboard(entry.password)} className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-dark-800">
                                        <IconCopy size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            {entry.notes && (
                                <p className="text-xs text-slate-400 line-clamp-2 mb-3 italic border-l-2 border-dark-700 pl-2">
                                    {entry.notes}
                                </p>
                            )}

                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2">
                                <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>

      <EntryModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={onSaveEntry}
      />
    </div>
  );
};