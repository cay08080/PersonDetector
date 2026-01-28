import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WebcamCapture, WebcamCaptureRef } from './components/WebcamCapture';
import { StatusPanel } from './components/StatusPanel';
import { HistoryList } from './components/HistoryList';
import { analyzeImageForPerson } from './services/geminiService';
import { AnalysisResult, DetectionStatus } from './types';

const RESOLUTIONS = {
  HD: { width: 1280, height: 720, label: "HD (720p)" },
  FHD: { width: 1920, height: 1080, label: "Full HD (1080p)" },
  UHD: { width: 3840, height: 2160, label: "4K (2160p)" }
};

type ResolutionKey = keyof typeof RESOLUTIONS;
const DEFAULT_INTERVAL = 30000;

const App: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [resolutionKey, setResolutionKey] = useState<ResolutionKey>('HD');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  
  const [currentInterval, setCurrentInterval] = useState<number>(DEFAULT_INTERVAL);
  const [timeUntilNextScan, setTimeUntilNextScan] = useState<number>(DEFAULT_INTERVAL);
  const nextScanTimeRef = useRef<number>(Date.now() + DEFAULT_INTERVAL);
  
  const webcamRef = useRef<WebcamCaptureRef>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Siren Sound Generator using Web Audio API
  const playAlarmSound = useCallback(() => {
    if (!isSoundEnabled) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Siren frequency modulation
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  }, [isSoundEnabled]);

  // Timer Effect
  useEffect(() => {
    let timerId: any;
    if (isActive) {
      timerId = setInterval(() => {
        const remaining = Math.max(0, nextScanTimeRef.current - Date.now());
        setTimeUntilNextScan(remaining);
      }, 100);
    } else {
      setTimeUntilNextScan(DEFAULT_INTERVAL);
    }
    return () => clearInterval(timerId);
  }, [isActive]);

  const addToHistory = (result: AnalysisResult) => {
    setHistory(prev => [result, ...prev].slice(0, 5));
  };

  const handleImageCapture = useCallback(async (base64Image: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeImageForPerson(base64Image);
      setLastResult(result);
      addToHistory(result);
      setCurrentInterval(DEFAULT_INTERVAL);

      // Trigger Alarm if Person Detected
      if (result.status === DetectionStatus.PERSON_DETECTED) {
        playAlarmSound();
      }

    } catch (error: any) {
      let errorResult: AnalysisResult;
      if (error.message === "QUOTA_EXCEEDED") {
         const newInterval = Math.min(currentInterval * 2, 300000);
         setCurrentInterval(newInterval);
         errorResult = {
          status: DetectionStatus.COOLDOWN,
          message: "Ajustando Frequência",
          description: "Economizando recursos da nuvem.",
          timestamp: Date.now()
        };
      } else {
        errorResult = {
          status: DetectionStatus.ERROR,
          message: "Erro no Sensor",
          description: error.message || "Falha na análise da imagem.",
          timestamp: Date.now()
        };
      }
      setLastResult(errorResult);
      addToHistory(errorResult);
    } finally {
      setIsAnalyzing(false);
      nextScanTimeRef.current = Date.now() + currentInterval;
    }
  }, [isAnalyzing, currentInterval, playAlarmSound]);

  const handleNoMotion = useCallback(() => {
    const result: AnalysisResult = {
        status: DetectionStatus.STATIC_SCENE,
        message: "Perímetro Estático",
        description: "Sem alterações na cena.",
        timestamp: Date.now()
    };
    setLastResult(result);
    addToHistory(result);
    nextScanTimeRef.current = Date.now() + currentInterval;
  }, [currentInterval]);

  const toggleSystem = () => {
    const newState = !isActive;
    setIsActive(newState);
    if (!newState) {
      setLastResult(null);
      setHistory([]);
      setCurrentInterval(DEFAULT_INTERVAL);
    } else {
      nextScanTimeRef.current = Date.now() + DEFAULT_INTERVAL;
      // Unlock audio context on user interaction
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  };

  const progressPercent = Math.min(100, Math.max(0, 100 - (timeUntilNextScan / currentInterval) * 100));

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 font-sans selection:bg-red-500/30">
      
      {/* Header */}
      <header className="w-full max-w-4xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <span className="text-emerald-500">SENTINEL</span>
            <span className="bg-white text-slate-900 px-2 rounded">AI</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">
            Monitoramento de Segurança Multimodal
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-3 rounded-full border transition-all ${isSoundEnabled ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
            title={isSoundEnabled ? "Alarme Ativado" : "Alarme Silenciado"}
          >
            {isSoundEnabled ? '🔊' : '🔇'}
          </button>
          
          <button
            onClick={toggleSystem}
            className={`px-8 py-3 rounded-lg font-black shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-b-4 ${
              isActive 
                ? 'bg-red-600 text-white border-red-800 hover:bg-red-700' 
                : 'bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-500'
            }`}
          >
            {isActive ? 'DESATIVAR DEFESA' : 'ATIVAR SENTINELA'}
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={`w-full max-w-4xl h-2 bg-slate-800 rounded-full mb-8 overflow-hidden transition-all ${isActive ? 'opacity-100' : 'opacity-0 scale-95'}`}>
        <div 
          className={`h-full transition-all duration-100 ease-linear ${lastResult?.status === DetectionStatus.PERSON_DETECTED ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            <div className="flex items-center gap-3">
              <span>Sensor Visual</span>
              <select 
                value={resolutionKey} 
                onChange={(e) => setResolutionKey(e.target.value as ResolutionKey)}
                disabled={isActive}
                className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-400 focus:outline-none"
              >
                {Object.entries(RESOLUTIONS).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-slate-400">Scan: {(timeUntilNextScan/1000).toFixed(1)}s</span>
                 <span className={`${isActive ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>● LIVE</span>
            </div>
          </div>
          
          <WebcamCapture 
            ref={webcamRef}
            onCapture={handleImageCapture} 
            onNoMotion={handleNoMotion}
            isActive={isActive} 
            intervalMs={currentInterval}
            width={RESOLUTIONS[resolutionKey].width}
            height={RESOLUTIONS[resolutionKey].height}
          />

          <button 
             onClick={() => webcamRef.current?.triggerManualCapture()}
             disabled={!isActive || isAnalyzing}
             className="w-full py-3 rounded-md bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all"
          >
             ⚡ Varredura Manual Forçada
          </button>
        </div>

        <div className="flex flex-col gap-4">
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Análise de Risco
          </div>
          
          <StatusPanel 
            result={lastResult} 
            isAnalyzing={isAnalyzing} 
          />

          <HistoryList history={history} />
          
          {lastResult?.status === DetectionStatus.PERSON_DETECTED && (
            <div className="mt-2 p-4 bg-red-600/20 border-2 border-red-600 rounded-xl animate-bounce">
              <p className="text-red-500 font-black text-center uppercase text-sm">⚠️ ALERTA DE SEGURANÇA MÁXIMO ⚠️</p>
            </div>
          )}
        </div>

      </main>

      <footer className="mt-auto pt-12 pb-4 text-center text-slate-700 text-[10px] font-bold uppercase tracking-[0.3em]">
        Sentinel AI Framework • Protocolo Gemini 3 Vision
      </footer>
    </div>
  );
};

export default App;