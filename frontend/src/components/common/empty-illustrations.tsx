/**
 * CSS-only illustrations for empty states.
 * Each renders a small decorative graphic that hints at the missing content.
 */

/** Stacked browser windows with a bar chart — for "no tests" */
export function TestsIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[140px]">
      <div className="absolute left-2 top-0 h-[80px] w-[110px] -rotate-6 rounded-lg border border-foreground/[0.06] bg-foreground/[0.03]" />
      <div className="absolute left-5 top-2 h-[84px] w-[116px] rounded-lg border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        <div className="flex items-center gap-1 border-b border-foreground/[0.06] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="ml-2 h-1.5 w-10 rounded-full bg-foreground/[0.06]" />
        </div>
        <div className="flex items-end justify-center gap-1.5 px-3 pt-3 pb-2">
          <div className="h-5 w-3 rounded-sm bg-foreground/[0.06]" />
          <div className="h-8 w-3 rounded-sm bg-foreground/[0.10]" />
          <div className="h-6 w-3 rounded-sm bg-foreground/[0.06]" />
          <div className="h-10 w-3 rounded-sm bg-foreground/[0.12]" />
          <div className="h-4 w-3 rounded-sm bg-foreground/[0.06]" />
        </div>
      </div>
    </div>
  );
}

/** Stacked persona cards with avatar + text skeletons — for "no team" */
export function TeamIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[150px]">
      <div className="absolute left-1 top-0 flex h-[42px] w-[130px] items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-2.5">
        <div className="h-6 w-6 shrink-0 rounded-full bg-foreground/[0.06]" />
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-14 rounded-full bg-foreground/[0.06]" />
          <div className="h-1.5 w-9 rounded-full bg-foreground/[0.04]" />
        </div>
      </div>
      <div className="absolute left-4 top-6 flex h-[46px] w-[134px] items-center gap-2.5 rounded-lg border border-foreground/[0.08] bg-white px-3 shadow-sm dark:bg-foreground/[0.05]">
        <div className="h-7 w-7 shrink-0 rounded-full bg-foreground/[0.08]" />
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-16 rounded-full bg-foreground/[0.10]" />
          <div className="h-1.5 w-10 rounded-full bg-foreground/[0.06]" />
        </div>
      </div>
      <div className="absolute left-7 top-[52px] flex h-[42px] w-[130px] items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-2.5">
        <div className="h-6 w-6 shrink-0 rounded-full bg-foreground/[0.06]" />
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-12 rounded-full bg-foreground/[0.06]" />
          <div className="h-1.5 w-8 rounded-full bg-foreground/[0.04]" />
        </div>
      </div>
    </div>
  );
}

