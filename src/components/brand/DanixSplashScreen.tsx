import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { DanixLogoAssembly, DanixLogoAssemblyHandle } from './DanixLogoAssembly';

interface DanixSplashScreenProps {
  onFinish: () => void;
  isLoadingData?: boolean;
}

export const DanixSplashScreen: React.FC<DanixSplashScreenProps> = ({
  onFinish,
  isLoadingData = false,
}) => {
  const [animationCompleted, setAnimationCompleted] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const logoRef = useRef<DanixLogoAssemblyHandle>(null);
  const finishTriggeredRef = useRef<boolean>(false);

  const handleComplete = () => {
    setAnimationCompleted(true);
  };

  const handleSkip = () => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 250);
  };

  // When animation completes and data is not loading, proceed smoothly
  useEffect(() => {
    if (animationCompleted && !isLoadingData && !finishTriggeredRef.current) {
      finishTriggeredRef.current = true;
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        onFinish();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [animationCompleted, isLoadingData, onFinish]);

  // Safety fallback: maximum 4.2s splash duration so user is never stalled
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!isLoadingData && !finishTriggeredRef.current) {
        handleSkip();
      }
    }, 4200);
    return () => clearTimeout(safetyTimer);
  }, [isLoadingData]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-slate-950 text-white select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient Radial Brand Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(253,117,1,0.18),transparent_65%)]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

      {/* Skip Button Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={handleSkip}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md hover:bg-white/15 hover:text-white active:scale-95 transition-all shadow-lg"
          title="Skip Intro to POS"
        >
          <span>Skip Intro</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Main Assembly Stage */}
      <div className="relative z-10 flex flex-col items-center px-4 w-full max-w-md sm:max-w-lg">
        {/* Subtle Top Pill */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-[11px] font-semibold text-brand-400 tracking-wider uppercase">
          <Sparkles className="h-3 w-3 animate-pulse text-brand-400" />
          <span>Starting Danix POS</span>
        </div>

        {/* Cinematic Logo Assembly */}
        <div className="w-full max-w-[340px] sm:max-w-[420px] py-2">
          <DanixLogoAssembly
            ref={logoRef}
            width="100%"
            autoPlay={true}
            speed={1.05}
            theme="dark"
            showText={true}
            onComplete={handleComplete}
          />
        </div>

        {/* Status indicator / Bottom text */}
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          {isLoadingData ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium animate-pulse">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
              <span>Connecting to database & sync...</span>
            </div>
          ) : animationCompleted ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>System Ready • Launching Terminal</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 tracking-wider">
              Danix.lk • Galle, Sri Lanka • Official POS Management
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
