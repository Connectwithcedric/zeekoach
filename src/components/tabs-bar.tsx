"use client";

import { useState } from "react";
import { CheckCheck, Compass } from "lucide-react";

// The Explore / Following switch at the top of Home and Sessions.
export function ExploreFollowing({ onChange }: { onChange?: (v: "explore" | "following") => void }) {
  const [value, setValue] = useState<"explore" | "following">("explore");
  const opts = [
    { v: "explore" as const, label: "Explore", Icon: Compass },
    { v: "following" as const, label: "Following", Icon: CheckCheck },
  ];
  return (
    <div className="flex h-[70px] items-center justify-around rounded-card bg-surface px-[116px] max-sm:px-4" role="tablist">
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
