import type { Person } from "@/lib/data";
import { roleLabel } from "@/lib/data";

const sizes = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-28 text-3xl" };

export function Avatar({ person, size = "md" }: { person: Person; size?: keyof typeof sizes }) {
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const ring = person.role === "prokoach" ? "ring-accent" : person.role === "koach" ? "ring-primary" : "ring-transparent";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white ring-2 ring-offset-2 ${ring} ${sizes[size]}`}
      style={{ background: `linear-gradient(135deg, hsl(${person.hue} 70% 55%), hsl(${person.hue + 40} 70% 40%))` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// Role is shown as text, not only as ring color, so it works on touch and for color-blind users.
export function RoleBadge({ person }: { person: Person }) {
  if (person.role === "user") return null;
  const pro = person.role === "prokoach";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${pro ? "bg-accent/20 text-accent-text" : "bg-primary/10 text-primary"}`}
    >
      {roleLabel[person.role]}
    </span>
  );
}
