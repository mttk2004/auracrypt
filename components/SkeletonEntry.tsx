
import React from 'react';

export const SkeletonEntry = () => {
  return (
    <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col h-[210px]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-dark-800 shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-dark-800 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-dark-800 rounded w-1/2" />
        </div>
        <div className="w-16 h-6 rounded-md bg-slate-200 dark:bg-dark-800" />
      </div>

      {/* Password Box */}
      <div className="bg-slate-50 dark:bg-dark-950/50 border border-slate-100 dark:border-dark-800 rounded-xl h-12 w-full animate-pulse mb-auto" />

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between animate-pulse">
         <div className="h-3 w-24 bg-slate-200 dark:bg-dark-800 rounded" />
         <div className="flex gap-2">
             <div className="h-8 w-8 bg-slate-200 dark:bg-dark-800 rounded" />
             <div className="h-8 w-8 bg-slate-200 dark:bg-dark-800 rounded" />
         </div>
      </div>
    </div>
  );
};
