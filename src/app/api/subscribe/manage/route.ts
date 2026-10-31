import { json, pool, requestUser, stripe } from "@/lib/server/db";

// Cancel at the end of the period, restart a cancelled one, or refresh its status from Stripe.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { action } = (await req.json()) as { action: "cancel" | "restart" | "refresh" };
  const [row] = (await pool.query("select stripe_subscription_id from public.subscriptions where user_id = $1", [user.id])).rows;
  if (!row?.stripe_subscription_id) return json({ error: "You don't have a plan." }, 404);
  const sub =
    action === "refresh"
      ? await stripe.subscriptions.retrieve(row.stripe_subscription_id)
      : await stripe.subscriptions.update(row.stripe_subscription_id, { cancel_at_period_end: action === "cancel" });
  const end = sub.items.data[0]?.current_period_end;
  await pool.query("update public.subscriptions set status = $2, cancel_at_period_end = $3, current_period_end = $4, updated_at = now() where user_id = $1", [
    user.id,
    sub.status,
    sub.cancel_at_period_end,
    end ? new Date(end * 1000) : null,
  ]);
  return json({ status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end, periodEnd: end ? new Date(end * 1000).toISOString() : null });
}
