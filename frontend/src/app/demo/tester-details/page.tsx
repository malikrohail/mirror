'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  List,
  ArrowLeft,
} from 'lucide-react';

// ── Mock persona data ────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  emoji: string;
  short_description: string;
  age: number;
  occupation: string;
  tech_level: string;
  traits: string[];
  frustrations: string[];
  goals: string[];
  devices: string[];
  accessibility: string;
}

const PERSONAS: Persona[] = [
  {
    id: '1',
    name: 'Cognitive Disability User',
    emoji: '🧠',
    short_description: 'A 28-year-old with ADHD who needs clear structure, minimal distractions',
    age: 28,
    occupation: 'Graphic designer',
    tech_level: 'Intermediate',
    traits: ['Easily distracted', 'Prefers visual cues', 'Skips long text'],
    frustrations: ['Cluttered interfaces', 'Auto-playing media', 'No clear hierarchy'],
    goals: ['Complete tasks quickly', 'Find information without overwhelm'],
    devices: ['MacBook Pro', 'iPhone 15'],
    accessibility: 'Uses focus mode, reduced motion, larger text',
  },
  {
    id: '2',
    name: 'Color Blind User',
    emoji: '👁️',
    short_description: 'A 40-year-old with deuteranopia (red-green color blindness)',
    age: 40,
    occupation: 'Accountant',
    tech_level: 'Advanced',
    traits: ['Detail-oriented', 'Relies on labels over color', 'Methodical'],
    frustrations: ['Color-only indicators', 'Red/green status badges', 'Poor contrast'],
    goals: ['Distinguish UI states without color', 'Read charts accurately'],
    devices: ['Windows laptop', 'Android phone'],
    accessibility: 'Uses high contrast mode, color filters',
  },
  {
    id: '3',
    name: 'Low Vision User',
    emoji: '🔍',
    short_description: 'A 60-year-old with macular degeneration who uses high zoom',
    age: 60,
    occupation: 'Retired teacher',
    tech_level: 'Basic',
    traits: ['Patient', 'Reads everything carefully', 'Uses keyboard shortcuts'],
    frustrations: ['Small text', 'Low contrast', 'Layouts that break at zoom'],
    goals: ['Read content comfortably', 'Navigate without losing position'],
    devices: ['iPad Pro', 'Windows desktop with 32" monitor'],
    accessibility: 'Uses 200% zoom, large cursor, screen magnifier',
  },
  {
    id: '4',
    name: 'Motor Impairment User',
    emoji: '🖱️',
    short_description: 'A 50-year-old with limited fine motor control who uses keyboard',
    age: 50,
    occupation: 'Writer',
    tech_level: 'Intermediate',
    traits: ['Keyboard-first', 'Avoids drag-and-drop', 'Slow but precise'],
    frustrations: ['Tiny click targets', 'Hover-only interactions', 'No keyboard nav'],
    goals: ['Navigate entirely by keyboard', 'Complete forms without mouse'],
    devices: ['MacBook Air with external keyboard', 'Switch device'],
    accessibility: 'Uses sticky keys, voice control, tab navigation',
  },
  {
    id: '5',
    name: 'Screen Reader User',
    emoji: '🦯',
    short_description: 'A 35-year-old who is blind and navigates entirely with a screen reader',
    age: 35,
    occupation: 'Software engineer',
    tech_level: 'Expert',
    traits: ['Fast navigator', 'Uses heading hierarchy', 'Relies on ARIA'],
    frustrations: ['Missing alt text', 'Unlabeled buttons', 'Focus traps'],
    goals: ['Navigate by headings and landmarks', 'Understand images via descriptions'],
    devices: ['MacBook Pro with VoiceOver', 'iPhone with VoiceOver'],
    accessibility: 'Full screen reader, braille display, no visual output',
  },
];

// ── Shared detail content ────────────────────────────────

