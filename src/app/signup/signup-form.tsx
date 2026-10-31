"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { Button, Field, Heading, Message, Modal, PasswordField, Rule, SelectField, Toggle } from "@/components/auth-ui";
import { SocialLogin } from "@/components/social-login";
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

// Figma: Elements > SignIn/SignUp. Three steps, with the old YouKoach app's rules:
// email and birthday (13+), then the account (gender, name, username, strong password), then the phone code.
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
  const [channel, setChannel] = useState<"" | "sms" | "whatsapp">("");
  const [smsOn, setSmsOn] = useState<boolean | null>(null);
  const [verified, setVerified] = useState("");
  const [wait, setWait] = useState(0);

  // Start the country code on the person's own country, from the browser's language.
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

  // WhatsApp codes need Twilio's WhatsApp sender; until then both buttons send an SMS.
  async function sendCode(via: "sms" | "whatsapp") {
    setError("");
    setChannel(via);
    setBusy(true);
    const r = await post("/api/phone/send", { phone });
    setBusy(false);
    if (r.error) {
      setChannel("");
      return setError(r.error);
    }
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

  function resetPhone() {
    setChannel("");
    setSmsOn(null);
    setVerified("");
    setCode("");
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
    if (data.user && data.user.identities?.length === 0) return setError("There's already an account with this email. Sign in instead.");
    if (data.session) router.push("/onboarding");
    else setSentTo(email.trim());
  }

  const go = (to: number) => () => {
    setError("");
    setStep(to);
  };

  if (sentTo)
    return (
      <Modal title="Sign Up">
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
            <MailCheck className="size-7" />
          </span>
          <Heading className="mt-5">Check your email</Heading>
          <p className="mt-2 text-[12px] font-medium text-[#8b8b9c]">
            We sent a link to <b className="text-ink">{sentTo}</b>. Click it to activate your account, then set your profile picture.
          </p>
        </div>
        <div className="mt-8">
          <Button light onClick={() => router.push("/login")}>Back to Sign In</Button>
        </div>
      </Modal>
    );

  if (step === 0)
    return (
      <Modal tabs="up">
        <SocialLogin onError={setError} />
        <Heading className="mt-8">What&apos;s your email?</Heading>
        <div className="mt-3">
          <Field
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailTaken(""); }}
            error={emailTaken || (email && !emailOk(email) && email.includes("@") && email.split("@")[1]?.includes(".") ? "This is not an email." : "")}
          />
          {emailTaken && <Link href="/login" className="mt-1 block text-[12px] font-bold text-primary">Sign in?</Link>}
        </div>
        <Heading className="mt-8">When&apos;s your birthday?</Heading>
        <div className="mt-3 grid grid-cols-[1.7fr_1fr_1.1fr] gap-4">
          <SelectField label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            <option value={0} disabled>Month</option>
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </SelectField>
          <SelectField label="Day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            <option value={0} disabled>Day</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{String(i + 1).padStart(2, "0")}</option>)}
          </SelectField>
          <SelectField label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            <option value={0} disabled>Year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </SelectField>
        </div>
        {month > 0 && day > 0 && year > 0 && !birthdayOk && <p className="mt-2 text-[12px] font-semibold text-live">You must be at least 13 years old.</p>}
        {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
        <div className="mt-10">
          <Button disabled={!emailOk(email) || !!emailTaken || !birthdayOk} onClick={go(1)}>Next</Button>
        </div>
      </Modal>
    );

  if (step === 1)
    return (
      <Modal title="Sign Up" onBack={go(0)}>
        <Heading className="mt-8">Set up your account</Heading>
        <div className="mt-5 space-y-5">
          <SelectField label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="" disabled>Choose</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="private">Prefer not to say</option>
          </SelectField>
          <Field label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); setUsernameError(""); }} error={usernameError} />
          <div>
            <PasswordField label="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul className="mt-3 space-y-2">
              <Rule ok={rules.length}>8 to 30 characters</Rule>
              <Rule ok={rules.mix}>Mix upper-lowercase letters, numbers and special characters</Rule>
            </ul>
          </div>
        </div>
        <div className="mt-10">
          <Button disabled={!name.trim() || username.length < 3 || !!usernameError || !gender || !passwordOk(password)} onClick={go(2)}>Next</Button>
        </div>
      </Modal>
    );

  const codeSent = smsOn === true;
  return (
    <Modal title="Sign Up" onBack={go(1)}>
      <Heading className="mt-8">What&apos;s your phone number?</Heading>
      <div className="mt-4 grid grid-cols-[110px_1fr] gap-4">
        <SelectField label="Country Code" value={dial} onChange={(e) => { setDial(e.target.value); resetPhone(); }}>
          {countries.map(([iso, nm, d]) => <option key={iso} value={d} title={nm}>{flag(iso)} +{d}</option>)}
        </SelectField>
        <Field label="Phone Number" type="tel" inputMode="tel" autoComplete="tel-national" value={number} onChange={(e) => { setNumber(e.target.value); resetPhone(); }} />
      </div>

      <Heading className="mt-8">Verify via SMS or WhatsApp?</Heading>
      <div className="mt-3 flex gap-4">
        <Toggle on={channel === "sms"} disabled={!phoneOk || busy || codeSent} onClick={() => sendCode("sms")}>SMS</Toggle>
        <Toggle on={channel === "whatsapp"} disabled={!phoneOk || busy || codeSent} onClick={() => sendCode("whatsapp")}>WhatsApp</Toggle>
      </div>

      <div className="mt-6">
        {verified === phone ? (
          <Message tone="ok">Phone number verified.</Message>
        ) : smsOn === false ? (
          <Message tone="ok">Phone codes aren&apos;t switched on yet, so we&apos;ll verify this number later. You can sign up now.</Message>
        ) : (
          <div className="relative">
            <Field placeholder="6 digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={!codeSent} value={code} onChange={(e) => checkCode(e.target.value.replace(/\D/g, ""))} />
            {codeSent && <span className="absolute bottom-2.5 right-0 text-[12px] font-bold text-ink">{wait > 0 ? wait : ""}</span>}
            {codeSent && (
              <div className="mt-2 flex gap-4 text-[12px] font-bold">
                <button type="button" disabled={wait > 0 || busy} onClick={() => sendCode(channel || "sms")} className="text-primary disabled:text-[#c9c9d4]">Resend</button>
                <button type="button" onClick={resetPhone} className="text-[#8b8b9c] hover:text-ink">Change</button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}

      <div className="mt-10">
        <Button busy={busy && (verified === phone || smsOn === false)} disabled={!phoneOk || !(verified === phone || smsOn === false)} onClick={signUp}>
          Sign Up
        </Button>
        <p className="mt-3 text-center text-[10px] font-medium text-[#8b8b9c]">
          By registering, you agree to ZeeKoach&apos;s Terms of Use and confirm that you have read ZeeKoach&apos;s Privacy Policy.
        </p>
      </div>
    </Modal>
  );
}
