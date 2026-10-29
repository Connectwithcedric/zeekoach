import { failMessage, json, pool, requestUser, saveBooking, stripe } from "@/lib/server/db";

// Called when Stripe sends the person back: saves the booking once Stripe says it's paid.
export async function POST(req: Request) {
  if (!pool || !stripe) return json({ error: "Payments aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in to finish booking." }, 401);
  const { checkoutId } = (await req.json()) as { checkoutId: string };

  const cs = await stripe.checkout.sessions.retrieve(checkoutId).catch(() => null);
  const m = cs?.metadata;
  if (!cs || !m || m.user_id !== user.id) return json({ error: "We couldn't find that payment." }, 404);
  if (cs.payment_status !== "paid") return json({ error: "The payment hasn't gone through." }, 402);
  try {
    await saveBooking(m.session_id, user.id, Number(m.guests), m.total ? Number(m.total) : (cs.amount_total ?? 0) / 100, cs.id, Number(m.credit ?? 0));
    return json({ booked: true, sessionId: m.session_id });
  } catch (err) {
    // The spot filled up between paying and coming back: refund straight away.
    if (cs.payment_intent) await stripe.refunds.create({ payment_intent: String(cs.payment_intent) }).catch(() => null);
    return json({ error: `${failMessage(err)} Your payment was refunded.` }, 409);
  }
}
