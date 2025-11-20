import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { SecurityReport, runSecurityScan } from '../services/healthCheck';
import { IconX, IconActivity, IconLoader2, IconAlertTriangle, IconShieldCheck, IconAlertOctagon, IconCopy } from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthCheckModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, entries } = useStore();
  const t = translations[language].health;
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<SecurityReport | null>(null);

  const handleScan = async () => {
      setIsScanning(true);
      // Small delay to let UI render loading state
      setTimeout(async () => {
          try {
              const result = await runSecurityScan(entries);
              setReport(result);
          } catch (e) {
              console.error(e);
              alert("Scan failed");
          } finally {
              setIsScanning(false);
          }
      }, 100);
  };

  const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-500';
      if (score >= 70) return 'text-amber-500';
      return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
      if (score >= 90) return 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-900';
      if (score >= 70) return 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-900';
      return 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-900';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg">
                <IconActivity size={24} />
             </div>
             <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            
            {!report ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="bg-slate-100 dark:bg-dark-800 p-8 rounded-full">
                        <IconShieldCheck size={64} className="text-slate-400 dark:text-slate-600" />
                    </div>
                    <button 
                        onClick={handleScan}
                        disabled={isScanning}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-primary-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                        {isScanning ? <IconLoader2 className="animate-spin" /> : <IconActivity />}
                        {isScanning ? t.scanning : t.scanBtn}
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Score Card */}
                    <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${getScoreBg(report.totalScore)}`}>
                        <div className="flex items-center gap-6">
                            <div className="relative flex items-center justify-center w-24 h-24">
                                <svg className="transform -rotate-90 w-24 h-24">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-black/10 dark:text-white/10" />
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * report.totalScore) / 100} className={getScoreColor(report.totalScore)} />
                                </svg>
                                <span className={`absolute text-2xl font-bold ${getScoreColor(report.totalScore)}`}>{report.totalScore}</span>
                            </div>
                            <div>
                                <h4 className={`text-2xl font-bold ${getScoreColor(report.totalScore)}`}>{t.score}</h4>
                                <div className="flex gap-4 mt-2 text-sm font-medium">
                                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                        <IconAlertOctagon size={16} /> {report.breachedCount} {t.breached}
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <IconCopy size={16} /> {report.reusedCount} {t.reused}
                                    </div>
                                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                        <IconAlertTriangle size={16} /> {report.weakCount} {t.weak}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleScan} 
                            disabled={isScanning}
                            className="px-4 py-2 bg-white dark:bg-dark-800 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-dark-700 transition"
                        >
                            {isScanning ? t.scanning : 'Rescan'}
                        </button>
                    </div>

                    {/* Issues List */}
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Issues Found</h4>
                        {Object.values(report.results).filter(r => r.score < 100).sort((a, b) => a.score - b.score).map(result => {
                            const entry = entries.find(e => e.id === result.entryId);
                            if (!entry) return null;

                            return (
                                <div key={result.entryId} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-dark-800 last:border-0 hover:bg-slate-50 dark:hover:bg-dark-800/50 transition rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${
                                            result.isBreached ? 'bg-red-100 text-red-600 dark:bg-red-500/20' :
                                            result.isReused ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' :
                                            'bg-orange-100 text-orange-600 dark:bg-orange-500/20'
                                        }`}>
                                            {result.isBreached ? <IconAlertOctagon size={20} /> : result.isReused ? <IconCopy size={20} /> : <IconAlertTriangle size={20} />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">{entry.service_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{entry.username}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {result.isBreached ? <span className="text-red-500">{t.breached}</span> : 
                                             result.isReused ? <span className="text-amber-500">{t.reused}</span> : 
                                             <span className="text-orange-500">{t.weak}</span>}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {result.isBreached ? t.breachedDesc : 
                                             result.isReused ? t.reusedDesc : 
                                             t.weakDesc}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {Object.values(report.results).every(r => r.score === 100) && (
                            <div className="text-center py-8 text-slate-400">
                                <IconShieldCheck size={48} className="mx-auto mb-2 text-green-500" />
                                <p>{t.noIssues}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};