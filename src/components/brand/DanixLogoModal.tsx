import React, { useRef } from 'react';
import { X, RotateCcw, Sparkles } from 'lucide-react';
import { DanixLogoAssembly, DanixLogoAssemblyHandle } from './DanixLogoAssembly';

interface DanixLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DanixLogoModal: React.FC<DanixLogoModalProps> = ({ isOpen, onClose }) => {
  const logoRef = useRef<DanixLogoAssemblyHandle>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-navy-900 via-navy-950 to-slate-950 p-6 sm:p-10 shadow-2xl overflow-hidden text-white flex flex-col items-center">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(253,117,1,0.18),transparent_70%)]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Close Modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Tag */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>DANIX POS Official Cinematic Intro</span>
        </div>

        {/* Cinematic Logo Assembly Component */}
        <div className="relative z-10 w-full max-w-[360px] sm:max-w-[420px] py-4">
          <DanixLogoAssembly
            ref={logoRef}
            width="100%"
            autoPlay={true}
            speed={1.0}
            theme="dark"
            showText={true}
          />
        </div>

        {/* Bottom Actions */}
        <div className="relative z-10 flex items-center gap-3 mt-6 pt-4 border-t border-white/10 w-full justify-between">
          <span className="text-[11px] text-slate-400">
            Danix.lk • Trusted Online Shopping & POS Management
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => logoRef.current?.restart()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
