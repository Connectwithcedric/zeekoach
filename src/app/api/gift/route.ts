import { json, pool, requestUser, stripe } from "@/lib/server/db";

// Starts a gift card purchase: Stripe Checkout (test mode), then /api/gift/confirm saves it.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in to send a gift card." }, 401);
  const { recipientId, amount: rawAmount, message = "" } = (await req.json()) as { recipientId: string; amount: number; message?: string };

  const amount = Math.round(Number(rawAmount) * 100) / 100;
  if (!(amount >= 5 && amount <= 500)) return json({ error: "Gift cards can be from $5 to $500." }, 400);
  if (recipientId === user.id) return json({ error: "Pick someone else to send it to." }, 400);
  const { rows } = await pool.query("select id, name from public.profiles where id = $1", [recipientId]);
  const to = rows[0];
  if (!to) return json({ error: "We couldn't find that person." }, 404);

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(amount * 100), product_data: { name: `zKoach gift card for ${to.name || "a friend"}` } } }],
    metadata: { kind: "gift", buyer_id: user.id, recipient_id: to.id, amount: String(amount), message: String(message).slice(0, 200) },
    success_url: `${origin}/wallet/gift?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/wallet/gift?to=${to.id}`,
  });
  return json({ url: checkout.url });
}
