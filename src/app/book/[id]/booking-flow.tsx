"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, Check, ChevronLeft, CreditCard, Minus, Plus, Smartphone } from "lucide-react";
import { formatDate, formatPrice, type Location, type Person, type Session } from "@/lib/data";

const SERVICE_FEE_RATE = 0.05;
const steps = ["Who's coming", "Payment", "Confirm"] as const;
const methods = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "apple", label: "Apple Pay", icon: Smartphone },
  { id: "google", label: "Google Pay", icon: Smartphone },
  { id: "cash", label: "Pay on site", icon: Banknote },
] as const;
type Method = (typeof methods)[number]["id"];

export function BookingFlow({ session, koach, location }: { session: Session; koach: Person; location: Location }) {
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState(0);
  const [method, setMethod] = useState<Method>("card");
  const [done, setDone] = useState(false);

  const isPrivate = session.pricing === "private";
  const spotsLeft = session.capacity - session.attendees;
  const people = isPrivate ? 1 : 1 + guests;
  const subtotal = isPrivate ? session.price : session.price * people;
  const fee = Math.round(subtotal * SERVICE_FEE_RATE * 100) / 100;
  const total = subtotal + fee;

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-white">
          <Check className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold">You&apos;re booked</h1>
        <p className="mt-2 text-sm text-muted">
          {session.title} with {koach.name}, {formatDate(session.date)} at {session.start}.
        </p>
        <p className="mt-1 text-sm text-muted">{session.format === "stream" ? "You'll get the stream link an hour before." : location.address}</p>
        <div className="mt-6 grid gap-2">
          <Link href="/sessions" className="rounded-xl bg-primary py-3 font-semibold text-white">
            Find more sessions
          </Link>
          <Link href={`/sessions/${session.id}`} className="rounded-xl bg-surface-muted py-3 text-sm font-semibold text-primary">
            View booking details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} aria-label="Back" className="rounded-lg p-1 hover:bg-surface-muted">
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <Link href={`/sessions/${session.id}`} aria-label="Back to session" className="rounded-lg p-1 hover:bg-surface-muted">
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <h1 className="flex-1 text-center font-bold">{steps[step]}</h1>
        <span className="w-7" />
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Booking steps">
        {steps.map((s, i) => (
          <li key={s} className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} aria-current={i === step ? "step" : undefined}>
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-xl bg-surface-muted p-3 text-sm">
        <p className="font-bold">{session.title}</p>
        <p className="text-muted">
          {koach.name} · {formatDate(session.date)} · {session.start}–{session.end}
        </p>
      </div>

      {step === 0 && (
        <div className="mt-5">
          {isPrivate ? (
            <p className="text-sm text-muted">This is a private session for one person.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Booking just for you? Continue. You can also add friends who&apos;ll join you.</p>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-3">
                <span className="text-sm font-semibold">Guests</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests(Math.max(0, guests - 1))}
                    disabled={guests === 0}
                    aria-label="Remove a guest"
                    className="rounded-lg bg-surface-muted p-1.5 disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-5 text-center font-bold" aria-live="polite">
                    {guests}
                  </span>
                  <button
                    onClick={() => setGuests(Math.min(spotsLeft - 1, guests + 1))}
                    disabled={guests >= spotsLeft - 1}
                    aria-label="Add a guest"
                    className="rounded-lg bg-surface-muted p-1.5 disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">{spotsLeft} spots left in this session.</p>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <fieldset className="mt-5 grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-semibold">Choose how to pay</legend>
          {methods.map(({ id, label, icon: Icon }) => (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                method === id ? "border-primary bg-primary/5 text-primary" : "border-line"
              }`}
            >
              <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} className="sr-only" />
              <Icon className="size-4" aria-hidden /> {label}
            </label>
          ))}
          <p className="col-span-2 mt-1 text-xs text-muted">Demo build: no payment is taken.</p>
        </fieldset>
      )}

      {step === 2 && (
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{isPrivate ? "Private session" : `${formatPrice(session.price)} × ${people} ${people === 1 ? "person" : "people"}`}</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Service fee (5%)</dt>
            <dd>{formatPrice(fee)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Payment</dt>
            <dd>{methods.find((m) => m.id === method)!.label}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
          <p className="pt-1 text-xs text-muted">Free cancellation up to 24 hours before the session.</p>
        </dl>
      )}

      <button
        onClick={() => (step < steps.length - 1 ? setStep(step + 1) : setDone(true))}
        className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-white hover:bg-primary-strong"
      >
        {step === 0 ? "Continue" : step === 1 ? "Review booking" : method === "cash" ? "Confirm booking" : `Pay ${formatPrice(total)}`}
      </button>
    </div>
  );
}
