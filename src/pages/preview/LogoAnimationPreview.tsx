import React, { useState, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Sparkles,
  ArrowLeft,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  DanixLogoAssembly,
  DanixLogoAssemblyHandle,
} from '@/components/brand/DanixLogoAssembly';

type BgTheme = 'navy' | 'black' | 'white' | 'checkerboard';
type ColorMode = 'adaptive' | 'original';

export const LogoAnimationPreview: React.FC = () => {
  const logoRef = useRef<DanixLogoAssemblyHandle>(null);

  // Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [showText, setShowText] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [bgTheme, setBgTheme] = useState<BgTheme>('navy');
  const [colorMode, setColorMode] = useState<ColorMode>('adaptive');
  const [replayKey, setReplayKey] = useState<number>(0);

  // Throttled progress update to prevent React 60fps re-render choking
  const lastProgressUpdateRef = useRef<number>(0);
  const handleProgressUpdate = useCallback((prog: number) => {
    const now = performance.now();
    if (now - lastProgressUpdateRef.current > 50 || prog >= 1) {
      lastProgressUpdateRef.current = now;
      setProgress(prog);
    }
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleReplay = () => {
    setIsPlaying(true);
    setProgress(0);
    setCurrentStep(1);
    setReplayKey((prev) => prev + 1);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      logoRef.current?.pause();
      setIsPlaying(false);
    } else {
      logoRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (newProgress: number) => {
    setProgress(newProgress);
    logoRef.current?.seek(newProgress);
  };

  const handleJumpToStep = (stepNum: number) => {
    const stepProgressMap: Record<number, number> = {
      1: 0.0,
      2: 0.05,
      3: 0.22,
      4: 0.48,
      5: 0.68,
      6: 0.82,
    };
    const targetProgress = stepProgressMap[stepNum] ?? 0;
    setCurrentStep(stepNum);
    handleSeek(targetProgress);
  };

  // Determine logo theme based on background and colorMode
  const getLogoTheme = (): 'dark' | 'light' | 'original' => {
    if (colorMode === 'original') return 'original';
    if (bgTheme === 'white') return 'light';
    return 'dark'; // High-contrast electric blue on dark navy / black as shown in specification diagram
  };

  const getStageBgClass = () => {
    switch (bgTheme) {
      case 'navy':
        return 'bg-gradient-to-br from-navy-950 via-navy-900 to-[#07162c] text-white';
      case 'black':
        return 'bg-gradient-to-b from-[#090d16] to-[#04060a] text-white';
      case 'white':
        return 'bg-white text-slate-900 border border-slate-200';
      case 'checkerboard':
        return 'bg-checkerboard text-white';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 sm:px-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Return to POS Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to POS</span>
          </a>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
              DANIX POS <span className="text-brand-500 font-semibold">— Cinematic Logo Assembly</span>
            </h1>
          </div>
        </div>

        {/* Status & Replay Button */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-400">
            <Sparkles className="h-3 w-3" />
            Standalone Studio (POS Unmodified)
          </span>
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Info Banner */}
        <div className="w-full flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Safe Preview Environment:</strong> This preview is isolated at{' '}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-amber-300">/logo-preview</code>. No changes will be applied to your live POS app until you approve.
            </span>
          </div>
          <span className="text-[11px] text-amber-300/80 hidden md:inline">Duration: 2.8s • 60 FPS GSAP 3</span>
        </div>

        {/* CINEMATIC PRESENTATION STAGE */}
        <div
          className={`relative w-full rounded-3xl transition-colors duration-300 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-8 sm:p-14 min-h-[460px] sm:min-h-[520px] ${getStageBgClass()}`}
          style={
            bgTheme === 'checkerboard'
              ? {
                  backgroundImage: `
                    linear-gradient(45deg, #182030 25%, transparent 25%),
                    linear-gradient(-45deg, #182030 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #182030 75%),
                    linear-gradient(-45deg, transparent 75%, #182030 75%)
                  `,
                  backgroundSize: '24px 24px',
                  backgroundColor: '#0c121e',
                }
              : {}
          }
        >
          {/* Subtle Ambient Radial Lighting for Cinematic Depth */}
          {bgTheme !== 'white' && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(253,117,1,0.12),transparent_70%)]" />
          )}

          {/* Canvas & Color Switcher Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
            {/* Color Mode Switcher */}
            <div className="flex items-center rounded-2xl bg-black/60 p-1 backdrop-blur-md border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setColorMode('adaptive')}
                title="Adaptive High-Contrast (Matches User Diagram)"
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  colorMode === 'adaptive'
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Diagram Colors
              </button>
              <button
                type="button"
                onClick={() => setColorMode('original')}
                title="Exact Original JPEG Colors (Deep Navy #023969)"
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  colorMode === 'original'
                    ? 'bg-navy-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Exact JPEG Navy
              </button>
            </div>

            {/* Background Switcher */}
            <div className="flex items-center gap-1 rounded-2xl bg-black/60 p-1 backdrop-blur-md border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setBgTheme('navy')}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  bgTheme === 'navy'
                    ? 'bg-navy-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                POS Navy
              </button>
              <button
                type="button"
                onClick={() => setBgTheme('black')}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  bgTheme === 'black'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Black
              </button>
              <button
                type="button"
                onClick={() => setBgTheme('white')}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  bgTheme === 'white'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => setBgTheme('checkerboard')}
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                  bgTheme === 'checkerboard'
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Transparent
              </button>
            </div>
          </div>

          {/* Current Step Badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-2xl bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
            <span>
              Stage 0{currentStep}:{' '}
              {currentStep === 1 && 'Initial State'}
              {currentStep === 2 && 'Handle Drawing'}
              {currentStep === 3 && 'Bag Parts Joining'}
              {currentStep === 4 && 'Cursor Locking In'}
              {currentStep === 5 && 'Light Sweep Shine'}
              {currentStep === 6 && 'Typography Reveal'}
            </span>
          </div>

          {/* LOGO ASSEMBLY ANIMATION COMPONENT */}
          <div className="relative z-10 w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] py-4">
            <DanixLogoAssembly
              key={replayKey}
              ref={logoRef}
              width="100%"
              autoPlay={isPlaying}
              speed={speed}
              reducedMotion={reducedMotion}
              showText={showText}
              theme={getLogoTheme()}
              onUpdate={handleProgressUpdate}
              onStepChange={handleStepChange}
              onComplete={() => {
                setIsPlaying(false);
                setProgress(1);
                setCurrentStep(6);
              }}
            />
          </div>

          {/* Quick Replay Center Overlay Button when finished */}
          {!isPlaying && progress >= 0.98 && (
            <div className="absolute bottom-6 z-20 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={handleReplay}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-500/90 hover:bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-brand-500/40 backdrop-blur-md transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Replay Cinematic Animation</span>
              </button>
            </div>
          )}
        </div>

        {/* TIMELINE CONTROLS & SCRUBBER */}
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-md space-y-4">
          {/* Scrubber Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brand-400" />
                Timeline Scrubber
              </span>
              <span className="font-mono text-brand-400 font-bold">
                {(progress * 2.85).toFixed(2)}s / 2.85s ({Math.round(progress * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={progress}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 accent-brand-500 cursor-pointer"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
            {/* Playback Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReplay}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-brand-500 active:scale-95 transition-all"
                title="Restart Animation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
              </button>
            </div>

            {/* Speed Buttons */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <span className="px-2 text-[10px] text-slate-400 font-semibold uppercase">Speed:</span>
              {[0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    speed === s
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Toggles: Reduced Motion & Show Text */}
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-500 h-4 w-4"
                />
                <span>Reduced Motion</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showText}
                  onChange={(e) => setShowText(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-500 h-4 w-4"
                />
                <span>Show Text</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4 STAGES DIAGRAM (MATCHING USER'S SPECIFICATION PHOTO) */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-500" />
              Stage Breakdown (Click any stage to scrub):
            </h3>
            <span className="text-[11px] text-slate-500">
              Parts appear → Assemble → Complete logo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Stage 01 */}
            <button
              type="button"
              onClick={() => handleJumpToStep(1)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                currentStep === 1
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="h-10 w-8 rounded-lg border border-dashed border-slate-600 mb-2 flex items-center justify-center text-[10px] text-slate-500">
                01
              </div>
              <span className="text-xs font-bold">01. Canvas Ready</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Empty canvas</span>
            </button>

            {/* Stage 02 */}
            <button
              type="button"
              onClick={() => handleJumpToStep(2)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                currentStep === 2
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="h-10 w-8 rounded-lg border border-white/20 mb-2 flex items-center justify-center">
                <div className="h-5 w-4 rounded-t-full border-t-2 border-x-2 border-sky-400" />
              </div>
              <span className="text-xs font-bold">02. Handle Drawing</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Navy handle draws</span>
            </button>

            {/* Stage 03 */}
            <button
              type="button"
              onClick={() => handleJumpToStep(3)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                currentStep === 3
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="h-10 w-8 rounded-lg border border-white/20 mb-2 flex items-center justify-center">
                <div className="h-5 w-5 bg-brand-500 rounded-sm" />
              </div>
              <span className="text-xs font-bold">03. Bag Assembly</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Pieces fly in & join</span>
            </button>

            {/* Stage 04 */}
            <button
              type="button"
              onClick={() => handleJumpToStep(4)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                currentStep >= 4
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="h-10 w-8 rounded-lg border border-white/20 mb-2 flex items-center justify-center">
                <div className="flex items-center">
                  <div className="h-4 w-4 bg-brand-500 rounded-sm" />
                  <span className="text-[9px] text-sky-400 ml-0.5">▲</span>
                </div>
              </div>
              <span className="text-xs font-bold">04. Cursor Lock-In</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Arc flight & lock</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
