
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { SecurityReport, runSecurityScan, HealthResult } from '../services/healthCheck';
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
  const [activeTab, setActiveTab] = useState<'critical' | 'warnings'>('critical');

  const handleScan = async () => {
      setIsScanning(true);
      setTimeout(async () => {
          try {
              const result = await runSecurityScan(entries);
              setReport(result);
              // Auto switch to critical tab if breaches found, otherwise warnings
              if (result.breachedCount > 0) setActiveTab('critical');
              else setActiveTab('warnings');
          } catch (e) {
              console.error(e);
              alert("Scan failed");
          } finally {
              setIsScanning(false);
          }
      }, 300);
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-500';
      if (score >= 60) return 'text-amber-500';
      return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
      if (score >= 80) return 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-900';
      if (score >= 60) return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-900';
      return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900';
  };

  const renderEntryItem = (result: HealthResult) => {
      const entry = entries.find(e => e.id === result.entryId);
      if (!entry) return null;

      // Translate suggestions
      const suggestionText = result.suggestions.map(s => 
          translations[language].health[s as keyof typeof translations['en']['health']] || s
      ).join(', ');

      const displayStatus = result.isBreached ? t.breachedDesc : 
                            result.isReused ? t.reusedDesc :
                            result.isWeak ? (suggestionText || t.weakDesc) :
                            t.safe; // Should rarely show "Safe" in warning/critical tabs

      return (
          <div key={result.entryId} className="flex flex-col p-4 bg-white dark:bg-dark-800 border border-slate-100 dark:border-dark-700 rounded-xl hover:shadow-md transition mb-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
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
                       <div className={`text-sm font-bold ${getScoreColor(result.score)}`}>
                           {result.score} / 100
                       </div>
                  </div>
              </div>
              
              {/* Reason & Progress */}
              <div className="pl-[52px] w-full">
                   <div className="flex items-center justify-between text-xs mb-1">
                       <span className="text-slate-500 dark:text-slate-400">
                           {result.isBreached ? <span className="text-red-500 font-bold">{displayStatus}</span> : 
                            result.isReused ? <span className="text-amber-500 font-medium">{displayStatus}</span> : 
                            <span className="text-orange-500">{displayStatus}</span>}
                       </span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
                       <div 
                           className={`h-full rounded-full transition-all duration-500 ${
                               result.score >= 80 ? 'bg-green-500' : result.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                           }`}
                           style={{ width: `${result.score}%` }}
                       />
                   </div>
              </div>
          </div>
      );
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
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-dark-950">
            
            {!report ? (
                <div className="flex flex-col items-center justify-center h-full py-12 space-y-6">
                    <div className="bg-white dark:bg-dark-800 p-8 rounded-full shadow-sm">
                        <IconShieldCheck size={64} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <div className="text-center px-6">
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">{t.desc}</p>
                        <button 
                            onClick={handleScan}
                            disabled={isScanning}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-primary-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 mx-auto"
                        >
                            {isScanning ? <IconLoader2 className="animate-spin" /> : <IconActivity />}
                            {isScanning ? t.scanning : t.scanBtn}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-6 space-y-6">
                    {/* Overview Card */}
                    <div className={`p-6 rounded-2xl border shadow-sm ${getScoreBg(report.totalScore)}`}>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Circular Chart */}
                            <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                                <svg className="transform -rotate-90 w-24 h-24">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-black/5 dark:text-white/5" />
                                    <circle 
                                        cx="48" cy="48" r="40" 
                                        stroke="currentColor" 
                                        strokeWidth="8" 
                                        fill="transparent" 
                                        strokeDasharray={251.2} 
                                        strokeDashoffset={251.2 - (251.2 * report.totalScore) / 100} 
                                        className={`transition-all duration-1000 ease-out ${getScoreColor(report.totalScore)}`} 
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className={`absolute text-2xl font-bold ${getScoreColor(report.totalScore)}`}>{report.totalScore}</span>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex-1 w-full text-center md:text-left">
                                <h4 className={`text-2xl font-bold mb-2 ${getScoreColor(report.totalScore)}`}>{t.score}</h4>
                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    <div className="px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-900/30">
                                        <IconAlertOctagon size={18} /> {report.breachedCount} {t.breached}
                                    </div>
                                    <div className="px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium border border-amber-100 dark:border-amber-900/30">
                                        <IconCopy size={18} /> {report.reusedCount} {t.reused}
                                    </div>
                                    <div className="px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium border border-orange-100 dark:border-orange-900/30">
                                        <IconAlertTriangle size={18} /> {report.weakCount} {t.weak}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleScan} 
                                disabled={isScanning}
                                className="shrink-0 px-4 py-2 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-dark-700 transition"
                            >
                                {isScanning ? t.scanning : 'Rescan'}
                            </button>
                        </div>
                    </div>

                    {/* Detail Tabs */}
                    <div>
                        <div className="flex border-b border-slate-200 dark:border-dark-700 mb-4">
                            <button
                                onClick={() => setActiveTab('critical')}
                                className={`pb-2 px-4 text-sm font-bold transition border-b-2 ${
                                    activeTab === 'critical' 
                                    ? 'border-red-500 text-red-600 dark:text-red-400' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                {t.critical} ({report.breachedCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('warnings')}
                                className={`pb-2 px-4 text-sm font-bold transition border-b-2 ${
                                    activeTab === 'warnings' 
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                {t.warnings} ({report.weakCount + report.reusedCount})
                            </button>
                        </div>

                        <div className="min-h-[200px]">
                            {activeTab === 'critical' && (
                                <div>
                                    {(Object.values(report.results) as HealthResult[]).filter(r => r.isBreached).length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 animate-in fade-in zoom-in duration-300">
                                            <IconShieldCheck size={48} className="mx-auto mb-2 text-green-500" />
                                            <p>{t.noIssues}</p>
                                        </div>
                                    ) : (
                                        (Object.values(report.results) as HealthResult[]).filter(r => r.isBreached).map(renderEntryItem)
                                    )}
                                </div>
                            )}

                            {activeTab === 'warnings' && (
                                <div>
                                    {(Object.values(report.results) as HealthResult[])
                                        // FIX: Only show items that are actually Reused OR Weak (NOT just score < 100)
                                        .filter(r => !r.isBreached && (r.isReused || r.isWeak))
                                        .length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 animate-in fade-in zoom-in duration-300">
                                            <IconShieldCheck size={48} className="mx-auto mb-2 text-green-500" />
                                            <p>{t.noIssues}</p>
                                        </div>
                                    ) : (
                                        (Object.values(report.results) as HealthResult[])
                                            .filter(r => !r.isBreached && (r.isReused || r.isWeak))
                                            .sort((a, b) => a.score - b.score)
                                            .map(renderEntryItem)
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