/** Calendar with date grid — for "no schedules" */
export function ScheduleIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[120px]">
      <div className="absolute left-1 top-1 h-[88px] w-[100px] rotate-3 rounded-lg border border-foreground/[0.06] bg-foreground/[0.03]" />
      <div className="absolute left-3 top-0 h-[90px] w-[104px] rounded-lg border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        {/* Month header */}
        <div className="flex items-center justify-between border-b border-foreground/[0.06] px-2.5 py-1.5">
          <span className="h-1.5 w-10 rounded-full bg-foreground/[0.10]" />
          <span className="h-1.5 w-4 rounded-full bg-foreground/[0.06]" />
        </div>
        {/* Date grid */}
        <div className="grid grid-cols-7 gap-[3px] px-2 pt-2 pb-1.5">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className={`h-[6px] w-[6px] rounded-[2px] ${
                i === 9 ? 'bg-foreground/20' : 'bg-foreground/[0.05]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Webpage with click dots overlaid — for "no heatmap / click data" */
export function HeatmapIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[130px]">
      <div className="absolute left-3 top-1 h-[90px] w-[110px] rounded-lg border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        {/* Nav bar */}
        <div className="flex items-center gap-1.5 border-b border-foreground/[0.06] px-2.5 py-1.5">
          <span className="h-1.5 w-8 rounded-full bg-foreground/[0.08]" />
          <div className="flex-1" />
          <span className="h-1.5 w-3 rounded-full bg-foreground/[0.06]" />
          <span className="h-1.5 w-3 rounded-full bg-foreground/[0.06]" />
        </div>
        {/* Body content lines */}
        <div className="flex flex-col gap-1.5 px-2.5 pt-2.5">
          <div className="h-1.5 w-full rounded-full bg-foreground/[0.05]" />
          <div className="h-1.5 w-3/4 rounded-full bg-foreground/[0.04]" />
          <div className="h-1.5 w-5/6 rounded-full bg-foreground/[0.05]" />
          <div className="h-5 w-12 rounded bg-foreground/[0.04]" />
        </div>
      </div>
      {/* Click dots */}
      <div className="absolute left-[38px] top-[32px] h-3 w-3 rounded-full bg-foreground/[0.08] ring-2 ring-foreground/[0.04]" />
      <div className="absolute left-[68px] top-[50px] h-2.5 w-2.5 rounded-full bg-foreground/[0.12] ring-2 ring-foreground/[0.05]" />
      <div className="absolute left-[50px] top-[65px] h-2 w-2 rounded-full bg-foreground/[0.06] ring-2 ring-foreground/[0.03]" />
    </div>
  );
}

/** Browser window with empty page — for "enter a URL" preview */
export function BrowserIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[140px]">
      <div className="absolute left-3 top-1 h-[90px] w-[120px] rounded-lg border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        {/* Browser chrome */}
        <div className="flex items-center gap-1 border-b border-foreground/[0.06] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="ml-1.5 h-1.5 flex-1 rounded-full bg-foreground/[0.06]" />
        </div>
        {/* Empty page body with cursor */}
        <div className="flex flex-col items-center justify-center gap-2 pt-5">
          <div className="h-4 w-4 rounded-full border-[1.5px] border-foreground/[0.10]" />
          <div className="h-1.5 w-14 rounded-full bg-foreground/[0.06]" />
          <div className="h-1.5 w-9 rounded-full bg-foreground/[0.04]" />
        </div>
      </div>
      {/* Cursor arrow */}
      <svg className="absolute right-3 bottom-1 h-5 w-5 text-foreground/[0.15]" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 2l12 8.5-5.5 1.2L8 17z" />
      </svg>
    </div>
  );
}

/** Checklist with check marks — for "no issues" */
export function IssuesIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[130px]">
      <div className="absolute left-4 top-1 h-[90px] w-[108px] rounded-lg border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        <div className="flex flex-col gap-2.5 px-3 pt-3">
          {[true, true, false].map((checked, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${checked ? 'border-foreground/15 bg-foreground/[0.06]' : 'border-foreground/[0.08]'}`}>
                {checked && (
                  <svg className="h-2 w-2 text-foreground/25" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              <div className={`h-1.5 rounded-full ${checked ? 'w-16 bg-foreground/[0.06]' : 'w-12 bg-foreground/[0.08]'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Timeline with empty step circles — for "waiting for steps" */
export function StepsIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[130px]">
      <div className="absolute left-[24px] top-[10px] w-px h-[76px] bg-foreground/[0.06]" />
      {[14, 38, 62].map((top, i) => (
        <div key={i} className="absolute flex items-center gap-2.5" style={{ top, left: 14 }}>
          <div className={`h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] ${
            i === 0 ? 'border-foreground/15 bg-[#F9F9FC] dark:bg-[#161616]' : 'border-foreground/[0.08] bg-[#F9F9FC] dark:bg-[#161616]'
          }`} />
          <div className="flex flex-col gap-1">
            <div className={`h-1.5 rounded-full ${i === 0 ? 'w-16 bg-foreground/[0.10]' : i === 1 ? 'w-12 bg-foreground/[0.06]' : 'w-10 bg-foreground/[0.05]'}`} />
            <div className={`h-1.5 rounded-full ${i === 0 ? 'w-10 bg-foreground/[0.06]' : 'w-8 bg-foreground/[0.04]'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Terminal window with log lines — for "waiting for logs" */
export function LogIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[130px]">
      <div className="absolute left-3 top-1 h-[90px] w-[110px] rounded-lg border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        <div className="flex items-center gap-1 border-b border-foreground/[0.06] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
          <span className="ml-2 h-1.5 w-8 rounded-full bg-foreground/[0.06]" />
        </div>
        <div className="flex flex-col gap-[5px] px-2.5 pt-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-6 rounded-full bg-foreground/[0.06]" />
            <div className="h-1 w-14 rounded-full bg-foreground/[0.04]" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-6 rounded-full bg-foreground/[0.06]" />
            <div className="h-1 w-10 rounded-full bg-foreground/[0.04]" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-6 rounded-full bg-foreground/[0.06]" />
            <div className="h-1 w-16 rounded-full bg-foreground/[0.04]" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/[0.10]" />
            <div className="h-1 w-4 rounded-full bg-foreground/[0.08]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Connected page boxes with arrows — for "no flow analysis" */
export function FlowIllustration() {
  return (
    <div className="relative mx-auto h-[100px] scale-[1.3] w-[160px]">
      {/* Page A */}
      <div className="absolute left-0 top-3 h-[38px] w-[50px] rounded-md border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        <div className="border-b border-foreground/[0.06] px-1.5 py-1">
          <div className="h-1 w-6 rounded-full bg-foreground/[0.10]" />
        </div>
        <div className="flex flex-col gap-1 px-1.5 pt-1.5">
          <div className="h-1 w-full rounded-full bg-foreground/[0.05]" />
          <div className="h-1 w-3/4 rounded-full bg-foreground/[0.04]" />
        </div>
      </div>
      {/* Arrow 1 */}
      <div className="absolute left-[52px] top-[20px] flex w-[18px] items-center">
        <div className="h-px flex-1 bg-foreground/10" />
        <div className="h-0 w-0 border-y-[3px] border-l-[4px] border-y-transparent border-l-foreground/10" />
      </div>
      {/* Page B */}
      <div className="absolute left-[72px] top-0 h-[44px] w-[50px] rounded-md border border-foreground/[0.10] bg-white shadow-sm dark:bg-foreground/[0.05]">
        <div className="border-b border-foreground/[0.06] px-1.5 py-1">
          <div className="h-1 w-8 rounded-full bg-foreground/[0.10]" />
        </div>
        <div className="flex flex-col gap-1 px-1.5 pt-1.5">
          <div className="h-1 w-full rounded-full bg-foreground/[0.05]" />
          <div className="h-1 w-2/3 rounded-full bg-foreground/[0.04]" />
          <div className="h-1 w-4/5 rounded-full bg-foreground/[0.04]" />
        </div>
      </div>
      {/* Arrow 2 */}
      <div className="absolute left-[85px] top-[46px] flex h-[10px] flex-col items-center">
        <div className="w-px flex-1 bg-foreground/10" />
        <div className="h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent border-t-foreground/10" />
      </div>
      {/* Page C */}
      <div className="absolute left-[60px] top-[58px] h-[38px] w-[50px] rounded-md border border-foreground/[0.08] bg-white shadow-sm dark:bg-foreground/[0.05]">
        <div className="border-b border-foreground/[0.06] px-1.5 py-1">
          <div className="h-1 w-5 rounded-full bg-foreground/[0.10]" />
        </div>
        <div className="flex flex-col gap-1 px-1.5 pt-1.5">
          <div className="h-1 w-full rounded-full bg-foreground/[0.05]" />
          <div className="h-1 w-1/2 rounded-full bg-foreground/[0.04]" />
        </div>
      </div>
    </div>
  );
}
