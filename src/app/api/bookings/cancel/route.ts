import { json, pool, requestUser } from "@/lib/server/db";
import { getSession, refundBooking } from "@/lib/server/refund";

// A member cancels their booking. Until 24 hours before the start they get their money back.
export async function POST(req: Request) {
  if (!pool) return json({ error: "Bookings aren't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { sessionId } = (await req.json()) as { sessionId: string };
  const session = await getSession(sessionId);
  if (!session) return json({ error: "Session not found." }, 404);
  const { rows } = await pool.query(`select total, credit_used, payment_ref from public.bookings where session_id = $1 and user_id = $2 and status = 'confirmed'`, [sessionId, user.id]);
  const b = rows[0];
  if (!b) return json({ error: "You don't have a booking for this session." }, 404);
  if (new Date(session.starts_at).getTime() < Date.now()) return json({ error: "This session has already started." }, 409);
  const refund = new Date(session.starts_at).getTime() - Date.now() > 24 * 3600_000;
  if (refund && !(await refundBooking(b.payment_ref, b.total, b.credit_used))) return json({ error: "The refund didn't go through. Try again in a minute." }, 502);
  await pool.query(`update public.bookings set status = 'cancelled' where session_id = $1 and user_id = $2`, [sessionId, user.id]);
  await pool.query(
    `insert into public.notifications (user_id, actor_id, kind, target, text) values ($1, $2, 'booking', $3, $4)`,
    [session.koach_id, user.id, `/sessions/${sessionId}`, `cancelled their booking for “${session.title}”`],
  );
  return json({ cancelled: true, refunded: refund });
}
