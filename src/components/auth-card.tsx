import Link from "next/link";

// Centered white card used by the log in, sign up and profile settings screens.
export function AuthCard({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-[30px] w-full max-w-[440px] rounded-card bg-surface px-[30px] py-[30px]">
      <Link href="/" className="text-[17px] font-extrabold tracking-tight text-primary">ZeeKoach</Link>
      <h1 className="mt-5 text-[22px] font-bold">{title}</h1>
      {sub && <p className="mt-1.5 text-[13px] font-semibold text-muted">{sub}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold">{label}</span>
      <input {...props} className="mt-2 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
    </label>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button disabled={busy} className="h-11 w-full rounded-[12px] bg-primary text-[14px] font-bold text-white hover:bg-primary-strong disabled:opacity-60">
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return <p className={`rounded-[10px] px-3 py-2.5 text-[13px] font-semibold ${tone === "error" ? "bg-[#fdecee] text-live" : "bg-primary-soft text-primary"}`}>{children}</p>;
}

export function NotConfigured() {
  return <FormMessage tone="error">Accounts aren&apos;t switched on in this copy of the app yet.</FormMessage>;
}
