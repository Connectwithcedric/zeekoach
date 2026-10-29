"use client";

import { useState } from "react";
import { Award, Grid3x3, HeartPulse, Radio, Tag, ThumbsUp } from "lucide-react";

const tabs = [
  { label: "Sessions", Icon: HeartPulse },
  { label: "Streams", Icon: Radio },
  { label: "Posts", Icon: Grid3x3 },
  { label: "Tagged", Icon: Tag },
  { label: "Challenges", Icon: Award },
  { label: "Likes", Icon: ThumbsUp },
];

// Icon tabs under the profile, as in the Figma. Only Sessions has content in this build.
export function ProfileTabs() {
  const [active, setActive] = useState(0);
  return (
    <div role="tablist" className="flex h-[70px] items-center justify-between rounded-card bg-surface px-5">
      {tabs.map(({ label, Icon }, i) => (
        <button
          key={label}
          role="tab"
          aria-selected={i === active}
          aria-label={label}
          title={label}
          onClick={() => setActive(i)}
          className={`flex h-11 w-[60px] items-center justify-center rounded-[12px] transition-colors ${
            i === active ? "bg-primary text-white" : "text-[#7c7c8a] hover:text-primary"
          }`}
        >
          <Icon className="size-[19px]" strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
