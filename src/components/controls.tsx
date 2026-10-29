"use client";

// Toggle and range sliders styled like the Figma "Sessions Filters" panel.

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-[7px] text-[13px] font-semibold text-[#55555f]">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-primary-soft"}`}
      >
        <span className={`absolute top-[3px] size-[14px] rounded-full bg-white transition-all ${checked ? "left-[19px]" : "left-[3px]"}`} />
      </button>
    </label>
  );
}

function Bubble({ pct, children }: { pct: number; children: React.ReactNode }) {
  return (
    <span
      className="absolute -top-[46px] -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[5px] after:border-t-[5px] after:border-x-transparent after:border-t-primary"
      style={{ left: `calc(${pct}% + ${10 - pct * 0.2}px)` }}
    >
      {children}
    </span>
  );
}

type RangeProps = {
  label: string;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
};

export function SingleRange({ label, min, max, step = 1, value, onChange, format }: RangeProps & { value: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="pt-[25px]">
      <p className="text-[13px] font-bold">{label}</p>
      <div className="relative mt-[52px] h-5">
        <div className="absolute inset-x-0 top-[8.5px] h-[3px] rounded-full bg-[#d5d5dc]" />
        <div className="absolute left-0 top-[8.5px] h-[3px] rounded-full bg-primary" style={{ width: `${pct}%` }} />
        <Bubble pct={pct}>{format(value)}</Bubble>
        <input type="range" aria-label={label} className="zk-range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-bold text-muted">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export function DualRange({ label, min, max, step = 1, value, onChange, format }: RangeProps & { value: [number, number]; onChange: (v: [number, number]) => void }) {
  const [lo, hi] = value;
  const p = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="pt-[25px]">
      <p className="text-[13px] font-bold">{label}</p>
      <div className="relative mt-[52px] h-5">
        <div className="absolute inset-x-0 top-[8.5px] h-[3px] rounded-full bg-[#d5d5dc]" />
        <div className="absolute top-[8.5px] h-[3px] rounded-full bg-primary" style={{ left: `${p(lo)}%`, width: `${p(hi) - p(lo)}%` }} />
        <Bubble pct={p(lo)}>{format(lo)}</Bubble>
        <Bubble pct={p(hi)}>{format(hi)}</Bubble>
        <input type="range" aria-label={`${label} minimum`} className="zk-range" min={min} max={max} step={step} value={lo} onChange={(e) => onChange([Math.min(+e.target.value, hi - step), hi])} />
        <input type="range" aria-label={`${label} maximum`} className="zk-range" min={min} max={max} step={step} value={hi} onChange={(e) => onChange([lo, Math.max(+e.target.value, lo + step)])} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-bold text-muted">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
