import "server-only";
import pg from "pg";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const dbUrl = process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
// Supabase uses a certificate chain Node doesn't know; the connection is still encrypted.
// Dropping sslmode with a plain regex left "&supa=..." stuck to the database name, so parse the URL instead.
function withoutSslMode(u: string) {
  const parsed = new URL(u);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}
export const pool = dbUrl ? new pg.Pool({ connectionString: withoutSslMode(dbUrl), ssl: { rejectUnauthorized: false }, max: 3 }) : null;

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const authClient =
  process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!)
    : null;

// The signed-in user behind the request's bearer token, or null.
export async function requestUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!authClient || !token) return null;
  const { data } = await authClient.auth.getUser(token);
  return data.user;
}

// Fee and VAT rates from the Figma checkout screen, same as the booking flow shows.
export function priceFor(price: number, pricing: string, guests: number) {
  const base = pricing === "private" ? price : price * guests;
  return Math.round(base * 1.1 * 1.2 * 100) / 100;
}

export async function saveBooking(sessionId: string, userId: string, guests: number, total: number, ref: string | null, creditUsed = 0) {
  await pool!.query(
    `insert into public.bookings (session_id, user_id, guests, total, status, payment_ref, credit_used)
     values ($1, $2, $3, $4, 'confirmed', $5, $6)
     on conflict (session_id, user_id) do update set guests = excluded.guests, total = excluded.total, status = 'confirmed', payment_ref = excluded.payment_ref, credit_used = excluded.credit_used`,
    [sessionId, userId, guests, total, ref, creditUsed],
  );
}

// What a booking can use from the wallet: the whole balance (gift credit, money added or received, earnings),
// plus whatever an existing booking for this same session already used, since rebooking replaces it.
export async function giftCredit(userId: string, exceptSessionId?: string) {
  const { rows } = await pool!.query(
    `select (select balance from public.wallet_summary($1))
          + coalesce((select sum(credit_used) from public.bookings where user_id = $1 and status = 'confirmed' and session_id = $2), 0) as credit`,
    [userId, exceptSessionId ?? null],
  );
  return Math.max(0, Math.round(Number(rows[0]?.credit ?? 0) * 100) / 100);
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const failMessage = (err: unknown) => (String((err as Error)?.message ?? err).includes("full") ? "Sorry, this session just filled up." : "Booking failed, please try again.");
