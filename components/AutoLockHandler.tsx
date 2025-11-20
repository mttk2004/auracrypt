
import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const AutoLockHandler = () => {
  const { isVaultUnlocked, lockVault, autoLockDuration } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run if vault is unlocked and auto-lock is enabled (> 0)
    if (!isVaultUnlocked || autoLockDuration === 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      
      timerRef.current = setTimeout(() => {
        console.log("Auto-locking vault due to inactivity...");
        lockVault();
      }, autoLockDuration * 60 * 1000); // Convert minutes to ms
    };

    // Initial start
    resetTimer();

    // Listeners for activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
        resetTimer();
    };

    events.forEach(event => {
        window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
          window.removeEventListener(event, handleActivity);
      });
    };
  }, [isVaultUnlocked, autoLockDuration, lockVault]);

  return null; // This component renders nothing
};
