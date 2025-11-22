
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabaseClient';
import { decryptData } from '../services/cryptoUtils';
import { DecryptedEntry, DatabaseEntry } from '../types';
import { IconLogin, IconCopy, IconExternalLink, IconSearch, IconShieldCheck } from '@tabler/icons-react';

declare var chrome: any;

export const ExtensionDashboard = () => {
  const { user, masterKey, entries, setEntries, addToast, lockVault } = useStore();
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');

  // Helper: Get clean hostname (remove www.)
  const getCleanHostname = (urlStr: string) => {
      try {
          return new URL(urlStr).hostname.replace(/^www\./, '');
      } catch {
          return '';
      }
  };

  // 1. Get Current Tab URL (Chrome API)
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
        if (tabs[0]?.url) {
           const host = getCleanHostname(tabs[0].url);
           setCurrentDomain(host);
        }
      });
    }
  }, []);

  // 2. Fetch & Decrypt (Reused logic, simplified)
  useEffect(() => {
    if (!user || !masterKey) return;
    if (entries.length > 0) return; // Use cache if available

    const fetchEntries = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id);

      if (error) console.error("Failed to fetch entries", error);

      if (data) {
        const decryptedList: DecryptedEntry[] = [];
        for (const entry of (data as DatabaseEntry[])) {
            try {
                const password = await decryptData(entry.encrypted_password, entry.iv, masterKey);
                decryptedList.push({
                    ...entry,
                    password,
                    notes: '', // Skip notes for speed in extension
                    url: entry.url || ''
                });
            } catch (e) { /* ignore error */ }
        }
        setEntries(decryptedList);
      }
      setIsLoading(false);
    };
    fetchEntries();
  }, [user, masterKey, entries.length, setEntries]);

  // 3. Filter Matching Entries
  const matchingEntries = entries.filter(e => {
     const search = filter.toLowerCase();
     
     // If user is typing search, ignore domain matching
     if (filter) {
         const inName = e.service_name.toLowerCase().includes(search);
         const inUser = e.username?.toLowerCase().includes(search);
         return inName || inUser;
     }

     // Strict Domain Matching
     if (currentDomain && e.url) {
         const entryHost = getCleanHostname(e.url);
         // Match: entryHost is same as current, or entryHost is a parent of current (e.g., google.com matches accounts.google.com)
         return entryHost && (currentDomain === entryHost || currentDomain.endsWith('.' + entryHost));
     }
     
     // Fallback: If no current domain (e.g. new tab), show nothing or favorites? 
     // For now, show all if no domain detected, but usually we want to filter.
     return false;
  });

  // 4. Auto-fill Handler
  const handleAutoFill = (entry: DecryptedEntry) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
            const tabId = tabs[0].id;
            if (tabId) {
                // Inject content script dynamically
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }, () => {
                    // Send message after injection
                    chrome.tabs.sendMessage(tabId, {
                        action: "FILL_CREDENTIALS",
                        username: entry.username,
                        password: entry.password
                    }, (_response: any) => {
                        if (chrome.runtime.lastError) {
                           // Script injection failed or blocked
                           addToast('error', "Could not access page inputs.");
                        } else {
                           addToast('success', `Filled ${entry.service_name}`);
                           setTimeout(() => window.close(), 500); // Close popup nicely
                        }
                    });
                });
            }
        });
    } else {
        addToast('error', "Extension API not available");
    }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      addToast('success', "Copied!");
  };

  return (
    <div className="w-[350px] h-[500px] bg-slate-50 dark:bg-dark-950 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between shadow-sm">
            <h1 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center text-white text-xs font-bold">AC</div>
                AuraCrypt
            </h1>
            <button onClick={lockVault} className="text-xs font-medium text-slate-500 hover:text-red-500 transition">Lock</button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-dark-800 bg-white dark:bg-dark-900">
            <div className="relative">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search vault..." 
                    className="w-full bg-slate-100 dark:bg-dark-800 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    autoFocus
                />
                {currentDomain && !filter && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <IconShieldCheck size={10} />
                        {currentDomain}
                    </div>
                )}
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
                <div className="space-y-2">
                    <div className="h-16 bg-slate-200 dark:bg-dark-800 rounded-lg animate-pulse" />
                    <div className="h-16 bg-slate-200 dark:bg-dark-800 rounded-lg animate-pulse" />
                </div>
            ) : matchingEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 pb-10">
                    {filter ? (
                        <>
                            <IconSearch size={32} className="mb-2 opacity-30" />
                            <p className="text-sm">No results for "{filter}"</p>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-100 dark:bg-dark-800 p-3 rounded-full mb-3">
                                <IconExternalLink size={24} className="opacity-50" />
                            </div>
                            <p className="text-sm font-medium">No logins found for</p>
                            <p className="text-xs font-mono mt-1 opacity-70 max-w-[200px] truncate">{currentDomain || "Current Page"}</p>
                            <p className="text-xs mt-4 text-primary-600 cursor-pointer" onClick={() => setFilter(' ')}>Show all items</p>
                        </>
                    )}
                </div>
            ) : (
                matchingEntries.map(entry => (
                    <div key={entry.id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl p-3 hover:border-primary-500 transition group shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="truncate pr-2">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{entry.service_name}</div>
                                <div className="text-xs text-slate-500 truncate">{entry.username || 'No username'}</div>
                            </div>
                            {entry.url && <img src={`https://www.google.com/s2/favicons?domain=${entry.url}`} className="w-4 h-4 opacity-70 rounded-sm" alt="" />}
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                            <button 
                                onClick={() => handleAutoFill(entry)}
                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition shadow-sm active:scale-95"
                            >
                                <IconLogin size={14} /> Auto-Fill
                            </button>
                            <button 
                                onClick={() => copyToClipboard(entry.password)}
                                className="px-3 bg-slate-50 dark:bg-dark-800 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg border border-slate-200 dark:border-dark-700 transition"
                                title="Copy Password"
                            >
                                <IconCopy size={14} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
