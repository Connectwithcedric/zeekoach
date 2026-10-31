"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { BigButton, BigLink, Input, Message, PasswordInput, Rule, Screen, Select, Steps } from "@/components/mobile";
import { OrLine, SocialLogin } from "@/components/social-login";
import { countries, flag, fullPhone } from "@/lib/countries";
import { passwordOk, passwordRules } from "@/lib/password";
import { storedReferral } from "@/lib/referral";
import { supabase } from "@/lib/supabase";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => thisYear - 13 - i);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));

function isThirteen(y: number, m: number, d: number) {
  const born = new Date(y, m - 1, d);
  if (born.getMonth() !== m - 1) return false; // 31 February and the like
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 13);
  return born <= limit;
}

// Sign up in three steps, like the old YouKoach app: email and birthday, the account itself, then the phone.
export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const [email, setEmail] = useState("");
  const [emailTaken, setEmailTaken] = useState("");
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(0);
  const [year, setYear] = useState(0);

  const [gender, setGender] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [password, setPassword] = useState("");

  const [dial, setDial] = useState("1");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [smsOn, setSmsOn] = useState<boolean | null>(null);
  const [verified, setVerified] = useState("");
  const [wait, setWait] = useState(0);

  // Start the dial code on the person's own country, from the browser's language.
  useEffect(() => {
    const region = navigator.language.split("-")[1]?.toUpperCase();
    const c = countries.find((x) => x[0] === region);
    if (c) setTimeout(() => setDial(c[2]), 0);
  }, []);

  // Live checks, like the old app did as you typed.
  useEffect(() => {
    if (!emailOk(email)) return;
    const t = setTimeout(() => post("/api/register/check", { email }).then((r) => setEmailTaken(r.email ?? "")), 400);
    return () => clearTimeout(t);
  }, [email]);
  useEffect(() => {
    if (!username) return;
    const t = setTimeout(() => post("/api/register/check", { username }).then((r) => setUsernameError(r.username ?? "")), 400);
    return () => clearTimeout(t);
  }, [username]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const phone = fullPhone(dial, number);
  const phoneOk = /^\+\d{8,15}$/.test(phone);
  const birthdayOk = !!(month && day && year) && isThirteen(year, month, day);
  const rules = passwordRules(password);

  async function sendCode() {
    setError("");
    setBusy(true);
    const r = await post("/api/phone/send", { phone });
    setBusy(false);
    if (r.error) return setError(r.error);
    setSmsOn(!!r.configured);
    if (r.configured) setWait(30);
  }

  async function checkCode(c: string) {
    setCode(c);
    if (c.length !== 6) return;
    setBusy(true);
    const r = await post("/api/phone/verify", { phone, code: c });
    setBusy(false);
    if (r.error) return setError(r.error);
    setError("");
    setVerified(phone);
  }

  async function signUp() {
    if (!supabase) return setError("Accounts aren't switched on in this copy of the app yet.");
    setBusy(true);
    setError("");
    const birthday = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), username: username.trim().toLowerCase(), birthday, gender, phone, ref: storedReferral() },
        emailRedirectTo: `${location.origin}/onboarding`,
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.user && data.user.identities?.length === 0) return setError("There's already an account with this email. Log in instead.");
    if (data.session) router.push("/onboarding");
    else setSentTo(email.trim());
  }

  const back = (to: number) => () => {
    setError("");
    setStep(to);
  };

  if (sentTo)
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
            <MailCheck className="size-9" />
          </span>
          <h1 className="mt-6 text-[26px] font-extrabold tracking-tight">Check your email</h1>
          <p className="mt-2 text-[15px] font-semibold text-muted">
            We sent a link to <b className="text-ink">{sentTo}</b>. Tap it to activate your account, then add your photo.
          </p>
          <p className="mt-4 text-[13px] font-semibold text-muted">No email? Look in your spam folder.</p>
        </div>
        <BigLink href="/login" light>
          Back to log in
        </BigLink>
      </Screen>
    );

  if (step === 0)
    return (
      <Screen back="/" title="Sign up" sub="Join the people who train with ZeeKoach." footer={<>Already have an account? <Link href="/login" className="font-bold text-primary">Log in</Link></>}>
        <SocialLogin onError={setError} />
        <OrLine />
        <Steps count={3} at={0} />
        <div className="mt-6 space-y-4">
          <div>
            <Input label="What's your email?" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailTaken(""); }} placeholder="you@email.com" />
            {emailTaken && (
              <p className="mt-2 text-[13px] font-semibold text-live">
                {emailTaken} <Link href="/login" className="underline">Log in?</Link>
              </p>
            )}
          </div>
          <div>
            <span className="text-[14px] font-bold">When&apos;s your birthday?</span>
            <div className="mt-2 grid grid-cols-[1.6fr_1fr_1.2fr] gap-2">
              <Select label="" aria-label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                <option value={0} disabled>Month</option>
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select label="" aria-label="Day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                <option value={0} disabled>Day</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </Select>
              <Select label="" aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                <option value={0} disabled>Year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            {month > 0 && day > 0 && year > 0 && !birthdayOk && <p className="mt-2 text-[13px] font-semibold text-live">Check the date. You must be at least 13.</p>}
            <p className="mt-2 text-[12px] font-semibold text-muted">Not shown on your profile.</p>
          </div>
          {error && <Message tone="error">{error}</Message>}
        </div>
        <div className="mt-auto pt-8">
          <BigButton disabled={!emailOk(email) || !!emailTaken || !birthdayOk} onClick={back(1)}>
            Next
          </BigButton>
        </div>
      </Screen>
    );

  if (step === 1)
    return (
      <Screen back={back(0)} title="Set up your account" sub="This is how people find you on ZeeKoach.">
        <Steps count={3} at={1} />
        <div className="mt-6 space-y-4">
          <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <div>
            <Input label="Username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); setUsernameError(""); }} placeholder="e.g. cedric.runs" />
            {usernameError && <p className="mt-2 text-[13px] font-semibold text-live">{usernameError}</p>}
          </div>
          <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="" disabled>Choose</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="private">Prefer not to say</option>
          </Select>
          <div>
            <PasswordInput label="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
            <ul className="mt-3 space-y-1.5">
              <Rule ok={rules.length}>8 to 30 characters</Rule>
              <Rule ok={rules.mix}>Upper and lower case, a number and a symbol</Rule>
            </ul>
          </div>
        </div>
        <div className="mt-auto pt-8">
          <BigButton disabled={!name.trim() || username.length < 3 || !!usernameError || !gender || !passwordOk(password)} onClick={back(2)}>
            Next
          </BigButton>
        </div>
      </Screen>
    );

  const codeSent = smsOn === true;
  return (
    <Screen back={back(1)} title="What's your phone number?" sub="We send you a code to check it's really you. Koaches use it to reach you before a session.">
      <Steps count={3} at={2} />
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <Select label="Country" value={dial} onChange={(e) => { setDial(e.target.value); setSmsOn(null); setVerified(""); }}>
            {countries.map(([iso, nm, d]) => <option key={iso} value={d} title={nm}>{flag(iso)} +{d}</option>)}
          </Select>
          <Input label="Phone number" type="tel" inputMode="tel" autoComplete="tel-national" value={number} onChange={(e) => { setNumber(e.target.value); setSmsOn(null); setVerified(""); setCode(""); }} placeholder="Your number" />
        </div>

        {verified === phone ? (
          <Message tone="ok">Phone number checked.</Message>
        ) : codeSent ? (
          <div>
            <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => checkCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
            <button type="button" disabled={wait > 0 || busy} onClick={sendCode} className="mt-3 text-[14px] font-bold text-primary disabled:text-muted">
              {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
            </button>
          </div>
        ) : smsOn === false ? (
          <Message tone="ok">SMS codes aren&apos;t switched on yet, so we&apos;ll check this number later. You can finish signing up.</Message>
        ) : (
          <button type="button" disabled={!phoneOk || busy} onClick={sendCode} className="flex h-14 w-full items-center justify-center rounded-[16px] border-2 border-primary text-[16px] font-bold text-primary disabled:border-line disabled:text-muted">
            {busy ? "Sending…" : "Send me a code by SMS"}
          </button>
        )}
        {error && <Message tone="error">{error}</Message>}
      </div>
      <div className="mt-auto pt-8">
        <BigButton busy={busy && (verified === phone || smsOn === false)} disabled={!phoneOk || !(verified === phone || smsOn === false)} onClick={signUp}>
          Sign up
        </BigButton>
        <p className="mt-3 text-center text-[12px] font-semibold text-muted">By signing up you agree to the ZeeKoach Terms of Use and confirm you have read the Privacy Policy.</p>
      </div>
    </Screen>
  );
}
