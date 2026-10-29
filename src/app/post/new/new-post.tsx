"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { AuthCard, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

const MAX_PHOTO = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const mediaPath = (uid: string, f: File) => `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${f.name.split(".").pop() || "jpg"}`;

// Share up to 10 photos (an album) or one video, with a caption.
export function NewPost() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [items, setItems] = useState<{ file: File; url: string }[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!supabase) return <AuthCard title="New post"><NotConfigured /></AuthCard>;
  if (!ready) return <AuthCard title="New post"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user)
    return (
      <AuthCard title="New post" sub="Log in to share photos and videos.">
        <Link href="/login" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
      </AuthCard>
    );

  const files = items.map((i) => i.file);
  const isVideo = files[0]?.type.startsWith("video/");
  const setFiles = (next: File[]) => {
    items.forEach((i) => !next.includes(i.file) && URL.revokeObjectURL(i.url));
    setItems(next.map((f) => items.find((i) => i.file === f) ?? { file: f, url: URL.createObjectURL(f) }));
  };

  function pick(list: FileList | null) {
    setMsg(null);
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    const video = picked.find((f) => f.type.startsWith("video/"));
    if (video) {
      if (video.size > MAX_VIDEO) return setMsg("Videos can be up to 50 MB.");
      return setFiles([video]);
    }
    const photos = [...(isVideo ? [] : files), ...picked.filter((f) => f.type.startsWith("image/"))];
    if (photos.some((f) => f.size > MAX_PHOTO)) return setMsg("Photos can be up to 10 MB each.");
    setFiles(photos.slice(0, 10));
  }

  async function share(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !files.length) return;
    setBusy(true);
    setMsg(null);
    const urls: string[] = [];
    for (const f of files) {
      const path = mediaPath(user.id, f);
      const { error } = await supabase.storage.from("posts").upload(path, f, { contentType: f.type });
      if (error) {
        setBusy(false);
        return setMsg(`Upload failed: ${error.message}`);
      }
      urls.push(supabase.storage.from("posts").getPublicUrl(path).data.publicUrl);
    }
    const kind = isVideo ? "video" : urls.length > 1 ? "album" : "photo";
    const { data, error } = await supabase.from("posts").insert({ author_id: user.id, kind, media: urls, caption: caption.trim() }).select("id").single();
    setBusy(false);
    if (error || !data) return setMsg(error?.message ?? "Couldn't share the post.");
    router.push(`/post/${data.id}`);
  }

  return (
    <AuthCard title="New post" sub="Share up to 10 photos or one video.">
      <form onSubmit={share} className="space-y-5">
        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {items.map(({ url: u }, i) => (
              <div key={u} className="relative aspect-square overflow-hidden rounded-[12px] bg-bg">
                {isVideo ? <video src={u} muted className="size-full object-cover" /> : <img src={u} alt="" className="size-full object-cover" />}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove" className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {(!isVideo && files.length < 10) && (
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line text-[13px] font-bold text-primary hover:bg-bg">
            <ImagePlus className="size-6" />
            {files.length ? "Add more photos" : "Choose photos or a video"}
            <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => pick(e.target.files)} />
          </label>
        )}
        <label className="block">
          <span className="text-[13px] font-bold">Caption</span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} rows={3} placeholder="Say something about it…" className="mt-2 w-full resize-none rounded-[12px] bg-bg px-4 py-3 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
        </label>
        {msg && <FormMessage tone="error">{msg}</FormMessage>}
        <SubmitButton busy={busy}>{busy ? "Uploading…" : "Share"}</SubmitButton>
      </form>
    </AuthCard>
  );
}
