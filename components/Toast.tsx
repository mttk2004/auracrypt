
import React from 'react';
import { useStore } from '../store/useStore';
import { IconCheck, IconAlertTriangle, IconInfoCircle, IconX } from '@tabler/icons-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-80 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 shadow-xl rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300 fade-in"
        >
          <div className={`p-1.5 rounded-full shrink-0 ${
            toast.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-500' :
            toast.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500' :
            'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-500'
          }`}>
            {toast.type === 'success' && <IconCheck size={18} />}
            {toast.type === 'error' && <IconAlertTriangle size={18} />}
            {toast.type === 'info' && <IconInfoCircle size={18} />}
          </div>
          
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
              {toast.message}
            </p>
          </div>

          <button 
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <IconX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
