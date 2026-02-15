'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// OPTION 1 — Orbiting Dots
// Three dots orbiting in a circle.
// ═══════════════════════════════════════════════════════════

function Option1() {
  return (
    <ScoreBox>
      <div className="relative h-10 w-10">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-foreground/40"
            style={{
              animation: `orbit 1.8s linear infinite`,
              animationDelay: `${i * -0.6}s`,
              top: '50%',
              left: '50%',
              transformOrigin: '0 0',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(16px) rotate(0deg) translate(-50%, -50%); }
          100% { transform: rotate(360deg) translateX(16px) rotate(-360deg) translate(-50%, -50%); }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 2 — DNA Helix
// Two interweaving sine waves of dots.
// ═══════════════════════════════════════════════════════════

function Option2() {
  const dots = 8;
  return (
    <ScoreBox>
      <div className="relative h-10 w-10">
        {Array.from({ length: dots }).map((_, i) => (
          <span key={`a-${i}`}>
            <span
              className="absolute h-1.5 w-1.5 rounded-full bg-foreground/50"
              style={{
                animation: `dnaA 2s ease-in-out infinite`,
                animationDelay: `${i * (2 / dots)}s`,
                left: `${(i / (dots - 1)) * 100}%`,
                top: '50%',
              }}
            />
            <span
              className="absolute h-1.5 w-1.5 rounded-full bg-foreground/20"
              style={{
                animation: `dnaB 2s ease-in-out infinite`,
                animationDelay: `${i * (2 / dots)}s`,
                left: `${(i / (dots - 1)) * 100}%`,
                top: '50%',
              }}
            />
          </span>
        ))}
      </div>
      <style>{`
        @keyframes dnaA {
          0%, 100% { transform: translateY(-8px) scale(1); opacity: 1; }
          50% { transform: translateY(8px) scale(0.6); opacity: 0.3; }
        }
        @keyframes dnaB {
          0%, 100% { transform: translateY(8px) scale(0.6); opacity: 0.3; }
          50% { transform: translateY(-8px) scale(1); opacity: 1; }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 3 — Morphing Ring
// A ring that morphs between circle and rounded shapes.
// ═══════════════════════════════════════════════════════════

function Option3() {
  return (
    <ScoreBox>
      <div
        className="h-10 w-10 border-2 border-foreground/30"
        style={{
          animation: 'morph 3s ease-in-out infinite, spin 6s linear infinite',
        }}
      />
      <style>{`
        @keyframes morph {
          0%, 100% { border-radius: 50%; }
          25% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
          50% { border-radius: 50% 50% 30% 70% / 70% 30% 70% 30%; }
          75% { border-radius: 70% 30% 50% 50% / 30% 70% 30% 70%; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 4 — Pulse Grid
// 3x3 grid of dots that pulse in a wave pattern.
// ═══════════════════════════════════════════════════════════

function Option4() {
  return (
    <ScoreBox>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const delay = (row + col) * 0.15;
          return (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-foreground/40"
              style={{
                animation: `gridPulse 1.5s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
      <style>{`
        @keyframes gridPulse {
          0%, 100% { transform: scale(0.5); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 5 — Rotating Bars
// Bars arranged in a circle that fade in sequence.
// ═══════════════════════════════════════════════════════════

function Option5() {
  const bars = 12;
  return (
    <ScoreBox>
      <div className="relative h-10 w-10">
        {Array.from({ length: bars }).map((_, i) => {
          const angle = (i / bars) * 360;
          return (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 h-[3px] w-[10px] rounded-full bg-foreground/50"
              style={{
                transform: `rotate(${angle}deg) translateX(12px)`,
                transformOrigin: '0 50%',
                animation: `barFade 1.2s ease-in-out infinite`,
                animationDelay: `${(i / bars) * 1.2}s`,
              }}
            />
          );
        })}
      </div>
      <style>{`
        @keyframes barFade {
          0%, 100% { opacity: 0.15; }
          20% { opacity: 0.8; }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 6 — Concentric Rings
// Two rings spinning in opposite directions.
// ═══════════════════════════════════════════════════════════

function Option6() {
  return (
    <ScoreBox>
      <div className="relative h-10 w-10 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-foreground/40 border-r-foreground/40"
          style={{ animation: 'spinCW 1.5s linear infinite' }}
        />
        <div
          className="absolute inset-[6px] rounded-full border-2 border-transparent border-b-foreground/30 border-l-foreground/30"
          style={{ animation: 'spinCCW 2s linear infinite' }}
        />
        <div className="h-1.5 w-1.5 rounded-full bg-foreground/30" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes spinCW { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
        @keyframes spinCCW { 0% { transform: rotate(0); } 100% { transform: rotate(-360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 7 — Bouncing Dots
// Three dots bouncing in sequence.
// ═══════════════════════════════════════════════════════════

function Option7() {
  return (
    <ScoreBox>
      <div className="flex items-end gap-1 h-8">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-foreground/40"
            style={{
              animation: 'bounce3 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce3 {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-14px); }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 8 — Breathing Square
// A rounded square that breathes / pulses with subtle rotation.
// ═══════════════════════════════════════════════════════════

function Option8() {
  return (
    <ScoreBox>
      <div
        className="h-8 w-8 rounded-lg border-2 border-foreground/25"
        style={{
          animation: 'breathe 2.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(0.85) rotate(0deg); border-radius: 8px; opacity: 0.4; }
          50% { transform: scale(1.1) rotate(90deg); border-radius: 16px; opacity: 0.8; }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 9 — Staggered Lines
// Horizontal lines that expand and contract in a wave.
// ═══════════════════════════════════════════════════════════

function Option9() {
  return (
    <ScoreBox>
      <div className="flex flex-col items-center gap-[3px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="h-[2.5px] rounded-full bg-foreground/40"
            style={{
              animation: 'lineWave 1.8s ease-in-out infinite',
              animationDelay: `${i * 0.12}s`,
              width: '10px',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes lineWave {
          0%, 100% { width: 10px; opacity: 0.25; }
          50% { width: 28px; opacity: 0.7; }
        }
      `}</style>
    </ScoreBox>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 10 — Atomic
// A center dot with electrons orbiting on different planes.
// ═══════════════════════════════════════════════════════════

function Option10() {
  return (
    <ScoreBox>
      <div className="relative h-10 w-10 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-foreground/40" />
        {[0, 60, 120].map((angle) => (
          <div
            key={angle}
            className="absolute inset-0"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className="absolute inset-0 rounded-full border border-foreground/10"
              style={{
                animation: 'atomSpin 2.5s linear infinite',
                animationDelay: `${(angle / 360) * -2.5}s`,
                transform: 'rotateX(65deg)',
              }}
            />
            <span
              className="absolute h-1.5 w-1.5 rounded-full bg-foreground/50"
              style={{
                animation: `atomDot${angle} 2.5s linear infinite`,
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes atomSpin {
          0% { transform: rotateX(65deg) rotate(0deg); }
          100% { transform: rotateX(65deg) rotate(360deg); }
        }
        @keyframes atomDot0 {
          0% { top: 0; left: 50%; transform: translate(-50%, -50%); }
          25% { top: 50%; left: 100%; transform: translate(-50%, -50%); }
          50% { top: 100%; left: 50%; transform: translate(-50%, -50%); }
          75% { top: 50%; left: 0; transform: translate(-50%, -50%); }
          100% { top: 0; left: 50%; transform: translate(-50%, -50%); }
        }
        @keyframes atomDot60 {
          0% { top: 0; left: 50%; transform: translate(-50%, -50%); }
          25% { top: 50%; left: 100%; transform: translate(-50%, -50%); }
          50% { top: 100%; left: 50%; transform: translate(-50%, -50%); }
          75% { top: 50%; left: 0; transform: translate(-50%, -50%); }
          100% { top: 0; left: 50%; transform: translate(-50%, -50%); }
        }
        @keyframes atomDot120 {
          0% { top: 0; left: 50%; transform: translate(-50%, -50%); }
          25% { top: 50%; left: 100%; transform: translate(-50%, -50%); }
          50% { top: 100%; left: 50%; transform: translate(-50%, -50%); }
          75% { top: 50%; left: 0; transform: translate(-50%, -50%); }
          100% { top: 0; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </ScoreBox>
  );
}

// ── Shared score box shell ───────────────────────────────

function ScoreBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border p-5 min-w-[100px] min-h-[100px]">
      {children}
      <span className="text-xs font-medium uppercase tracking-wider mt-2 text-foreground/15">Scoring</span>
    </div>
  );
}

// ── Demo page ────────────────────────────────────────────

const OPTIONS = [
  { label: 'Orbiting Dots', component: Option1 },
  { label: 'DNA Helix', component: Option2 },
  { label: 'Morphing Ring', component: Option3 },
  { label: 'Pulse Grid', component: Option4 },
  { label: 'Rotating Bars', component: Option5 },
  { label: 'Concentric Rings', component: Option6 },
  { label: 'Bouncing Dots', component: Option7 },
  { label: 'Breathing Square', component: Option8 },
  { label: 'Staggered Lines', component: Option9 },
  { label: 'Atomic', component: Option10 },
];

export default function ScoreLoaderDemoPage() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-medium tracking-tight mb-1">Score Loading States</h1>
        <p className="text-sm text-foreground/40 mb-8">
          10 intricate loading animations for the score box while a test is running.
        </p>

        <div className="flex items-center gap-1 mb-8 flex-wrap">
          {OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => setActive(active === i ? null : i)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition-all',
                active === i
                  ? 'bg-foreground text-background font-medium'
                  : 'text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5',
              )}
            >
              {i + 1}. {opt.label}
            </button>
          ))}
        </div>

        {/* Show all or just selected */}
        <div className="grid grid-cols-5 gap-4">
          {(active !== null ? [OPTIONS[active]] : OPTIONS).map((opt, i) => {
            const Comp = opt.component;
            return (
              <div key={opt.label} className="flex flex-col items-center gap-2">
                <Comp />
                <span className="text-xs text-foreground/30">{active !== null ? active + 1 : i + 1}. {opt.label}</span>
              </div>
            );
          })}
        </div>

        {/* Context preview — simulated running state */}
        {active !== null && (() => {
          const Comp = OPTIONS[active].component;
          return (
            <div className="mt-12">
              <p className="text-sm text-foreground/40 mb-3">In context:</p>
              <div className="flex gap-6 items-start max-w-2xl">
                <Comp />
                <div className="flex-1 space-y-2">
                  <p className="text-[16px] text-foreground">Navigate to the Google sign-in homepage, find and click the &apos;Create account&apos; links</p>
                  <p className="text-[14px] text-foreground/50">google.com</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
