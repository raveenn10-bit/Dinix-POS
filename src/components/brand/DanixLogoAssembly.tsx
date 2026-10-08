import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import gsap from 'gsap';
import {
  LOGO_COLORS,
  LOGO_VIEWBOX,
  HANDLE_STROKE_PATH,
  BAG_PATH,
  CURSOR_PATH,
} from './logoPaths';

export interface DanixLogoAssemblyHandle {
  play: () => void;
  pause: () => void;
  restart: () => void;
  seek: (progress: number) => void;
  getProgress: () => number;
}

export interface DanixLogoAssemblyProps {
  width?: number | string;
  height?: number | string;
  autoPlay?: boolean;
  speed?: number;
  reducedMotion?: boolean;
  showText?: boolean;
  compact?: boolean;
  theme?: 'dark' | 'light' | 'original';
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
  onStepChange?: (step: number) => void;
  className?: string;
}

// 3 Exact Geometric Pieces for Orange Bag Assembly (no clip-path clipping bugs)
const BAG_PIECE_TOP_LEFT =
  'M 357.5 300.0 L 520 297.5 L 485 465 L 366 462.5 L 342 447.5 L 325 411.5 L 325 333.5 L 343.5 309.5 Z';

const BAG_PIECE_RIGHT =
  'M 520 297.5 L 633.5 299 L 662 334 L 671 430 L 682 544 L 687.5 604 L 677 634 L 648 649 L 550 649 L 485 580 L 485 465 Z';

const BAG_PIECE_BOTTOM_NOTCH =
  'M 366 462.5 L 485 465 L 485 580 L 550 649 L 516 639.5 L 491.5 613.5 L 483 583.5 L 486 559.5 L 497.5 523.5 L 499 493.5 L 480 464 L 438 453 L 396 465.5 Z';

