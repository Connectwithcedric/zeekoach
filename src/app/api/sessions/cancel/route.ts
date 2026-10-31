import { json, pool, requestUser } from "@/lib/server/db";
import { getSession, refundBooking } from "@/lib/server/refund";

// The Koach cancels a session: everyone who booked gets a full refund.
export async function POST(req: Request) {
  if (!pool) return json({ error: "Sessions aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { sessionId } = (await req.json()) as { sessionId: string };
  const session = await getSession(sessionId);
  if (!session || session.koach_id !== user.id) return json({ error: "Only the Koach can cancel this session." }, 403);
  if (session.status === "cancelled") return json({ cancelled: true });
  const { rows } = await pool.query(`select user_id, total, credit_used, payment_ref from public.bookings where session_id = $1 and status = 'confirmed'`, [sessionId]);
  // Each booking is marked cancelled right after its refund, so trying again never refunds twice.
  let failed = 0;
  for (const b of rows) {
    if (!(await refundBooking(b.payment_ref, b.total, b.credit_used))) {
      failed++;
      continue;
    }
    await pool.query(`update public.bookings set status = 'cancelled' where session_id = $1 and user_id = $2`, [sessionId, b.user_id]);
    await pool.query(
      `insert into public.notifications (user_id, actor_id, kind, target, text) values ($1, $2, 'booking', '/bookings', $3)`,
      [b.user_id, user.id, `cancelled “${session.title}”. Your payment is refunded.`],
    );
  }
  if (failed) return json({ error: `${failed} refund(s) didn't go through. Try cancelling again in a minute.` }, 502);
  await pool.query(`update public.sessions set status = 'cancelled', cancelled_at = now() where id = $1`, [sessionId]);
  return json({ cancelled: true, refunded: rows.length });
}
