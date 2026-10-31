import { json, pool, requestUser, stripe } from "@/lib/server/db";
import { money } from "@/lib/server/wallet";

// Called when Stripe sends the person back: adds the money once Stripe says it's paid (only once per payment).
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { checkoutId } = (await req.json()) as { checkoutId: string };
  const cs = await stripe.checkout.sessions.retrieve(checkoutId).catch(() => null);
  const m = cs?.metadata;
  if (!cs || !m || m.kind !== "topup" || m.user_id !== user.id) return json({ error: "We couldn't find that payment." }, 404);
  if (cs.payment_status !== "paid") return json({ error: "The payment hasn't gone through." }, 402);
  const amount = money(m.amount);
  await pool.query(
    `insert into public.wallet_transactions (user_id, amount, kind, ref, note) values ($1, $2, 'topup', $3, 'Added with card') on conflict do nothing`,
    [user.id, amount, cs.id],
  );
  return json({ added: amount });
}
