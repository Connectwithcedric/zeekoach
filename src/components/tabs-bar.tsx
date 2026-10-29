"use client";

import { useState } from "react";
import { CheckCheck, Compass, type LucideIcon } from "lucide-react";

type Option<T extends string> = { v: T; label: string; Icon: LucideIcon };

// The white bar of pill tabs used at the top of the center column on most Figma screens.
export function PillTabs<T extends string>({ options, onChange, className = "px-[116px]" }: { options: Option<T>[]; onChange?: (v: T) => void; className?: string }) {
  const [value, setValue] = useState<T>(options[0].v);
  const opts = options;
  return (
    <div className={`flex h-[70px] items-center justify-around rounded-card bg-surface max-sm:px-4 ${className}`} role="tablist">
      {opts.map(({ v, label, Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => {
              setValue(v);
              onChange?.(v);
            }}
            className={`flex h-11 w-[118px] items-center justify-center gap-2.5 rounded-[12px] text-[13px] font-bold transition-colors ${
              active ? "bg-primary text-white" : "text-muted hover:text-primary"
            }`}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        );
      })}
    </div>
  );
}

// The Explore / Following switch at the top of Home and Sessions.
export function ExploreFollowing({ onChange }: { onChange?: (v: "explore" | "following") => void }) {
  return (
    <PillTabs
      options={[
        { v: "explore", label: "Explore", Icon: Compass },
        { v: "following", label: "Following", Icon: CheckCheck },
      ]}
      onChange={onChange}
    />
  );
}