function PersonaDetails({ persona }: { persona: Persona }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Age</span>
          <p className="text-foreground/70">{persona.age}</p>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Occupation</span>
          <p className="text-foreground/70">{persona.occupation}</p>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Tech level</span>
          <p className="text-foreground/70">{persona.tech_level}</p>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Devices</span>
          <p className="text-foreground/70">{persona.devices.join(', ')}</p>
        </div>
      </div>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Accessibility</span>
        <p className="text-foreground/70">{persona.accessibility}</p>
      </div>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Traits</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {persona.traits.map((t) => (
            <span key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50">{t}</span>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Frustrations</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {persona.frustrations.map((f) => (
            <span key={f} className="rounded-full bg-red-500/5 px-2 py-0.5 text-xs text-red-500/60">{f}</span>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/25">Goals</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {persona.goals.map((g) => (
            <span key={g} className="rounded-full bg-green-500/5 px-2 py-0.5 text-xs text-green-500/60">{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonaRow({
  persona,
  selected,
  onClick,
  right,
}: {
  persona: Persona;
  selected?: boolean;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20',
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">
        {persona.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{persona.name}</p>
        <p className="text-xs text-muted-foreground truncate">{persona.short_description}</p>
      </div>
      {right}
      {selected && !right && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 1 — Accordion Expand
// Click a row to expand it inline with full details.
// ═══════════════════════════════════════════════════════════

function Option1() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Shell>
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
        {PERSONAS.map((p) => (
          <div key={p.id} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                  return next;
                });
              }}
              className={cn(
                'w-full flex items-center gap-2.5 p-2.5 text-left transition-all',
                selected.has(p.id) ? 'bg-primary/5' : 'hover:bg-muted/30',
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">
                {p.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.short_description}</p>
              </div>
              <div className="flex items-center gap-1">
                {selected.has(p.id) && <Check className="h-4 w-4 text-primary" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(expanded === p.id ? null : p.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/20 hover:text-foreground/50 hover:bg-muted"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded === p.id && 'rotate-180')} />
                </button>
              </div>
            </button>
            <AnimatePresence>
              {expanded === p.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-2.5 pb-3 pt-1 border-t border-border">
                    <PersonaDetails persona={p} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 2 — Slide-over Detail Panel
// List on left, clicking "view" slides a detail panel over.
// ═══════════════════════════════════════════════════════════

function Option2() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<string | null>(null);
  const viewingPersona = PERSONAS.find((p) => p.id === viewing);

  return (
    <Shell>
      <div className="relative overflow-hidden" style={{ minHeight: 380 }}>
        <AnimatePresence mode="wait">
          {!viewing ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5"
            >
              {PERSONAS.map((p) => (
                <PersonaRow
                  key={p.id}
                  persona={p}
                  selected={selected.has(p.id)}
                  onClick={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                      return next;
                    });
                  }}
                  right={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewing(p.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/20 hover:text-foreground/50 hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  }
                />
              ))}
            </motion.div>
          ) : viewingPersona && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => setViewing(null)}
                className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/60 mb-3"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to list
              </button>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-lg">{viewingPersona.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{viewingPersona.name}</p>
                  <p className="text-xs text-muted-foreground">{viewingPersona.short_description}</p>
                </div>
              </div>
              <PersonaDetails persona={viewingPersona} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 3 — Carousel Full Card
// Navigate through personas one at a time with arrows.
// Toggle between list and carousel view.
// ═══════════════════════════════════════════════════════════

function Option3() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'list' | 'carousel'>('list');
  const [cardIndex, setCardIndex] = useState(0);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setView('list')}
            className={cn('rounded-md p-1.5 transition-all', view === 'list' ? 'bg-background shadow-sm' : 'text-foreground/30')}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView('carousel')}
            className={cn('rounded-md p-1.5 transition-all', view === 'carousel' ? 'bg-background shadow-sm' : 'text-foreground/30')}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-[11px] text-foreground/25">
          {view === 'carousel' ? `${cardIndex + 1} / ${PERSONAS.length}` : `${selected.size} selected`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar"
          >
            {PERSONAS.map((p) => (
              <PersonaRow
                key={p.id}
                persona={p}
                selected={selected.has(p.id)}
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                    return next;
                  });
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-lg">{PERSONAS[cardIndex].emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{PERSONAS[cardIndex].name}</p>
                  <p className="text-xs text-muted-foreground">{PERSONAS[cardIndex].short_description}</p>
                </div>
                <button
                  onClick={() => {
                    const id = PERSONAS[cardIndex].id;
                    setSelected((prev) => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    });
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border transition-all',
                    selected.has(PERSONAS[cardIndex].id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground/20',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
              <PersonaDetails persona={PERSONAS[cardIndex]} />
            </div>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
                disabled={cardIndex === 0}
                className={cn('rounded-full p-1.5', cardIndex === 0 ? 'text-foreground/10' : 'text-foreground/40 hover:bg-muted')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1">
                {PERSONAS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCardIndex(i)}
                    className={cn('h-1.5 rounded-full transition-all', i === cardIndex ? 'w-4 bg-foreground' : 'w-1.5 bg-foreground/15')}
                  />
                ))}
              </div>
              <button
                onClick={() => setCardIndex((i) => Math.min(PERSONAS.length - 1, i + 1))}
                disabled={cardIndex === PERSONAS.length - 1}
                className={cn('rounded-full p-1.5', cardIndex === PERSONAS.length - 1 ? 'text-foreground/10' : 'text-foreground/40 hover:bg-muted')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 4 — Inline Expand (click row to expand below)
// Simpler than option 1: no separate chevron, whole row toggles.
// ═══════════════════════════════════════════════════════════

function Option4() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Shell>
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
        {PERSONAS.map((p) => {
          const isExpanded = expanded === p.id;
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                'rounded-lg border overflow-hidden transition-all',
                isSelected ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <div className="flex items-center gap-2.5 p-2.5">
                <button
                  onClick={() => setExpanded(isExpanded ? null : p.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.short_description}</p>
                  </div>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                </button>
                <button
                  onClick={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                      return next;
                    });
                  }}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border shrink-0 transition-all',
                    isSelected ? 'border-primary bg-primary text-background' : 'border-foreground/15 text-transparent hover:border-foreground/30',
                  )}
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2.5 pb-3 pt-1 border-t border-border/50">
                      <PersonaDetails persona={p} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 5 — Popover Detail
// Hover or click the info icon to see a floating popover.
// ═══════════════════════════════════════════════════════════

function Option5() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<string | null>(null);

  return (
    <Shell>
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
        {PERSONAS.map((p) => (
          <div key={p.id} className="relative">
            <PersonaRow
              persona={p}
              selected={selected.has(p.id)}
              onClick={() => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                  return next;
                });
              }}
              right={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopover(popover === p.id ? null : p.id);
                  }}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                    popover === p.id ? 'bg-foreground text-background' : 'text-foreground/20 hover:text-foreground/50 hover:bg-muted',
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              }
            />
            <AnimatePresence>
              {popover === p.id && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg p-3"
                >
                  <button
                    onClick={() => setPopover(null)}
                    className="absolute top-2 right-2 text-foreground/20 hover:text-foreground/50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <PersonaDetails persona={p} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 6 — Bottom Drawer
// Click a row to see details in a drawer at the bottom.
// ═══════════════════════════════════════════════════════════

function Option6() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<string | null>(null);
  const viewingPersona = PERSONAS.find((p) => p.id === viewing);

  return (
    <Shell>
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto no-scrollbar">
        {PERSONAS.map((p) => (
          <PersonaRow
            key={p.id}
            persona={p}
            selected={selected.has(p.id)}
            onClick={() => {
              setSelected((prev) => {
                const next = new Set(prev);
                next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                return next;
              });
            }}
            right={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewing(viewing === p.id ? null : p.id);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/20 hover:text-foreground/50 hover:bg-muted"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            }
          />
        ))}
      </div>
      <AnimatePresence>
        {viewingPersona && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{viewingPersona.emoji}</span>
                  <span className="text-sm font-medium">{viewingPersona.name}</span>
                </div>
                <button onClick={() => setViewing(null)} className="text-foreground/20 hover:text-foreground/50">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <PersonaDetails persona={viewingPersona} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 7 — Split Horizontal
// Top: list (compact). Bottom: detail of focused persona.
// ═══════════════════════════════════════════════════════════

function Option7() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState(PERSONAS[0].id);
  const focusedPersona = PERSONAS.find((p) => p.id === focused)!;

  return (
    <Shell>
      <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setFocused(p.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-all shrink-0',
              focused === p.id ? 'border-foreground/30 bg-foreground/5 font-medium' : 'border-border text-foreground/40',
            )}
          >
            <span>{p.emoji}</span>
            <span className="max-w-[80px] truncate">{p.name.split(' ')[0]}</span>
            {selected.has(p.id) && <Check className="h-3 w-3 text-primary" />}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base">{focusedPersona.emoji}</span>
            <div>
              <p className="text-sm font-medium">{focusedPersona.name}</p>
              <p className="text-xs text-muted-foreground">{focusedPersona.short_description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelected((prev) => {
                const next = new Set(prev);
                next.has(focused) ? next.delete(focused) : next.add(focused);
                return next;
              });
            }}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border transition-all',
              selected.has(focused) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground/20',
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
        <PersonaDetails persona={focusedPersona} />
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 8 — Multi-expand Accordion
// Multiple rows can be expanded simultaneously.
// ═══════════════════════════════════════════════════════════

function Option8() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Shell>
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
        {PERSONAS.map((p) => {
          const isExpanded = expanded.has(p.id);
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                'rounded-lg border overflow-hidden transition-all',
                isSelected ? 'border-primary' : 'border-border',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2.5 p-2.5 cursor-pointer transition-all',
                  isSelected && 'bg-primary/5',
                )}
                onClick={() => toggleExpand(p.id)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {!isExpanded && <p className="text-xs text-muted-foreground truncate">{p.short_description}</p>}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected((prev) => {
                      const next = new Set(prev);
                      next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                      return next;
                    });
                  }}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border shrink-0 transition-all',
                    isSelected ? 'border-primary bg-primary text-background' : 'border-foreground/15 text-transparent hover:border-foreground/30',
                  )}
                >
                  <Check className="h-3 w-3" />
                </button>
                <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform shrink-0', isExpanded && 'rotate-180')} />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2.5 pb-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mt-2 mb-3">{p.short_description}</p>
                      <PersonaDetails persona={p} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 9 — Expandable with Preview Chips
// Collapsed rows show trait chips; expand for full detail.
// ═══════════════════════════════════════════════════════════

function Option9() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Shell>
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar">
        {PERSONAS.map((p) => {
          const isExpanded = expanded === p.id;
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                'rounded-lg border overflow-hidden transition-all',
                isSelected ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : p.id)}
                className="w-full text-left p-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-base shrink-0">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected((prev) => {
                          const next = new Set(prev);
                          next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                          return next;
                        });
                      }}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border shrink-0 transition-all',
                        isSelected ? 'border-primary bg-primary text-background' : 'border-foreground/15 text-transparent hover:border-foreground/30',
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/20 transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </div>
                {!isExpanded && (
                  <div className="flex flex-wrap gap-1 mt-2 ml-[42px]">
                    {p.traits.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-foreground/40">{t}</span>
                    ))}
                  </div>
                )}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2.5 pb-3 pt-1 border-t border-border/50">
                      <PersonaDetails persona={p} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// OPTION 10 — Two-column: Compact list + sticky detail
// Left: scrollable list. Right: fixed detail of hovered row.
// (Stacked in this narrow container for demo.)
// ═══════════════════════════════════════════════════════════

function Option10() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState(PERSONAS[0].id);
  const hoveredPersona = PERSONAS.find((p) => p.id === hovered)!;

  return (
    <Shell>
      <div className="grid grid-cols-[1fr_1fr] gap-2" style={{ minHeight: 360 }}>
        <div className="space-y-1 overflow-y-auto no-scrollbar max-h-[360px]">
          {PERSONAS.map((p) => {
            const isSelected = selected.has(p.id);
            const isFocused = hovered === p.id;
            return (
              <button
                key={p.id}
                onMouseEnter={() => setHovered(p.id)}
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                    return next;
                  });
                }}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                  isFocused ? 'border-foreground/20 bg-muted/50' : 'border-transparent',
                  isSelected && 'ring-1 ring-primary',
                )}
              >
                <span className="text-sm shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                </div>
                {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="rounded-lg border border-border p-2.5 overflow-y-auto max-h-[360px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{hoveredPersona.emoji}</span>
            <p className="text-xs font-medium">{hoveredPersona.name}</p>
          </div>
          <PersonaDetails persona={hoveredPersona} />
        </div>
      </div>
    </Shell>
  );
}

// ── Shared shell ─────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-[42px] items-center justify-between px-4 border-b border-border bg-muted/30">
        <h3 className="text-[14px] uppercase text-foreground/30">Run a test</h3>
      </div>
      <div className="border-b border-border">
        <div className="flex">
          <div className="relative flex-1 py-2.5 text-[14px] text-center text-foreground/30">Describe test plan</div>
          <div className="relative flex-1 py-2.5 text-[14px] text-center text-foreground/70">
            Select testers
            <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-foreground rounded-t-full" />
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Demo page ────────────────────────────────────────────

const OPTIONS = [
  { label: 'Accordion (single)', component: Option1 },
  { label: 'Slide-over Panel', component: Option2 },
  { label: 'List + Carousel', component: Option3 },
  { label: 'Inline Expand + Checkbox', component: Option4 },
  { label: 'Popover Detail', component: Option5 },
  { label: 'Bottom Drawer', component: Option6 },
  { label: 'Chip Selector + Detail', component: Option7 },
  { label: 'Accordion (multi)', component: Option8 },
  { label: 'Expand w/ Preview Chips', component: Option9 },
  { label: 'Two-column', component: Option10 },
];

export default function TesterDetailsDemoPage() {
  const [active, setActive] = useState(0);
  const ActiveComponent = OPTIONS[active].component;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-medium tracking-tight mb-1">Tester Detail Views</h1>
        <p className="text-sm text-foreground/40 mb-6">
          10 options for viewing persona details in the &ldquo;Select testers&rdquo; step. Click personas to select, expand to see details.
        </p>

        <div className="flex items-center gap-1 mb-8 flex-wrap">
          {OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
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

        <div className="max-w-[480px]">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
