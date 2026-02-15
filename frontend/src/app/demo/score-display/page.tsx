'use client';

import { cn } from '@/lib/utils';

// ── Score data for demos ─────────────────────────────────

const SCORES = [
  { label: 'google.com', score: 95, status: 'complete' as const },
  { label: 'claude.com/pricing', score: 12, status: 'complete' as const },
  { label: 'hord.fi', score: 68, status: 'complete' as const },
  { label: 'app.hord.fi', score: null, status: 'running' as const },
  { label: 'example.com', score: 42, status: 'complete' as const },
];

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', bgLight: 'bg-emerald-100 dark:bg-emerald-900/40', ring: 'stroke-emerald-500' };
  if (score >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/40', ring: 'stroke-amber-500' };
  if (score >= 40) return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', bgLight: 'bg-orange-100 dark:bg-orange-900/40', ring: 'stroke-orange-500' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', bgLight: 'bg-red-100 dark:bg-red-900/40', ring: 'stroke-red-500' };
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Okay';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

// ── Shared row layout ────────────────────────────────────

function DemoRow({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/20">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      {right}
    </div>
  );
}

// ── Option 1: Colored pill badge ─────────────────────────

function Option1() {
  return (
    <DemoCard
      number={1}
      title="Colored Pill"
      description="Compact colored badge. Score value with semantic color. Minimal footprint, scannable."
    >
      {SCORES.map((s) => (
        <DemoRow
          key={s.label}
          label={s.label}
          right={
            s.score !== null ? (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                scoreColor(s.score).bgLight,
                scoreColor(s.score).text,
              )}>
                {s.score}
              </span>
            ) : (
              <span className="text-xs text-foreground/30">--</span>
            )
          }
        />
      ))}
    </DemoCard>
  );
}

// ── Option 2: Mini progress bar ──────────────────────────

function Option2() {
  return (
    <DemoCard
      number={2}
      title="Inline Progress Bar"
      description="Thin horizontal bar showing score as fill percentage. Instantly conveys magnitude at a glance."
    >
      {SCORES.map((s) => (
        <DemoRow
          key={s.label}
          label={s.label}
          right={
            s.score !== null ? (
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold tabular-nums', scoreColor(s.score).text)}>
                  {s.score}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className={cn('h-full rounded-full transition-all', scoreColor(s.score).bg)}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-xs text-foreground/30">--</span>
            )
          }
        />
      ))}
    </DemoCard>
  );
}

// ── Option 3: Donut ring ─────────────────────────────────

function MiniDonut({ score, size = 24 }: { score: number; size?: number }) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = scoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-foreground/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={colors.ring}
        />
      </svg>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center text-[8px] font-bold tabular-nums',
        colors.text,
      )}>
        {score}
      </span>
    </div>
  );
}

function Option3() {
  return (
    <DemoCard
      number={3}
      title="Mini Donut"
      description="Circular progress ring with score centered inside. Visual and compact. Works well at small sizes."
    >
      {SCORES.map((s) => (
        <DemoRow
          key={s.label}
          label={s.label}
          right={
            s.score !== null ? (
              <MiniDonut score={s.score} />
            ) : (
              <span className="text-xs text-foreground/30">--</span>
            )
          }
        />
      ))}
    </DemoCard>
  );
}

// ── Option 4: Letter grade ───────────────────────────────

function letterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function Option4() {
  return (
    <DemoCard
      number={4}
      title="Letter Grade"
      description="Score mapped to a letter grade (A-F). Universally understood, less precise but more memorable. Pairs with color."
    >
      {SCORES.map((s) => (
        <DemoRow
          key={s.label}
          label={s.label}
          right={
            s.score !== null ? (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                  scoreColor(s.score).bgLight,
                  scoreColor(s.score).text,
                )}>
                  {letterGrade(s.score)}
                </span>
                <span className="text-xs tabular-nums text-foreground/30">{s.score}</span>
              </div>
            ) : (
              <span className="text-xs text-foreground/30">--</span>
            )
          }
        />
      ))}
    </DemoCard>
  );
}

// ── Option 5: Score + word label ─────────────────────────

function Option5() {
  return (
    <DemoCard
      number={5}
      title="Score + Label"
      description="Numeric score paired with a semantic word (Great, Okay, Poor, Critical). Gives both precision and meaning."
    >
      {SCORES.map((s) => (
        <DemoRow
          key={s.label}
          label={s.label}
          right={
            s.score !== null ? (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-xs font-semibold tabular-nums',
                  scoreColor(s.score).text,
                )}>
                  {s.score}
                </span>
                <span className={cn(
                  'text-[10px] font-medium uppercase tracking-wide',
                  scoreColor(s.score).text,
                  'opacity-60',
                )}>
                  {scoreLabel(s.score)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-foreground/30">--</span>
            )
          }
        />
      ))}
    </DemoCard>
  );
}

// ── DemoCard wrapper ─────────────────────────────────────

function DemoCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            {number}
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed ml-[30px]">{description}</p>
      </div>
      <div className="px-5 pb-4">
        <div className="rounded-lg border border-border divide-y divide-border/50">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function ScoreDisplayDemo() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-lg font-semibold">Score Display Options</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five ways to show usability scores in test rows. Compare which feels right for Miror.
        </p>
      </div>

      <div className="grid gap-5">
        <Option1 />
        <Option2 />
        <Option3 />
        <Option4 />
        <Option5 />
      </div>
    </div>
  );
}
