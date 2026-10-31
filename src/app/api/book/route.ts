import { failMessage, giftCredit, json, pool, priceFor, requestUser, saveBooking, stripe } from "@/lib/server/db";

// Starts a booking. Paid sessions go to Stripe Checkout (test mode); free sessions,
// or every session while Stripe isn't connected yet, are booked straight away.
export async function POST(req: Request) {
  if (!pool) return json({ error: "Bookings aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in to book." }, 401);
  const { sessionId, guests: rawGuests } = (await req.json()) as { sessionId: string; guests: number };

  const { rows } = await pool.query("select id, title, price, pricing, capacity, booked, starts_at, status from public.sessions where id = $1", [sessionId]);
  const s = rows[0];
  if (!s) return json({ error: "This session no longer exists." }, 404);
  if (new Date(s.starts_at) < new Date()) return json({ error: "This session has already started." }, 400);
  if (s.status === "cancelled") return json({ error: "This session was cancelled by the Koach." }, 400);
  const guests = s.pricing === "private" ? 1 : Math.min(20, Math.max(1, Math.floor(Number(rawGuests) || 1)));
  if (s.booked + guests > s.capacity) return json({ error: "Sorry, there aren't enough spots left." }, 409);
  const total = priceFor(Number(s.price), s.pricing, guests);
  // Gift credit pays first; Stripe charges whatever is left.
  const credit = Math.min(total, await giftCredit(user.id, s.id));
  const due = Math.round((total - credit) * 100) / 100;

  if (!stripe || due === 0) {
    try {
      await saveBooking(s.id, user.id, guests, total, null, credit);
      return json({ booked: true });
    } catch (err) {
      return json({ error: failMessage(err) }, 409);
    }
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(due * 100),
          product_data: { name: s.title, description: `${guests} ${guests === 1 ? "spot" : "spots"}, service fee and VAT included${credit ? `, $${credit.toFixed(2)} gift credit applied` : ""}` },
        },
      },
    ],
    metadata: { session_id: s.id, user_id: user.id, guests: String(guests), total: String(total), credit: String(credit) },
    success_url: `${origin}/book/${s.id}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/book/${s.id}`,
  });
  return json({ url: checkout.url });
}
