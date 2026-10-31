import { json, pool, requestUser, stripe } from "@/lib/server/db";

// Back from Stripe: saves the subscription once it's paid (once per checkout).
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { checkoutId } = (await req.json()) as { checkoutId: string };
  const cs = await stripe.checkout.sessions.retrieve(checkoutId, { expand: ["subscription"] }).catch(() => null);
  const m = cs?.metadata;
  if (!cs || !m || m.kind !== "plan" || m.user_id !== user.id || !cs.subscription) return json({ error: "We couldn't find that subscription." }, 404);
  const sub = cs.subscription as unknown as { id: string; status: string; cancel_at_period_end: boolean; items: { data: { current_period_end?: number }[] } };
  const end = sub.items.data[0]?.current_period_end;
  const { rows } = await pool.query("select stripe_subscription_id from public.subscriptions where user_id = $1", [user.id]);
  const isNew = rows[0]?.stripe_subscription_id !== sub.id;
  // Switching plans: stop the old Stripe subscription so nobody pays twice.
  if (isNew && rows[0]?.stripe_subscription_id) await stripe.subscriptions.cancel(rows[0].stripe_subscription_id).catch(() => null);
  await pool.query(
    `insert into public.subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end, coupon, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (user_id) do update set plan_id = excluded.plan_id, stripe_subscription_id = excluded.stripe_subscription_id, status = excluded.status,
       current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end, coupon = excluded.coupon, updated_at = now()`,
    [user.id, m.plan_id, sub.id, sub.status, end ? new Date(end * 1000) : null, sub.cancel_at_period_end, m.coupon || null],
  );
  if (isNew && m.coupon) await pool.query("update public.coupons set uses = uses + 1 where code = $1", [m.coupon]);
  return json({ ok: true });
}
