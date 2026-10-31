import { json, pool, requestUser, stripe } from "@/lib/server/db";
import { customerFor } from "@/lib/server/wallet";

// Saved cards: list them, remove one, or add a new one through Stripe.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { action, id } = (await req.json()) as { action: "list" | "remove" | "add"; id?: string };
  const customer = await customerFor(user.id, user.email);
  if (action === "remove" && id) {
    const pm = await stripe.paymentMethods.retrieve(id).catch(() => null);
    if (!pm || pm.customer !== customer) return json({ error: "We couldn't find that card." }, 404);
    await stripe.paymentMethods.detach(id);
  }
  if (action === "add") {
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const cs = await stripe.checkout.sessions.create({ mode: "setup", customer, currency: "usd", success_url: `${origin}/wallet?card=added`, cancel_url: `${origin}/wallet` });
    return json({ url: cs.url });
  }
  const list = await stripe.paymentMethods.list({ customer, type: "card" });
  return json({ cards: list.data.map((c) => ({ id: c.id, brand: c.card?.brand ?? "card", last4: c.card?.last4 ?? "", exp: `${c.card?.exp_month}/${String(c.card?.exp_year ?? "").slice(2)}` })) });
}
