import React from 'react';
import { AnalysisResult, DetectionStatus } from '../types';

interface HistoryListProps {
  history: AnalysisResult[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  if (history.length === 0) return null;

  const getStatusStyle = (status: DetectionStatus) => {
    switch (status) {
      case DetectionStatus.PERSON_DETECTED:
        return { border: 'border-red-500', text: 'text-red-500', bg: 'bg-red-500/10', icon: '🚨' };
      case DetectionStatus.NO_PERSON:
        return { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/5', icon: '🛡️' };
      case DetectionStatus.STATIC_SCENE:
        return { border: 'border-slate-800', text: 'text-slate-500', bg: 'bg-slate-900/40', icon: '💤' };
      case DetectionStatus.ERROR:
        return { border: 'border-red-900', text: 'text-red-900', bg: 'bg-black', icon: '✖️' };
      default:
        return { border: 'border-slate-600', text: 'text-slate-400', bg: 'bg-slate-800', icon: '❓' };
    }
  };

  return (
    <div className="w-full mt-4 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="px-4 py-2 bg-slate-800/40 border-b border-slate-700/50 flex justify-between items-center backdrop-blur-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logs do Sentinela</h3>
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">Eventos Recentes</span>
      </div>
      
      <div className="divide-y divide-slate-800/30">
        {history.map((item, index) => {
          const style = getStatusStyle(item.status);
          return (
            <div 
              key={item.timestamp} 
              className={`p-3 flex items-center gap-3 transition-colors ${index === 0 ? 'bg-white/5' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border ${style.border} ${style.bg} text-lg shadow-sm`}>
                {style.icon}
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`text-[10px] font-black uppercase tracking-tight ${style.text} truncate`}>
                    {item.message}
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono font-bold">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {item.description && (
                  <p className="text-[10px] text-slate-500 truncate font-medium">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};