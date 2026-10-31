"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, CreditCard, Search, Wallet, X } from "lucide-react";
import { AppleIcon } from "@/components/brand-icons";
import { useAuth } from "@/components/auth-provider";
import { SessionDetail } from "@/components/session-detail";
import { Photo } from "@/components/ui";
import { reloadSessions } from "@/lib/live-data";
import { useGiftCredit } from "@/lib/gifts";
import { supabase } from "@/lib/supabase";
import { useToday } from "@/lib/use-today";
import { formatDate, formatPrice, getPerson, people, photo, sessionDate, type Person, type Session } from "@/lib/data";

// Fee and VAT rates from the Figma checkout screen.
const SERVICE_FEE = 0.1;
const VAT = 0.2;

type Guest = { id: string; name: string; person?: Person };
type Step = "who" | "checkout" | "payment" | "done";
type Method = "card" | "apple" | "google" | "wallet";

function Panel({ title, onBack, onClose, children, wide = false }: { title: string; onBack?: () => void; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`w-full rounded-card bg-surface px-[25px] pb-[25px] pt-[25px] ${wide ? "max-w-[460px]" : "max-w-[380px]"}`}>
      <header className="flex h-6 items-center">
        {onBack ? (
          <button onClick={onBack} aria-label="Back" className="text-muted hover:text-ink">
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <h1 className="flex-1 text-center text-[17px] font-bold">{title}</h1>
        <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
          <X className="size-5" />
        </button>
      </header>
      {children}
    </section>
  );
}

function Summary({ session, date }: { session: Session; date: Date | null }) {
  return (
    <div className="mt-[30px] flex items-center gap-[15px]">
      <Photo k={session.image} w={42} h={42} className="size-[42px] rounded-[10px]" />
      <div>
        <p className="text-[15px] font-bold">{session.title}</p>
        <p className="mt-1 text-[13px] font-semibold text-muted">
          {date && formatDate(date)}
          <span className="mx-2.5 inline-block h-3 w-px bg-line align-middle" />
          {session.start}-{session.end}
        </p>
      </div>
    </div>
  );
}

function GuestFace({ guest, size }: { guest: Guest; size: number }) {
  return guest.person ? (
    <img src={photo(guest.person.photo, size, size, true)} alt="" className="rounded-[10px] object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-[10px] bg-primary-soft text-xs font-bold text-primary" style={{ width: size, height: size }}>
      {guest.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-[25px] h-[38px] w-full rounded-[10px] bg-primary text-[13px] font-bold text-white hover:bg-primary-strong disabled:bg-primary-soft disabled:text-white"
    >
      {children}
    </button>
  );
}

export function BookingFlow({ session }: { session: Session }) {
  const router = useRouter();
  const close = () => router.push("/sessions");
  const today = useToday();
  const date = today && sessionDate(session, today);
  const koach = getPerson(session.koachId)!;
  const isPrivate = session.pricing === "private";
  const spots = isPrivate ? 1 : Math.max(1, session.capacity - session.attendees);

  const [step, setStep] = useState<Step>("who");
  const [tab, setTab] = useState<"community" | "external">("community");
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState<Guest[]>([{ id: "me", name: "You" }]);
  const [ext, setExt] = useState({ name: "", email: "", phone: "" });
  const [method, setMethod] = useState<Method>("card");
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const { user } = useAuth();
  const giftCredit = useGiftCredit(user?.id);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const toggle = (p: Person) =>
    setGuests((g) => (g.some((x) => x.id === p.id) ? g.filter((x) => x.id !== p.id) : g.length < spots ? [...g, { id: p.id, name: p.name, person: p }] : g));
  const suggested = people.filter((p) => p.id !== session.koachId && p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  const subtotalBase = isPrivate ? session.price : session.price * guests.length;
  const fee = subtotalBase * SERVICE_FEE;
  const subtotal = subtotalBase + fee;
  const vat = subtotal * VAT;
  const total = subtotal + vat;
  const credit = session.real ? Math.min(total, giftCredit) : 0;
  const due = total - credit;
  const money = (n: number) => formatPrice(Math.round(n * 100) / 100);
  const api = async (path: string, body: object) => {
    const token = (await supabase!.auth.getSession()).data.session?.access_token;
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return (await res.json()) as { url?: string; booked?: boolean; error?: string };
  };

  // Real sessions are booked by the server: paid ones through Stripe Checkout (test mode), free ones straight away.
  // Demo sessions just show the thank you screen.
  async function pay() {
    if (!session.real || !supabase) return setStep("done");
    if (!user) return router.push("/login");
    setPaying(true);
    setPayError(null);
    const r = await api("/api/book", { sessionId: session.id, guests: guests.length });
    if (r.url) return window.location.assign(r.url);
    setPaying(false);
    if (r.error) return setPayError(r.error);
    reloadSessions();
    setStep("done");
  }

  // Back from Stripe: confirm the payment and save the booking.
  const [paidId] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("paid")));
  const [confirming, setConfirming] = useState(!!paidId);
  useEffect(() => {
    if (!paidId || !user || !supabase) return;
    let alive = true;
    api("/api/book/confirm", { checkoutId: paidId }).then((r) => {
      if (!alive) return;
      setConfirming(false);
      window.history.replaceState(null, "", window.location.pathname);
      if (r.error) {
        setPayError(r.error);
        setStep("payment");
      } else {
        reloadSessions();
        setStep("done");
      }
    });
    return () => {
      alive = false;
    };
  }, [paidId, user]);

  const cardReady = session.real || method !== "card" || (card.number.replace(/\s/g, "").length >= 12 && card.exp.length >= 4 && card.cvc.length >= 3);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#191a1e]/50 px-4 py-10">
      <div className="mx-auto flex justify-center">
        {confirming && step !== "done" && (
          <Panel title="Confirming payment" onClose={close}>
            <p className="mt-[30px] text-center text-[13px] font-semibold text-muted">One moment while we confirm your payment with Stripe…</p>
          </Panel>
        )}
        {step === "who" && !confirming && (
          <Panel title="Who's Coming?" onClose={close}>
            <Summary session={session} date={date} />
            <ul className="mt-[25px] flex gap-[14px] overflow-x-auto pb-1">
              {guests.map((g) => (
                <li key={g.id} className="relative w-[42px] shrink-0 text-center">
                  <GuestFace guest={g} size={42} />
                  {g.id !== "me" && (
                    <button
                      onClick={() => setGuests((all) => all.filter((x) => x.id !== g.id))}
                      aria-label={`Remove ${g.name}`}
                      className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full bg-primary text-white"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                  <p className="mt-2 truncate text-[11px] font-bold text-muted">{g.name.split(" ")[0]}</p>
                </li>
              ))}
            </ul>

            {!isPrivate && (
              <>
                <div className="mt-[20px] grid h-[38px] grid-cols-2 overflow-hidden rounded-[10px] bg-bg text-[13px] font-bold" role="tablist">
                  {(["community", "external"] as const).map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`capitalize ${tab === t ? "rounded-[10px] bg-primary text-white" : "text-muted"}`}>
                      {t}
                    </button>
                  ))}
                </div>

                {tab === "community" ? (
                  <>
                    <label className="mt-[20px] flex h-10 items-center gap-2 rounded-[10px] bg-bg px-3 text-sm text-muted">
                      <Search className="size-3.5" aria-hidden />
                      <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent outline-none placeholder:text-muted" placeholder="Search" aria-label="Search people" />
                    </label>
                    <p className="mt-[25px] text-[15px] font-bold text-muted">Suggested</p>
                    <ul className="mt-2">
                      {suggested.map((p) => {
                        const on = guests.some((g) => g.id === p.id);
                        return (
                          <li key={p.id}>
                            <button onClick={() => toggle(p)} className="flex w-full items-center gap-[15px] py-[8px] text-left" aria-pressed={on}>
                              <img src={photo(p.photo, 36, 36, true)} alt="" className="size-9 rounded-[10px] object-cover" />
                              <span className="flex-1 text-[15px] font-bold">{p.name}</span>
                              <span className={`flex size-5 items-center justify-center rounded-full border-[1.5px] ${on ? "border-primary bg-primary text-white" : "border-[#3d3d47]"}`}>
                                {on && <Check className="size-3" />}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <form
                    className="mt-[20px]"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!ext.name || guests.length >= spots) return;
                      setGuests((g) => [...g, { id: `ext-${Date.now()}`, name: ext.name }]);
                      setExt({ name: "", email: "", phone: "" });
                    }}
                  >
                    <p className="text-center text-[13px] font-semibold leading-[1.5] text-muted">
                      Contacts from outside of ZeeKoach can retrieve their booking after downloading the app.
                    </p>
                    {(["name", "email", "phone"] as const).map((k) => (
                      <input
                        key={k}
                        value={ext[k]}
                        onChange={(e) => setExt({ ...ext, [k]: e.target.value })}
                        placeholder={k[0].toUpperCase() + k.slice(1)}
                        aria-label={k}
                        type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                        className="mt-[18px] w-full border-b border-line pb-2 text-[13px] font-semibold outline-none placeholder:text-muted focus:border-primary"
                      />
                    ))}
                    <button disabled={!ext.name} className="mt-[30px] h-[38px] w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:bg-primary-soft">
                      Add
                    </button>
                  </form>
                )}
              </>
            )}
            <PrimaryButton onClick={() => setStep("checkout")}>Next</PrimaryButton>
          </Panel>
        )}

        {step === "checkout" && (
          <Panel title="Checkout" onBack={() => setStep("who")} onClose={close}>
            <Summary session={session} date={date} />
            <ul className="mt-[30px] space-y-[18px] border-b border-line pb-[22px]">
              {(isPrivate ? guests.slice(0, 1) : guests).map((g) => (
                <li key={g.id} className="flex items-center gap-[15px]">
                  <GuestFace guest={g} size={36} />
                  <span className="flex-1 text-[15px] font-bold">{g.name}</span>
                  <span className="text-[15px] font-bold">{formatPrice(session.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="text-[15px] font-bold">
              <div className="flex justify-between border-b border-line py-[18px]">
                <dt className="text-muted">Service Fee (10%)</dt>
                <dd>{money(fee)}</dd>
              </div>
              <div className="mt-[18px] flex justify-between">
                <dt>Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div className="mt-[14px] flex justify-between">
                <dt className="text-muted">VAT (20%)</dt>
                <dd>{money(vat)}</dd>
              </div>
              <div className="mt-[14px] flex justify-between">
                <dt>Total:</dt>
                <dd className="text-primary">{money(total)}</dd>
              </div>
              {credit > 0 && (
                <div className="mt-[14px] flex justify-between">
                  <dt className="text-muted">Gift credit</dt>
                  <dd className="text-primary">-{money(credit)}</dd>
                </div>
              )}
            </dl>
            <PrimaryButton onClick={() => setStep("payment")}>Next</PrimaryButton>
          </Panel>
        )}

        {step === "payment" && (
          <Panel title="Payment" onBack={() => setStep("checkout")} onClose={close} wide>
            <p className="mt-[30px] text-[15px] font-bold">Select Payment Method</p>
            <div className="mt-[15px] grid grid-cols-4 gap-[10px]" role="radiogroup" aria-label="Payment method">
              {(
                [
                  { id: "card", label: "Card", node: <CreditCard className="size-6" />, base: "bg-primary text-white" },
                  { id: "apple", label: "Apple Pay", node: <span className="flex items-center text-[19px] font-semibold"><AppleIcon className="size-5" />Pay</span>, base: "bg-black text-white" },
                  { id: "google", label: "Google Pay", node: <span className="text-[19px] font-semibold"><span className="text-[#4285f4]">G</span> Pay</span>, base: "bg-black text-white" },
                  { id: "wallet", label: "Wallet", node: <Wallet className="size-6" />, base: "bg-primary text-white" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={method === m.id}
                  aria-label={m.label}
                  onClick={() => setMethod(m.id)}
                  className={`flex h-[50px] items-center justify-center rounded-[10px] ${m.base} ${method === m.id ? "ring-2 ring-primary ring-offset-2" : "opacity-90"}`}
                >
                  {m.node}
                </button>
              ))}
            </div>

            {method === "card" && !session.real && (
              <>
                <p className="mt-[25px] text-[15px] font-bold">Add a card</p>
                <div className="mt-[15px] flex h-10 items-center gap-3 rounded-[10px] bg-bg px-3 text-[13px] font-semibold">
                  <CreditCard className="size-4 shrink-0 text-muted" aria-hidden />
                  <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" placeholder="Credit Number" aria-label="Card number" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
                  <input value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="MM/YY" aria-label="Expiry date" className="w-12 bg-transparent outline-none placeholder:text-muted" />
                  <input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} inputMode="numeric" placeholder="CVC" aria-label="CVC" className="w-9 bg-transparent outline-none placeholder:text-muted" />
                </div>
              </>
            )}
            {method === "wallet" && <p className="mt-[25px] rounded-[10px] bg-bg p-3 text-[13px] font-semibold text-muted">Paid from your ZeeKoach wallet balance.</p>}

            <div className="mt-[25px] flex items-center gap-[15px] rounded-[14px] bg-bg p-[12px]">
              <img src={photo(koach.photo, 42, 42, true)} alt="" className="size-[42px] rounded-[10px] object-cover" />
              <div>
                <p className="text-[15px] font-bold">{session.title}</p>
                <p className="mt-0.5 text-[13px] font-semibold text-muted">
                  {date && formatDate(date)} <span className="mx-1.5 inline-block h-3 w-px bg-line align-middle" /> {session.start}-{session.end}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-muted">
                  {guests.length} {guests.length === 1 ? "Athlete" : "Athletes"}
                  <span className="mx-2 inline-block size-[3px] rounded-full bg-muted align-middle" />
                  <span className="font-bold text-primary">{money(due)}</span>
                </p>
              </div>
            </div>

            {payError && <p className="mt-[15px] rounded-[10px] bg-[#fdecee] px-3 py-2.5 text-[13px] font-semibold text-live">{payError}</p>}
            <PrimaryButton disabled={!cardReady || paying} onClick={pay}>
              {paying ? "Booking…" : session.real && !user ? "Log in to book" : due === 0 && credit > 0 ? "Book with gift credit" : `Pay ${money(due)}`}
            </PrimaryButton>
            <p className="mt-[15px] text-center text-xs font-semibold leading-[1.5] text-muted">
              By clicking on the button above, I agree to the terms and conditions. {session.real ? "You pay on Stripe\u2019s secure page. Test mode: use card 4242 4242 4242 4242, any future date and any CVC." : "Demo session: no payment is taken."}
            </p>
          </Panel>
        )}

        {step === "done" && (
          <div className="w-full max-w-[410px]">
            <div className="rounded-t-card bg-surface px-[25px] pt-[25px] text-center">
              <h1 className="text-[17px] font-bold">Thank you!</h1>
              <p className="mt-1.5 text-[15px] font-semibold text-muted">You have successfully booked</p>
            </div>
            <div className="[&>article]:rounded-t-none">
              <SessionDetail session={session} />
            </div>
            <Link href="/sessions" className="mt-4 flex h-[42px] items-center justify-center rounded-[12px] bg-surface text-[13px] font-bold text-primary">
              Back to sessions
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
