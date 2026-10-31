import "server-only";
import { pool, stripe } from "@/lib/server/db";

// Refunds what was paid by card for a booking (gift credit comes back on its own once the booking is cancelled).
export async function refundBooking(paymentRef: string | null, total: number, creditUsed: number) {
  const card = Math.round((Number(total) - Number(creditUsed)) * 100);
  if (!stripe || !paymentRef || card <= 0) return true;
  const cs = await stripe.checkout.sessions.retrieve(paymentRef).catch(() => null);
  if (!cs?.payment_intent) return false;
  const r = await stripe.refunds.create({ payment_intent: String(cs.payment_intent), amount: Math.min(card, cs.amount_total ?? card) }).catch(() => null);
  return !!r;
}

export async function getSession(id: string) {
  const { rows } = await pool!.query(`select id, koach_id, title, starts_at, status from public.sessions where id = $1`, [id]);
  return rows[0] as { id: string; koach_id: string; title: string; starts_at: Date; status: string } | undefined;
}
