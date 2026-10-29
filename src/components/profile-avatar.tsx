import type { Profile } from "@/lib/supabase";

const frame = { member: "", koach: "border-2 border-primary", prokoach: "border-2 border-yellow" };

// Avatar for a real account: their uploaded photo, or their initials until they add one.
export function ProfileAvatar({ profile, size = 46 }: { profile: Pick<Profile, "name" | "avatar_url" | "role">; size?: number }) {
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return profile.avatar_url ? (
    <img src={profile.avatar_url} alt="" style={{ width: size, height: size }} className={`shrink-0 rounded-[12px] object-cover ${frame[profile.role]}`} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.36 }} className={`flex shrink-0 items-center justify-center rounded-[12px] bg-primary-soft font-bold text-primary ${frame[profile.role]}`}>
      {initials}
    </span>
  );
}
