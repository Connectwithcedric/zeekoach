import { Dumbbell, Footprints, HeartPulse, PersonStanding, Swords, Trophy } from "lucide-react";

// Stand-in artwork per sport until real session photos are uploaded.
const map: Record<string, { icon: typeof Trophy; hue: number }> = {
  Tennis: { icon: Trophy, hue: 72 },
  HIIT: { icon: HeartPulse, hue: 350 },
  Mobility: { icon: PersonStanding, hue: 190 },
  Football: { icon: Footprints, hue: 130 },
  Yoga: { icon: PersonStanding, hue: 280 },
  Boxing: { icon: Swords, hue: 15 },
};

export function SessionVisual({ sport, className = "" }: { sport: string; className?: string }) {
  const { icon: Icon, hue } = map[sport] ?? { icon: Dumbbell, hue: 250 };
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-[#14131c] ${className}`}
      style={{ backgroundImage: `radial-gradient(circle at 70% 30%, hsl(${hue} 80% 55% / 0.55), transparent 60%)` }}
    >
      <Icon className="size-14 text-white/85" strokeWidth={1.5} aria-hidden />
    </div>
  );
}
