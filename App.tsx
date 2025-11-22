
import { useEffect, useState, Suspense, lazy } from 'react';
import { supabase } from './supabaseClient';
import { useStore } from './store/useStore';
import { Auth } from './components/Auth';
import { VaultUnlock } from './components/VaultUnlock';
import { AutoLockHandler } from './components/AutoLockHandler';
import { ToastContainer } from './components/Toast';
import { ShareView } from './components/ShareView';
import { translations } from './i18n/locales';
import { IconLoader2 } from '@tabler/icons-react';

// Lazy Load Main Components
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const ExtensionDashboard = lazy(() => import('./components/ExtensionDashboard').then(module => ({ default: module.ExtensionDashboard })));

declare var chrome: any;

const LoadingScreen = () => (
    <div className="h-full w-full flex items-center justify-center text-primary-600 dark:text-primary-500">
        <IconLoader2 className="animate-spin" size={32} />
    </div>
);

const App = () => {
  const { session, setSession, isVaultUnlocked, initializeVaultFromStorage, language, theme } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExtension, setIsExtension] = useState(false);
  const [isShareLink, setIsShareLink] = useState(false);

  useEffect(() => {
    // 0. Initialize Theme
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    // 1. Check if this is a Share Link route using Hash Strategy
    // Format: /#share?id=...&key=...
    if (window.location.hash.startsWith('#share')) {
        setIsShareLink(true);
        setIsInitializing(false);
        return; // Stop auth flow for public share view
    }

    // 2. Check if running in Extension environment (Chrome/Edge)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        setIsExtension(true);
        // In extension popup, body width is usually fixed small
        document.body.style.width = '350px';
        document.body.style.height = '500px';
        document.body.classList.add('overflow-hidden');
    }

    // 3. Check Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      // 4. If session exists, try to restore Vault Key from SessionStorage
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

  if (isShareLink) {
      return <ShareView />;
  }

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
        <Auth /> 
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      <AutoLockHandler /> 
      
      {!isVaultUnlocked && <VaultUnlock />}
      
      {isVaultUnlocked && (
          <Suspense fallback={<LoadingScreen />}>
              {isExtension ? <ExtensionDashboard /> : <Dashboard />}
          </Suspense>
      )}
    </>
  );
};

export default App;