export const DanixLogoAssembly = forwardRef<DanixLogoAssemblyHandle, DanixLogoAssemblyProps>(
  (
    {
      width = '100%',
      height = 'auto',
      autoPlay = true,
      speed = 1.0,
      reducedMotion = false,
      showText = true,
      compact = false,
      theme = 'dark',
      onComplete,
      onUpdate,
      onStepChange,
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    // Callbacks stored in refs to avoid re-triggering useEffect
    const onUpdateRef = useRef(onUpdate);
    const onCompleteRef = useRef(onComplete);
    const onStepChangeRef = useRef(onStepChange);

    useEffect(() => {
      onUpdateRef.current = onUpdate;
      onCompleteRef.current = onComplete;
      onStepChangeRef.current = onStepChange;
    });

    // SVG Element References
    const logoMarkGroupRef = useRef<SVGGElement>(null);
    const handleRef = useRef<SVGPathElement>(null);
    const bagGroupRef = useRef<SVGGElement>(null);
    const bagPieceTLRef = useRef<SVGPathElement>(null);
    const bagPieceRRef = useRef<SVGPathElement>(null);
    const bagPieceBRef = useRef<SVGPathElement>(null);
    const unifiedBagRef = useRef<SVGPathElement>(null);
    const cursorRef = useRef<SVGGElement>(null);
    const cursorLockRingRef = useRef<SVGCircleElement>(null);
    const lightSweepRectRef = useRef<SVGRectElement>(null);
    const textGroupRef = useRef<SVGGElement>(null);
    const subtitleRef = useRef<SVGTextElement>(null);

    // Theme Colors
    const isDark = theme === 'dark';
    const isOriginal = theme === 'original';

    // Handle & Cursor color (Vibrant blue on dark background like user's spec diagram, Deep Navy on light)
    const handleColor = isOriginal
      ? LOGO_COLORS.navy
      : isDark
      ? '#38bdf8' // Electric Sky Blue for high-contrast on dark backgrounds (as in diagram 02)
      : LOGO_COLORS.navy;

    const cursorColor = isOriginal
      ? LOGO_COLORS.navy
      : isDark
      ? '#38bdf8'
      : LOGO_COLORS.navy;

    const bagColor = LOGO_COLORS.orange;

    const textDanixColor = isDark ? '#ffffff' : LOGO_COLORS.orange;
    const textPosColor = isDark ? LOGO_COLORS.orange : LOGO_COLORS.navy;
    const subtitleColor = isDark ? '#94a3b8' : '#475569';

    // Expose imperative API to parent
    useImperativeHandle(ref, () => ({
      play: () => {
        timelineRef.current?.play();
      },
      pause: () => {
        timelineRef.current?.pause();
      },
      restart: () => {
        timelineRef.current?.restart();
      },
      seek: (progress: number) => {
        timelineRef.current?.progress(progress);
      },
      getProgress: () => {
        return timelineRef.current?.progress() || 0;
      },
    }));

    useEffect(() => {
      const handle = handleRef.current;
      const bagPieceTL = bagPieceTLRef.current;
      const bagPieceR = bagPieceRRef.current;
      const bagPieceB = bagPieceBRef.current;
      const unifiedBag = unifiedBagRef.current;
      const cursor = cursorRef.current;
      const lockRing = cursorLockRingRef.current;
      const lightSweep = lightSweepRectRef.current;
      const textLetters = containerRef.current?.querySelectorAll('.danix-char');
      const subtitle = subtitleRef.current;

      if (!handle || !bagPieceTL || !bagPieceR || !bagPieceB || !unifiedBag || !cursor) {
        return;
      }

      // Kill any previous timeline
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      // Master Timeline
      const tl = gsap.timeline({
        paused: !autoPlay,
        onUpdate: () => {
          onUpdateRef.current?.(tl.progress());
        },
        onComplete: () => {
          onCompleteRef.current?.();
        },
      });

      tl.timeScale(speed);
      timelineRef.current = tl;

      // ======================================================================
      // REDUCED MOTION TIMELINE (ACCESSIBLE, GENTLE CROSSFADE)
      // ======================================================================
      if (reducedMotion) {
        gsap.set(handle, { strokeDashoffset: 0, opacity: 0 });
        gsap.set([bagPieceTL, bagPieceR, bagPieceB], { display: 'none' });
        gsap.set(unifiedBag, { opacity: 0 });
        gsap.set(cursor, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 });
        if (textLetters) gsap.set(textLetters, { opacity: 0, y: 0, scale: 1 });
        if (subtitle) gsap.set(subtitle, { opacity: 0, y: 0 });

        tl.call(() => onStepChangeRef.current?.(2), [], 0);
        tl.to(handle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);

        tl.call(() => onStepChangeRef.current?.(3), [], 0.3);
        tl.to(unifiedBag, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.3);

        tl.call(() => onStepChangeRef.current?.(4), [], 0.6);
        tl.to(cursor, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.6);

        if (showText && textLetters && textLetters.length > 0) {
          tl.call(() => onStepChangeRef.current?.(6), [], 0.9);
          tl.to(textLetters, { opacity: 1, stagger: 0.03, duration: 0.4 }, 0.9);
        }
        if (showText && subtitle) {
          tl.to(subtitle, { opacity: 1, duration: 0.4 }, 1.1);
        }

        return () => {
          tl.kill();
        };
      }

      // ======================================================================
      // FULL CINEMATIC TIMELINE (2.5s – 2.85s)
      // ======================================================================

      // 1. Initial State Setup
      const handleLength = 320;
      gsap.set(handle, {
        strokeDasharray: handleLength,
        strokeDashoffset: handleLength,
        opacity: 1,
      });

      // Orange bag pieces initial scatter positions
      gsap.set(bagPieceTL, {
        x: -120,
        y: -90,
        rotation: -22,
        scale: 0.65,
        opacity: 0,
        transformOrigin: '400px 360px',
      });

      gsap.set(bagPieceR, {
        x: 130,
        y: -50,
        rotation: 18,
        scale: 0.68,
        opacity: 0,
        transformOrigin: '600px 450px',
      });

      gsap.set(bagPieceB, {
        x: -30,
        y: 130,
        rotation: -14,
        scale: 0.6,
        opacity: 0,
        transformOrigin: '450px 520px',
      });

      gsap.set(unifiedBag, { opacity: 0 });

      // Navy cursor initial state (off-stage lower-left)
      gsap.set(cursor, {
        x: -240,
        y: 220,
        rotation: -38,
        scale: 0.4,
        opacity: 0,
        transformOrigin: '380px 580px',
      });

      // Cursor lock impact ring
      if (lockRing) {
        gsap.set(lockRing, {
          scale: 0,
          opacity: 0,
          transformOrigin: '444px 485px',
        });
      }

      // Light sweep
      if (lightSweep) {
        gsap.set(lightSweep, {
          x: -500,
          opacity: 0,
        });
      }

      // Text elements
      if (textLetters && textLetters.length > 0) {
        gsap.set(textLetters, {
          y: 28,
          scale: 0.68,
          opacity: 0,
          transformOrigin: 'bottom center',
        });
      }
      if (subtitle) {
        gsap.set(subtitle, {
          y: 14,
          opacity: 0,
        });
      }

      // ----------------------------------------------------------------------
      // STEP 1 & 2: Navy Handle Draws Itself (0.0s - 0.75s)
      // ----------------------------------------------------------------------
      tl.call(() => onStepChangeRef.current?.(1), [], 0);

      tl.addLabel('step2', 0.08);
      tl.call(() => onStepChangeRef.current?.(2), [], 0.08);
      tl.to(
        handle,
        {
          strokeDashoffset: 0,
          duration: 0.72,
          ease: 'power2.inOut',
        },
        'step2'
      );

      // ----------------------------------------------------------------------
      // STEP 3: Orange Bag Pieces Fly In & Join Precisely (0.5s - 1.35s)
      // ----------------------------------------------------------------------
      tl.addLabel('step3', 0.5);
      tl.call(() => onStepChangeRef.current?.(3), [], 0.5);

      // Piece Top-Left
      tl.to(
        bagPieceTL,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 0.75,
          ease: 'back.out(1.4)',
        },
        'step3+=0.04'
      );

      // Piece Right
      tl.to(
        bagPieceR,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 0.75,
          ease: 'back.out(1.4)',
        },
        'step3+=0.1'
      );

      // Piece Bottom
      tl.to(
        bagPieceB,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 0.75,
          ease: 'back.out(1.4)',
        },
        'step3+=0.16'
      );

      // Seamless fusion into unified solid bag silhouette at precision join moment
      tl.to(
        unifiedBag,
        {
          opacity: 1,
          duration: 0.08,
          ease: 'power1.out',
        },
        'step3+=0.72'
      );
      tl.set([bagPieceTL, bagPieceR, bagPieceB], { opacity: 0 }, 'step3+=0.74');

      // Subtle assembly settle micro-bounce on whole bag
      if (bagGroupRef.current) {
        tl.to(
          bagGroupRef.current,
          {
            scale: 1.03,
            duration: 0.12,
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut',
            transformOrigin: '500px 500px',
          },
          'step3+=0.74'
        );
      }

      // ----------------------------------------------------------------------
      // STEP 4: Navy Cursor Moves Along Curved Arc & Snaps In (1.2s - 1.85s)
      // ----------------------------------------------------------------------
      tl.addLabel('step4', 1.18);
      tl.call(() => onStepChangeRef.current?.(4), [], 1.18);

      // Fade in cursor
      tl.to(
        cursor,
        {
          opacity: 1,
          duration: 0.16,
          ease: 'power1.out',
        },
        'step4'
      );

      // Curved glide trajectory: Waypoint 1 (Arc apex)
      tl.to(
        cursor,
        {
          x: -75,
          y: 65,
          rotation: -16,
          scale: 0.88,
          duration: 0.32,
          ease: 'power1.inOut',
        },
        'step4'
      );

      // Curved glide trajectory: Waypoint 2 (Snapping lock into cutout)
      tl.to(
        cursor,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 0.38,
          ease: 'back.out(1.9)',
        },
        'step4+=0.32'
      );

      // Lock impact shockwave ring
      if (lockRing) {
        tl.to(
          lockRing,
          {
            scale: 2.4,
            opacity: 0.9,
            duration: 0.06,
            ease: 'power1.out',
          },
          'step4+=0.68'
        ).to(
          lockRing,
          {
            scale: 4.8,
            opacity: 0,
            duration: 0.35,
            ease: 'power2.out',
          },
          'step4+=0.74'
        );
      }

      // Mechanical lock recoil on whole mark
      if (logoMarkGroupRef.current) {
        tl.to(
          logoMarkGroupRef.current,
          {
            scale: 0.985,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut',
            transformOrigin: '500px 500px',
          },
          'step4+=0.7'
        );
      }

      // ----------------------------------------------------------------------
      // STEP 5: Diagonal Light Sweep / Metallic Shine (1.85s - 2.35s)
      // ----------------------------------------------------------------------
      tl.addLabel('step5', 1.85);
      tl.call(() => onStepChangeRef.current?.(5), [], 1.85);

      if (lightSweep) {
        tl.to(
          lightSweep,
          {
            opacity: 0.9,
            duration: 0.08,
          },
          'step5'
        ).to(
          lightSweep,
          {
            x: 750,
            duration: 0.52,
            ease: 'power2.inOut',
          },
          'step5'
        ).to(
          lightSweep,
          {
            opacity: 0,
            duration: 0.12,
          },
          'step5+=0.44'
        );
      }

      // ----------------------------------------------------------------------
      // STEP 6: Staggered DANIX POS Text & Subtitle Reveal (2.1s - 2.85s)
      // ----------------------------------------------------------------------
      if (showText && textLetters && textLetters.length > 0) {
        tl.addLabel('step6', 2.08);
        tl.call(() => onStepChangeRef.current?.(6), [], 2.08);

        tl.to(
          textLetters,
          {
            y: 0,
            scale: 1,
            opacity: 1,
            stagger: 0.045,
            duration: 0.45,
            ease: 'back.out(1.75)',
          },
          'step6'
        );
      }

      if (showText && subtitle) {
        tl.to(
          subtitle,
          {
            y: 0,
            opacity: 0.9,
            duration: 0.4,
            ease: 'power2.out',
          },
          'step6+=0.28'
        );
      }

      return () => {
        tl.kill();
      };
    }, [autoPlay, speed, reducedMotion, showText, isDark, isOriginal]);

    return (
      <div
        ref={containerRef}
        className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
        style={{ width, height }}
      >
        <svg
          viewBox={compact ? '210 160 560 540' : LOGO_VIEWBOX}
          className="w-full h-auto overflow-visible"
          style={{ background: 'transparent' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Linear Gradient for Light Sweep */}
            <linearGradient id="danixLightSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Mask for Light Sweep covering entire assembled mark */}
            <mask id="danixMarkMask">
              <g fill="#ffffff">
                <path
                  d={HANDLE_STROKE_PATH}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="23"
                  strokeLinecap="round"
                />
                <path d={BAG_PATH} fill="#ffffff" />
                <path d={CURSOR_PATH} fill="#ffffff" />
              </g>
            </mask>

            {/* Subtle Drop Shadow for depth */}
            <filter id="markShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="12"
                floodColor="#001833"
                floodOpacity="0.22"
              />
            </filter>
          </defs>

          {/* MASTER LOGO MARK GROUP */}
          <g ref={logoMarkGroupRef} className="logo-mark-group" filter="url(#markShadow)">
            {/* 1. NAVY / ELECTRIC BLUE BAG HANDLE */}
            <path
              ref={handleRef}
              d={HANDLE_STROKE_PATH}
              fill="none"
              stroke={handleColor}
              strokeWidth="23"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 2. ORANGE BAG BODY */}
            <g ref={bagGroupRef}>
              {/* Fly-in Part 1: Top-Left Shoulder */}
              <path
                ref={bagPieceTLRef}
                d={BAG_PIECE_TOP_LEFT}
                fill={bagColor}
              />

              {/* Fly-in Part 2: Right Body */}
              <path
                ref={bagPieceRRef}
                d={BAG_PIECE_RIGHT}
                fill={bagColor}
              />

              {/* Fly-in Part 3: Bottom Notch */}
              <path
                ref={bagPieceBRef}
                d={BAG_PIECE_BOTTOM_NOTCH}
                fill={bagColor}
              />

              {/* Unified Pristine Bag (fuses together upon assembly) */}
              <path
                ref={unifiedBagRef}
                d={BAG_PATH}
                fill={bagColor}
              />
            </g>

            {/* 3. NAVY / ELECTRIC BLUE CURSOR ARROW */}
            <g ref={cursorRef}>
              <path d={CURSOR_PATH} fill={cursorColor} />
            </g>

            {/* 4. LOCK IMPACT SHOCKWAVE RING */}
            <circle
              ref={cursorLockRingRef}
              cx="444"
              cy="485"
              r="12"
              fill="none"
              stroke={cursorColor}
              strokeWidth="3.5"
            />

            {/* 5. LIGHT SWEEP SHINE BEAM (Masked to the logo geometry) */}
            <g mask="url(#danixMarkMask)">
              <rect
                ref={lightSweepRectRef}
                x="200"
                y="180"
                width="140"
                height="620"
                transform="rotate(-32 500 500)"
                fill="url(#danixLightSweepGrad)"
                pointerEvents="none"
              />
            </g>
          </g>

          {/* 6. TYPOGRAPHY: DANIX POS + SUBTITLE */}
          {showText && (
            <g ref={textGroupRef} className="logo-text-group">
              {/* DANIX + POS */}
              <text
                x="500"
                y="775"
                textAnchor="middle"
                className="font-sans font-extrabold"
                style={{
                  fontSize: '76px',
                  fontWeight: 900,
                  letterSpacing: '2px',
                }}
              >
                {/* D A N I X */}
                {'DANIX'.split('').map((char, i) => (
                  <tspan
                    key={`danix-${i}`}
                    className="danix-char"
                    fill={textDanixColor}
                  >
                    {char}
                  </tspan>
                ))}

                {/* Space */}
                <tspan> </tspan>

                {/* P O S */}
                {'POS'.split('').map((char, i) => (
                  <tspan
                    key={`pos-${i}`}
                    className="danix-char"
                    fill={textPosColor}
                  >
                    {char}
                  </tspan>
                ))}
              </text>

              {/* Subtitle: ONLINE MANAGEMENT */}
              <text
                ref={subtitleRef}
                x="500"
                y="820"
                textAnchor="middle"
                fill={subtitleColor}
                className="font-sans font-semibold uppercase"
                style={{
                  fontSize: '20px',
                  letterSpacing: '9px',
                }}
              >
                ONLINE MANAGEMENT
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  }
);

DanixLogoAssembly.displayName = 'DanixLogoAssembly';
