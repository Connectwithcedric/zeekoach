import { json, pool, requestUser, stripe } from "@/lib/server/db";

// Called when Stripe sends the buyer back: saves the gift card once Stripe says it's paid.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in to finish." }, 401);
  const { checkoutId } = (await req.json()) as { checkoutId: string };

  const cs = await stripe.checkout.sessions.retrieve(checkoutId).catch(() => null);
  const m = cs?.metadata;
  if (!cs || !m || m.kind !== "gift" || m.buyer_id !== user.id) return json({ error: "We couldn't find that payment." }, 404);
  if (cs.payment_status !== "paid") return json({ error: "The payment hasn't gone through." }, 402);
  await pool.query(
    `insert into public.gift_cards (buyer_id, recipient_id, amount, message, payment_ref) values ($1, $2, $3, $4, $5)
     on conflict (payment_ref) do nothing`,
    [m.buyer_id, m.recipient_id, Number(m.amount), m.message ?? "", cs.id],
  );
  return json({ sent: true, recipientId: m.recipient_id, amount: Number(m.amount) });
}
