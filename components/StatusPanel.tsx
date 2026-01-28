import React from 'react';
import { DetectionStatus, AnalysisResult } from '../types';

interface StatusPanelProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ result, isAnalyzing }) => {
  if (!result && !isAnalyzing) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center h-48 backdrop-blur-sm">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-pulse grayscale opacity-30">🛡️</div>
          <p className="text-slate-500 text-sm">Sistema Sentinel Aguardando</p>
        </div>
      </div>
    );
  }

  let bgColor = "bg-slate-800";
  let borderColor = "border-slate-700";
  let textColor = "text-white";
  let icon = "🔍";

  if (result) {
    switch (result.status) {
      case DetectionStatus.PERSON_DETECTED:
        bgColor = "bg-red-600/20";
        borderColor = "border-red-500";
        textColor = "text-red-500";
        icon = "🚨";
        break;
      case DetectionStatus.NO_PERSON:
        bgColor = "bg-emerald-500/10";
        borderColor = "border-emerald-500/50";
        textColor = "text-emerald-400";
        icon = "🛡️";
        break;
      case DetectionStatus.STATIC_SCENE:
        bgColor = "bg-blue-500/5";
        borderColor = "border-blue-500/20";
        textColor = "text-blue-400";
        icon = "💤";
        break;
      case DetectionStatus.COOLDOWN:
        bgColor = "bg-orange-500/10";
        borderColor = "border-orange-500/40";
        textColor = "text-orange-400";
        icon = "⏳";
        break;
      case DetectionStatus.ERROR:
        bgColor = "bg-slate-900";
        borderColor = "border-red-900";
        textColor = "text-red-900";
        icon = "✖️";
        break;
      default:
        break;
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 ${borderColor} ${bgColor} transition-all duration-500 shadow-2xl h-48 group`}>
      {isAnalyzing && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer"></div>
      )}

      {result?.status === DetectionStatus.PERSON_DETECTED && (
        <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none"></div>
      )}
      
      <div className="h-full flex flex-col items-center justify-center text-center p-4 relative">
        <div className="absolute opacity-5 text-9xl select-none pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
           {isAnalyzing ? "⚙️" : icon}
        </div>

        <div className={`text-5xl mb-3 filter drop-shadow-md z-10 transition-all duration-300 transform ${result?.status === DetectionStatus.PERSON_DETECTED ? 'scale-125 animate-bounce' : 'group-hover:-translate-y-1'}`}>
            {isAnalyzing ? "🤔" : icon}
        </div>
        
        <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tighter ${textColor} z-10 drop-shadow-sm`}>
          {isAnalyzing ? "Escaneando..." : result?.message}
        </h2>
        
        {!isAnalyzing && result?.description && (
          <p className="text-slate-300 text-xs max-w-xs mx-auto mt-3 font-mono bg-black/40 px-3 py-1.5 rounded-md border border-white/5 z-10">
            {result.description}
          </p>
        )}

        {!isAnalyzing && result?.confidence !== undefined && result.status !== DetectionStatus.STATIC_SCENE && (
           <div className="absolute top-3 right-3 z-10 text-right">
             <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Confiança</div>
             <div className={`text-lg font-mono font-black ${result.status === DetectionStatus.PERSON_DETECTED ? 'text-red-400' : 'text-emerald-400'}`}>
               {result.confidence}%
             </div>
           </div>
        )}

        {result?.timestamp && (
           <p className="text-[10px] text-slate-500 absolute bottom-2 right-4 font-mono z-10">
             {new Date(result.timestamp).toLocaleTimeString()}
           </p>
        )}
      </div>
    </div>
  );
};