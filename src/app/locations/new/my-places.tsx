"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ImagePlus, MapPin, Trash2 } from "lucide-react";
import { AuthCard, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { geocode } from "@/lib/geo";
import { reloadSessions, type PlaceRow } from "@/lib/live-data";
import { supabase } from "@/lib/supabase";

const MAX_PHOTO = 10 * 1024 * 1024;
const photoPath = (uid: string, f: File) => `${uid}/place-${Date.now()}.${f.name.split(".").pop() || "jpg"}`;
const field = "mt-2 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2";

// List a gym, studio or park so it shows on the map, and manage the places you listed.
export function MyPlaces() {
  const { ready, user } = useAuth();
  const [mine, setMine] = useState<PlaceRow[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [indoor, setIndoor] = useState(true);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    supabase
      .from("places")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setMine((data as PlaceRow[] | null) ?? []));
    return () => {
      alive = false;
    };
  }, [user]);

  if (!supabase) return <AuthCard title="List your location"><NotConfigured /></AuthCard>;
  if (!ready) return <AuthCard title="List your location"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user)
    return (
      <AuthCard title="List your location" sub="Log in to put your gym, studio or park on the map.">
        <Link href="/login" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
      </AuthCard>
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setMsg(null);
    const where = (await geocode([address, name].filter(Boolean).join(", "))) ?? (await geocode(address));
    if (!where) {
      setBusy(false);
      return setMsg({ tone: "error", text: "We couldn't find that address on the map. Try adding the city and country." });
    }
    let photoUrl: string | null = null;
    if (photo) {
      const path = photoPath(user.id, photo.file);
      const { error } = await supabase.storage.from("posts").upload(path, photo.file, { contentType: photo.file.type });
      if (error) {
        setBusy(false);
        return setMsg({ tone: "error", text: `Upload failed: ${error.message}` });
      }
      photoUrl = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase
      .from("places")
      .insert({ owner_id: user.id, name: name.trim(), address: address.trim(), description: description.trim(), indoor, photo: photoUrl, lat: where.lat, lng: where.lng })
      .select("*")
      .single();
    setBusy(false);
    if (error || !data) return setMsg({ tone: "error", text: error?.message ?? "Couldn't list the place." });
    setMine((l) => [data as PlaceRow, ...l]);
    setName("");
    setAddress("");
    setDescription("");
    setPhoto(null);
    reloadSessions();
    setMsg({ tone: "ok", text: "Your place is on the map." });
  }

  async function remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (!error) setMine((l) => l.filter((p) => p.id !== id));
  }

  return (
    <AuthCard title="List your location" sub="Gyms, studios, pools and parks show on the map for everyone looking for a place to train.">
      {mine.length > 0 && (
        <ul className="mb-6 space-y-2">
          {mine.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-[12px] bg-bg px-3 py-2.5">
              {p.photo ? <img src={p.photo} alt="" className="size-10 rounded-[8px] object-cover" /> : <span className="flex size-10 items-center justify-center rounded-[8px] bg-surface text-primary"><MapPin className="size-4" /></span>}
              <Link href="/map" className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{p.name}</p>
                <p className="truncate text-[11px] font-semibold text-muted">{p.address}</p>
              </Link>
              <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`} className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-surface hover:text-live">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="space-y-5">
        <label className="block">
          <span className="text-[13px] font-bold">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Peak Fitness Club" className={field} />
        </label>
        <label className="block">
          <span className="text-[13px] font-bold">Address</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={200} placeholder="Street, city, country" className={field} />
        </label>
        <label className="block">
          <span className="text-[13px] font-bold">About</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3} placeholder="Equipment, opening hours, what makes it great…" className="mt-2 w-full resize-none rounded-[12px] bg-bg px-4 py-3 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" onClick={() => setIndoor(v)} className={`h-10 rounded-[10px] text-[13px] font-bold ${indoor === v ? "bg-primary text-white" : "bg-bg text-primary"}`}>
              {v ? "Indoor" : "Outdoor"}
            </button>
          ))}
        </div>
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[12px] border-2 border-dashed border-line text-[13px] font-bold text-primary hover:bg-bg">
          {photo ? (
            <img src={photo.url} alt="" className="size-full object-cover" />
          ) : (
            <>
              <ImagePlus className="size-6" /> Add a photo
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > MAX_PHOTO) return setMsg({ tone: "error", text: "Photos can be up to 10 MB." });
              setPhoto({ file: f, url: URL.createObjectURL(f) });
            }}
          />
        </label>
        {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
        <SubmitButton busy={busy}>List this place</SubmitButton>
      </form>
    </AuthCard>
  );
}
