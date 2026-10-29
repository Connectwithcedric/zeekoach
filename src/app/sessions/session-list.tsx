"use client";

import { useMemo, useState } from "react";
import { SessionCard } from "@/components/session-card";
import { sessions } from "@/lib/data";

const sports = ["All", ...Array.from(new Set(sessions.map((s) => s.sport)))];
const formats = [
  { value: "all", label: "Any format" },
  { value: "in-person", label: "In person" },
  { value: "stream", label: "Live stream" },
] as const;

export function SessionList() {
  const [sport, setSport] = useState("All");
  const [format, setFormat] = useState<(typeof formats)[number]["value"]>("all");
  const [maxPrice, setMaxPrice] = useState(50);

  const results = useMemo(
    () =>
      sessions.filter(
        (s) => (sport === "All" || s.sport === sport) && (format === "all" || s.format === format) && s.price <= maxPrice,
      ),
    [sport, format, maxPrice],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit space-y-5 rounded-2xl bg-surface p-5 shadow-sm">
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Sport</legend>
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                aria-pressed={sport === s}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  sport === s ? "bg-primary text-white" : "bg-surface-muted text-ink hover:bg-primary/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Format</legend>
          {formats.map((f) => (
            <label key={f.value} className="flex items-center gap-2 py-1 text-sm">
              <input type="radio" name="format" checked={format === f.value} onChange={() => setFormat(f.value)} className="accent-primary" />
              {f.label}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="price" className="mb-2 flex justify-between text-sm font-bold">
            Max price <span className="text-primary">€{maxPrice}</span>
          </label>
          <input id="price" type="range" min={5} max={50} step={5} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-primary" />
        </div>
      </aside>

      <div>
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          {results.length} {results.length === 1 ? "session" : "sessions"}
        </p>
        {results.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-10 text-center shadow-sm">
            <p className="font-bold">No sessions match these filters</p>
            <p className="mt-1 text-sm text-muted">Try another sport or raise the max price.</p>
            <button
              onClick={() => {
                setSport("All");
                setFormat("all");
                setMaxPrice(50);
              }}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
