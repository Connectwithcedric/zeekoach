import Link from "next/link";
import { Avatar, RoleBadge } from "@/components/avatar";
import { Card, CardTitle } from "@/components/card";
import { currentUserId, people } from "@/lib/data";

export function FollowSuggestions() {
  const list = people.filter((p) => p.id !== currentUserId).slice(0, 4);
  return (
    <Card>
      <CardTitle action={<Link href="/" className="text-xs font-semibold text-primary">See all</Link>}>
        Follow suggestions
      </CardTitle>
      <ul className="space-y-4">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Avatar person={p} />
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${p.id}`} className="block truncate text-sm font-bold hover:text-primary">
                {p.name}
              </Link>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <RoleBadge person={p} /> {p.sports[0]}
              </div>
            </div>
            <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted">Follow</button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RightRail() {
  return (
    <aside className="space-y-4">
      <FollowSuggestions />
      <p className="px-2 text-center text-xs text-muted">ZeeKOACH · Version 0.1 · © 2026</p>
    </aside>
  );
}
