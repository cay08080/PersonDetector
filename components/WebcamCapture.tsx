import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface WebcamCaptureRef {
  triggerManualCapture: () => void;
}

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  onNoMotion: () => void;
  intervalMs?: number;
  isActive: boolean;
  motionSensitivity?: number; // 0 to 100, where lower is more sensitive
  width?: number;
  height?: number;
  frameRate?: number;
}

export const WebcamCapture = forwardRef<WebcamCaptureRef, WebcamCaptureProps>(({ 
  onCapture, 
  onNoMotion,
  intervalMs = 5000,
  isActive,
  motionSensitivity = 15, // Lowered default (more sensitive)
  width = 1280,
  height = 720,
  frameRate = 30
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [motionLevel, setMotionLevel] = useState<number>(0); // Visual feedback only

  // Helper to capture current frame
  const captureCurrentFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) return null;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return null;

    // Limit capture size to 1024px width for API efficiency
    const scaleFactor = Math.min(1, 1024 / video.videoWidth);
    canvas.width = video.videoWidth * scaleFactor;
    canvas.height = video.videoHeight * scaleFactor;
    
    canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Expose manual trigger to parent
  useImperativeHandle(ref, () => ({
    triggerManualCapture: () => {
      const img = captureCurrentFrame();
      if (img) {
        onCapture(img);
      }
    }
  }));

  // Initialize Camera
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment", 
            width: { ideal: width }, 
            height: { ideal: height },
            frameRate: { ideal: frameRate }
          } 
        });
        
        currentStream = mediaStream;
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setPermissionError(null);
        prevFrameDataRef.current = null;
      } catch (err) {
        console.error("Error accessing camera:", err);
        setPermissionError("Não foi possível acessar a câmera com estas configurações.");
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setMotionLevel(0);
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, frameRate, isActive]);

  const checkForMotion = (ctx: CanvasRenderingContext2D): boolean => {
    const scaledWidth = 50;
    const scaledHeight = 50;
    
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = scaledWidth;
    diffCanvas.height = scaledHeight;
    const diffCtx = diffCanvas.getContext('2d');
    
    if (!diffCtx || !videoRef.current) return true;

    diffCtx.drawImage(videoRef.current, 0, 0, scaledWidth, scaledHeight);
    
    const currentFrame = diffCtx.getImageData(0, 0, scaledWidth, scaledHeight);
    const currentData = currentFrame.data;

    if (!prevFrameDataRef.current) {
      prevFrameDataRef.current = currentData;
      return true;
    }

    const prevData = prevFrameDataRef.current;
    let totalDiff = 0;
    let changedPixels = 0;

    for (let i = 0; i < currentData.length; i += 4) {
      const rDiff = Math.abs(currentData[i] - prevData[i]);
      const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
      const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);
      
      const pixelDiff = rDiff + gDiff + bDiff;

      if (pixelDiff > 30) {
        changedPixels++;
        totalDiff += pixelDiff;
      }
    }

    prevFrameDataRef.current = currentData;

    const totalPixels = scaledWidth * scaledHeight;
    const changePercentage = (changedPixels / totalPixels) * 100;

    setMotionLevel(changePercentage);

    const threshold = motionSensitivity / 10;
    
    return changePercentage > threshold;
  };

  const processFrame = useCallback(() => {
    if (!isActive) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const hasMotion = checkForMotion(canvasCtx);

    if (hasMotion) {
      const img = captureCurrentFrame();
      if (img) onCapture(img);
    } else {
      onNoMotion();
    }

  }, [onCapture, onNoMotion, isActive, motionSensitivity, captureCurrentFrame]);

  // Interval Logic
  useEffect(() => {
    let intervalId: any;

    if (isActive && !permissionError && stream) {
      // Small delay to let camera warmup before first auto-check
      const timeoutId = setTimeout(() => processFrame(), 1000); 
      
      intervalId = setInterval(() => {
        processFrame();
      }, intervalMs);

      return () => clearTimeout(timeoutId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, intervalMs, processFrame, permissionError, stream]);

  // Visuals
  const visualMax = 10; 
  const visualLevel = Math.min(100, (motionLevel / visualMax) * 100);
  const visualThreshold = Math.min(100, ((motionSensitivity / 10) / visualMax) * 100);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-black aspect-video group">
      {permissionError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-red-400 p-4 text-center">
          <p>{permissionError}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40 grayscale'}`}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white flex items-center gap-2 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
              {isActive ? 'MONITORANDO' : 'PAUSADO'}
            </div>
          </div>

          <div className="absolute bottom-2 right-4 text-[10px] text-white/50 font-mono">
             {width}x{height} @ {frameRate}fps
          </div>

          {isActive && (
             <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/50">
               <div 
                 className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10" 
                 style={{ left: `${visualThreshold}%` }} 
                 title="Limiar de detecção"
               />
               <div 
                 className={`h-full transition-all duration-300 ease-out ${motionLevel > (motionSensitivity/10) ? 'bg-emerald-500' : 'bg-blue-500'}`}
                 style={{ width: `${visualLevel}%` }}
               />
             </div>
          )}
        </>
      )}
    </div>
  );
});

WebcamCapture.displayName = "WebcamCapture";