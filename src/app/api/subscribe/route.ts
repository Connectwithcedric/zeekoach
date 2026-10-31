import { json, pool, requestUser, stripe } from "@/lib/server/db";
import { customerFor } from "@/lib/server/wallet";

// Subscribe to a Koach plan with Stripe Checkout (test mode), with an optional coupon.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { planId, coupon: rawCode } = (await req.json()) as { planId: string; coupon?: string };
  const [plan] = (await pool.query("select * from public.plans where id = $1 and active", [planId])).rows;
  if (!plan) return json({ error: "That plan isn't available." }, 404);

  let discounts: { coupon: string }[] | undefined;
  const code = String(rawCode ?? "").toUpperCase().trim();
  if (code) {
    const [c] = (await pool.query("select * from public.coupons where code = $1 and active and (expires_at is null or expires_at > now()) and (max_uses is null or uses < max_uses)", [code])).rows;
    if (!c) return json({ error: "That coupon doesn't work." }, 400);
    let sc = c.stripe_coupon_id as string | null;
    if (!sc) {
      sc = (await stripe.coupons.create({ percent_off: c.percent_off, duration: c.months === 1 ? "once" : "repeating", ...(c.months > 1 ? { duration_in_months: c.months } : {}), name: code })).id;
      await pool.query("update public.coupons set stripe_coupon_id = $2 where code = $1", [code, sc]);
    }
    discounts = [{ coupon: sc }];
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const cs = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(user.id, user.email),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(Number(plan.price) * 100), recurring: { interval: plan.interval }, product_data: { name: `zKoach ${plan.name}` } } }],
    discounts,
    metadata: { kind: "plan", user_id: user.id, plan_id: plan.id, coupon: code },
    success_url: `${origin}/upgrade?subscribed={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/upgrade`,
  });
  return json({ url: cs.url });
}
