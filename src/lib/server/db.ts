import "server-only";
import pg from "pg";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const dbUrl = process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
// Supabase uses a certificate chain Node doesn't know; the connection is still encrypted.
export const pool = dbUrl ? new pg.Pool({ connectionString: dbUrl.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false }, max: 3 }) : null;

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

export async function saveBooking(sessionId: string, userId: string, guests: number, total: number, ref: string | null) {
  await pool!.query(
    `insert into public.bookings (session_id, user_id, guests, total, status, payment_ref)
     values ($1, $2, $3, $4, 'confirmed', $5)
     on conflict (session_id, user_id) do update set guests = excluded.guests, total = excluded.total, status = 'confirmed', payment_ref = excluded.payment_ref`,
    [sessionId, userId, guests, total, ref],
  );
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const failMessage = (err: unknown) => (String((err as Error)?.message ?? err).includes("full") ? "Sorry, this session just filled up." : "Booking failed, please try again.");
