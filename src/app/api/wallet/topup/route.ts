import { json, pool, requestUser, stripe } from "@/lib/server/db";
import { customerFor, money } from "@/lib/server/wallet";

// Add funds: Stripe Checkout (test mode), saving the card for next time.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { amount: raw } = (await req.json()) as { amount: number };
  const amount = money(raw);
  if (!(amount >= 5 && amount <= 1000)) return json({ error: "Add between $5 and $1,000." }, 400);
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: await customerFor(user.id, user.email),
    payment_intent_data: { setup_future_usage: "on_session" },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(amount * 100), product_data: { name: "zKoach wallet top-up" } } }],
    metadata: { kind: "topup", user_id: user.id, amount: String(amount) },
    success_url: `${origin}/wallet?topup={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/wallet`,
  });
  return json({ url: checkout.url });
}
