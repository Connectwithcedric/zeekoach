"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Heading, Message, Modal, SelectField } from "@/components/auth-ui";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase } from "@/lib/supabase";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => thisYear - 13 - i);
const BOX = 240; // crop window, in px
const OUT = 512; // saved photo size

type Step = "details" | "photo" | "crop" | "welcome";

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().catch(() => ({})));

// Figma: Elements > SignIn/SignUp, after the email link (or Google / Apple):
// "Set Your Profile Picture", "Crop Picture", then "Welcome!" with the Koach question, like the old app.
export function Onboarding() {
  const router = useRouter();
  const { ready, user, profile, refresh } = useAuth();
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [birthday, setBirthday] = useState({ m: 0, d: 0, y: 0 });

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Google and Apple sign ups have no username or birthday yet, so they fill those in first.
  useEffect(() => {
    if (!profile || step) return;
    setTimeout(() => setStep(!profile.username || !profile.birthday ? "details" : "photo"), 0);
  }, [profile, step]);

  useEffect(() => {
    if (!username) return;
    const t = setTimeout(() => post("/api/register/check", { username }).then((r) => setUsernameError(r.username ?? "")), 400);
    return () => clearTimeout(t);
  }, [username]);

  if (!ready || (user && profile && !step)) return <Modal title="Sign Up"><p className="mt-8 text-[12px] font-medium text-[#8b8b9c]">Loading…</p></Modal>;
  if (!user || !profile)
    return (
      <Modal title="Sign Up">
        <Heading className="mt-8">Your account is active</Heading>
        <p className="mt-2 text-[12px] font-medium text-[#8b8b9c]">Sign in to finish setting it up.</p>
        <div className="mt-10"><Button onClick={() => router.push("/login")}>Sign In</Button></div>
      </Modal>
    );

  async function save(fields: Record<string, unknown>) {
    if (!supabase || !user) return false;
    setBusy(true);
    setError("");
    const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "This username is taken." : error.message);
      return false;
    }
    return true;
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Pick a photo (JPG, PNG or HEIC).");
    if (file.size > 10 * 1024 * 1024) return setError("Pick a photo under 10 MB.");
    setError("");
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setStep("crop");
    };
    el.onerror = () => setError("This photo can't be opened. Try another one.");
    el.src = URL.createObjectURL(file);
  }

  // The photo covers the square at zoom 1; pos is the offset of its centre, kept inside the square.
  const base = img ? BOX / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const w = img ? img.naturalWidth * base * zoom : BOX;
  const h = img ? img.naturalHeight * base * zoom : BOX;
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    const mx = img ? (img.naturalWidth * base * z - BOX) / 2 : 0;
    const my = img ? (img.naturalHeight * base * z - BOX) / 2 : 0;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  };

  async function uploadCrop() {
    if (!supabase || !user || !img) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const k = OUT / BOX;
    canvas.getContext("2d")!.drawImage(img, (BOX / 2 - w / 2 + pos.x) * k, (BOX / 2 - h / 2 + pos.y) * k, w * k, h * k);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (!blob) return setError("Couldn't save the photo, try again.");
    setBusy(true);
    setError("");
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const up = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) {
      setBusy(false);
      return setError(`Photo upload failed: ${up.error.message}`);
    }
    setBusy(false);
    if (!(await save({ avatar_url: supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl }))) return;
    await refresh();
    setStep("welcome");
  }

  async function finish(koach: boolean) {
    if (!(await save({ role: koach ? "koach" : "member", onboarded: true }))) return;
    await refresh();
    router.push("/");
  }

  if (step === "details") {
    const { m, d, y } = birthday;
    const born = new Date(y, m - 1, d);
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 13);
    const birthdayOk = !!(m && d && y) && born.getMonth() === m - 1 && born <= limit;
    return (
      <Modal title="Sign Up">
        <Heading className="mt-8">Pick a username</Heading>
        <div className="mt-3">
          <Field placeholder="Username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); setUsernameError(""); }} error={usernameError} />
        </div>
        <Heading className="mt-8">When&apos;s your birthday?</Heading>
        <div className="mt-3 grid grid-cols-[1.7fr_1fr_1.1fr] gap-4">
          <SelectField label="Month" value={m} onChange={(e) => setBirthday({ ...birthday, m: Number(e.target.value) })}>
            <option value={0} disabled>Month</option>
            {months.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}
          </SelectField>
          <SelectField label="Day" value={d} onChange={(e) => setBirthday({ ...birthday, d: Number(e.target.value) })}>
            <option value={0} disabled>Day</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{String(i + 1).padStart(2, "0")}</option>)}
          </SelectField>
          <SelectField label="Year" value={y} onChange={(e) => setBirthday({ ...birthday, y: Number(e.target.value) })}>
            <option value={0} disabled>Year</option>
            {years.map((x) => <option key={x} value={x}>{x}</option>)}
          </SelectField>
        </div>
        {m > 0 && d > 0 && y > 0 && !birthdayOk && <p className="mt-2 text-[12px] font-semibold text-live">You must be at least 13 years old.</p>}
        {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
        <div className="mt-10">
          <Button
            busy={busy}
            disabled={username.length < 3 || !!usernameError || !birthdayOk}
            onClick={async () => {
              if (await save({ username: username.trim().toLowerCase(), birthday: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` })) setStep("photo");
            }}
          >
            Next
          </Button>
        </div>
      </Modal>
    );
  }

  if (step === "crop" && img)
    return (
      <Modal title="Crop Picture" onBack={() => setStep("photo")}>
        <div
          className="relative mx-auto mt-8 cursor-grab touch-none overflow-hidden rounded-[10px] bg-[#f4f4ff] active:cursor-grabbing"
          style={{ width: BOX, height: BOX }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
          }}
          onPointerMove={(e) => {
            const s = drag.current;
            if (s) setPos(clamp({ x: s.px + e.clientX - s.x, y: s.py + e.clientY - s.y }));
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: w, height: h, left: BOX / 2 - w / 2 + pos.x, top: BOX / 2 - h / 2 + pos.y }} />
        </div>
        <p className="mt-3 text-center text-[11px] font-medium text-[#8b8b9c]">Drag the photo to move it</p>
        <div className="mt-6 flex items-center gap-3 text-[14px] font-bold text-[#8b8b9c]">
          <span>−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              setPos((p) => clamp(p, z));
            }}
            className="w-full accent-[#6b48ff]"
          />
          <span>+</span>
        </div>
        {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
        <div className="mt-8"><Button busy={busy} onClick={uploadCrop}>Done</Button></div>
      </Modal>
    );

  if (step === "welcome") {
    return (
      <Modal title="Welcome!">
        <div className="mt-8 flex flex-col items-center text-center">
          <ProfileAvatar profile={profile} size={96} />
          <p className="mt-4 text-[16px] font-bold">{profile.name}</p>
          {profile.username && <p className="text-[12px] font-medium text-[#8b8b9c]">@{profile.username}</p>}
          <Heading className="mt-8">Are you interested in Koaching people?</Heading>
        </div>
        {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
        <div className="mt-6 space-y-3">
          <Button busy={busy} onClick={() => finish(true)}>Yes, I want to become a Koach</Button>
          <Button light disabled={busy} onClick={() => finish(false)}>No, I just want to browse</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Set Your Profile Picture">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]); }}
        className={`mt-8 flex cursor-pointer flex-col items-center rounded-[10px] border-2 border-dashed px-6 py-10 text-center transition ${dragOver ? "border-primary bg-primary-soft" : "border-line bg-[#fafaff]"}`}
      >
        <span className="text-[14px] font-bold">Upload Media</span>
        <span className="mt-5 grid size-14 place-items-center rounded-[12px] bg-primary text-white"><Plus className="size-7" /></span>
        <span className="mt-4 text-[12px] font-medium text-[#8b8b9c]">Drag and drop here or <span className="font-bold text-primary">select a folder</span></span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
      <button type="button" onClick={() => setStep("welcome")} className="mx-auto mt-6 block text-[12px] font-bold text-[#8b8b9c] hover:text-ink">Skip for now</button>
    </Modal>
  );
}
