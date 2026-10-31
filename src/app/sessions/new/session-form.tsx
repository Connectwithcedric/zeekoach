"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard, Field, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { PlacePicker, type PickedPlace } from "@/components/place-picker";
import { geocode } from "@/lib/geo";
import { reloadSessions, type SessionRow } from "@/lib/live-data";
import { supabase } from "@/lib/supabase";

const sports = [
  ["gym", "Gym"],
  ["hiit", "HIIT"],
  ["yoga", "Yoga"],
  ["run", "Running"],
  ["tennis", "Tennis"],
  ["football", "Football"],
  ["swim", "Swimming"],
  ["bike1", "Cycling"],
  ["ropes", "Conditioning"],
] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const blank = {
  title: "",
  description: "",
  equipment: "",
  format: "in-person" as "in-person" | "stream",
  pricing: "per-person" as "per-person" | "private",
  price: "20",
  date: "",
  start: "18:00",
  end: "19:00",
  capacity: "10",
  age_min: "16",
  indoor: true,
  image: "gym",
  location_name: "",
  address: "",
  meet_up: "",
  repeat: "once" as "once" | "weekly",
  weeks: "4",
};

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div>
      <span className="text-[13px] font-bold">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`h-9 rounded-[10px] px-4 text-[13px] font-bold ${value === v ? "bg-primary text-white" : "bg-bg text-muted hover:text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Area({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold">{label}</span>
      <textarea {...props} rows={3} className="mt-2 w-full resize-none rounded-[12px] bg-bg px-4 py-3 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
    </label>
  );
}

// Create a session, or edit one when the link carries ?edit=<id>. Only Koaches and Prokoaches can save.
export function SessionForm() {
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const { ready, user, profile } = useAuth();
  // Rendered in the browser only (search params), so a date default is safe here.
  const [v, setV] = useState(() => ({ ...blank, date: localDate(new Date(Date.now() + 86_400_000)) }));
  const [loaded, setLoaded] = useState(!editId);
  const [busy, setBusy] = useState(false);
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (patch: Partial<typeof blank>) => setV((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!editId) return;
    supabase
      ?.from("sessions")
      .select("*")
      .eq("id", editId)
      .maybeSingle()
      .then(({ data }) => {
        const r = data as SessionRow | null;
        if (r) {
          const s = new Date(r.starts_at);
          setV({
            title: r.title,
            description: r.description,
            equipment: r.equipment,
            format: r.format,
            pricing: r.pricing,
            price: String(r.price),
            date: localDate(s),
            start: localTime(s),
            end: localTime(new Date(r.ends_at)),
            capacity: String(r.capacity),
            age_min: String(r.age_min),
            indoor: r.indoor,
            image: r.image,
            location_name: r.location_name,
            address: r.address,
            meet_up: r.meet_up,
            repeat: "once",
            weeks: "4",
          });
        }
        setLoaded(true);
      });
  }, [editId]);

  const title = editId ? "Edit session" : "Create a session";
  if (!supabase) return <AuthCard title={title}><NotConfigured /></AuthCard>;
  if (!ready || !loaded) return <AuthCard title={title}><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user || !profile)
    return (
      <AuthCard title={title} sub="Log in with a Koach account to create sessions.">
        <Link href="/login" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
      </AuthCard>
    );
  if (profile.role === "member")
    return (
      <AuthCard title={title} sub="Only Koaches can create sessions. You can switch your account to Koach in your profile settings.">
        <Link href="/settings/profile" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Edit profile</Link>
      </AuthCard>
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    const starts = new Date(`${v.date}T${v.start}`);
    const ends = new Date(`${v.date}T${v.end}`);
    if (Number.isNaN(starts.getTime())) return setMsg("Pick a date and a start time.");
    if (ends <= starts) return setMsg("The session has to end after it starts.");
    setBusy(true);
    setMsg(null);
    const inPerson = v.format === "in-person";
    const where = inPerson && place?.lat != null ? { lat: place.lat, lng: place.lng! } : inPerson ? (await geocode([v.address, v.location_name].filter(Boolean).join(", "))) ?? (await geocode(v.location_name)) : null;
    const row = {
      koach_id: user.id,
      title: v.title.trim(),
      description: v.description.trim(),
      equipment: v.equipment.trim(),
      format: v.format,
      pricing: v.pricing,
      price: Number(v.price) || 0,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      capacity: v.pricing === "private" ? 1 : Math.max(1, Number(v.capacity) || 1),
      age_min: Number(v.age_min) || 0,
      indoor: v.indoor,
      image: v.image,
      location_name: v.format === "stream" ? "Online" : v.location_name.trim(),
      address: v.format === "stream" ? "" : v.address.trim(),
      meet_up: v.format === "stream" ? "" : v.meet_up.trim(),
      place_id: inPerson ? place?.id ?? null : null,
      lat: where?.lat ?? null,
      lng: where?.lng ?? null,
    };
    // A weekly class is one session per week, all in the same series, like the old app's "schedule sessions".
    const count = !editId && v.repeat === "weekly" ? Math.min(26, Math.max(2, Number(v.weeks) || 2)) : 1;
    const series_id = count > 1 ? crypto.randomUUID() : undefined;
    const rows = Array.from({ length: count }, (_, i) => {
      const shift = i * 7 * 86_400_000;
      return { ...row, ...(series_id ? { series_id } : {}), starts_at: new Date(starts.getTime() + shift).toISOString(), ends_at: new Date(ends.getTime() + shift).toISOString() };
    });
    const { error } = editId ? await supabase.from("sessions").update(row).eq("id", editId) : await supabase.from("sessions").insert(rows);
    setBusy(false);
    if (error) return setMsg(error.message);
    await reloadSessions();
    router.push("/sessions");
  }

  async function remove() {
    if (!supabase || !editId) return;
    setBusy(true);
    const { error } = await supabase.from("sessions").delete().eq("id", editId);
    setBusy(false);
    if (error) return setMsg(error.message);
    await reloadSessions();
    router.push("/sessions");
  }

  return (
    <AuthCard title={title} sub="Members can find and book it on the Sessions page as soon as you save.">
      <form onSubmit={save} className="space-y-5">
        <Field label="Title" required minLength={3} maxLength={80} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Full body HIIT" />
        <Choice label="Sport" value={v.image} options={sports} onChange={(image) => set({ image })} />
        <Choice label="Class type" value={v.format} options={[["in-person", "In Person"], ["stream", "Stream"]] as const} onChange={(format) => set({ format })} />
        <Choice label="Pricing" value={v.pricing} options={[["per-person", "Per Person"], ["private", "Private Session"]] as const} onChange={(pricing) => set({ pricing })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price ($)" type="number" min={0} step="0.5" required value={v.price} onChange={(e) => set({ price: e.target.value })} />
          {v.pricing === "per-person" ? (
            <Field label="Spots" type="number" min={1} max={500} required value={v.capacity} onChange={(e) => set({ capacity: e.target.value })} />
          ) : (
            <Field label="Minimum age" type="number" min={0} max={99} value={v.age_min} onChange={(e) => set({ age_min: e.target.value })} />
          )}
        </div>
        <Field label={v.repeat === "weekly" ? "First date" : "Date"} type="date" required value={v.date} onChange={(e) => set({ date: e.target.value })} />
        {!editId && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Choice label="Repeat" value={v.repeat} options={[["once", "Just once"], ["weekly", "Every week"]] as const} onChange={(repeat) => set({ repeat })} />
            {v.repeat === "weekly" && <Field label="For how many weeks" type="number" min={2} max={26} value={v.weeks} onChange={(e) => set({ weeks: e.target.value })} />}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" type="time" required value={v.start} onChange={(e) => set({ start: e.target.value })} />
          <Field label="Ends" type="time" required value={v.end} onChange={(e) => set({ end: e.target.value })} />
        </div>
        {v.pricing === "per-person" && <Field label="Minimum age" type="number" min={0} max={99} value={v.age_min} onChange={(e) => set({ age_min: e.target.value })} />}
        {v.format === "in-person" && (
          <>
            <Choice label="Area" value={v.indoor ? "indoor" : "outdoor"} options={[["indoor", "Indoor"], ["outdoor", "Outdoor"]] as const} onChange={(a) => set({ indoor: a === "indoor" })} />
            <div>
              <span className="mb-2 block text-[13px] font-bold">Listed place (optional)</span>
              <PlacePicker value={place} onChange={(p) => { setPlace(p); if (p) set({ location_name: p.name, address: p.address }); }} placeholder="Search gyms, studios and parks on zKoach" />
            </div>
            <Field label="Location" required value={v.location_name} onChange={(e) => set({ location_name: e.target.value })} placeholder="TeamFit Gym" />
            <Field label="Address" value={v.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street and number, city" />
            <Field label="Meet-up point" value={v.meet_up} onChange={(e) => set({ meet_up: e.target.value })} placeholder="At the reception" />
          </>
        )}
        <Area label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="What will people do and learn?" />
        <Area label="What to bring" value={v.equipment} onChange={(e) => set({ equipment: e.target.value })} placeholder="Shoes, towel, water…" />
        {msg && <FormMessage tone="error">{msg}</FormMessage>}
        <SubmitButton busy={busy}>{editId ? "Save changes" : "Create session"}</SubmitButton>
        {editId && (
          <button type="button" disabled={busy} onClick={remove} className="h-11 w-full rounded-[12px] bg-bg text-[14px] font-bold text-live">
            Delete session
          </button>
        )}
      </form>
    </AuthCard>
  );
}
