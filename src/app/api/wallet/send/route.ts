import { json, pool, requestUser } from "@/lib/server/db";
import { money, transfer } from "@/lib/server/wallet";

// Send money or a tip to someone, or pay a money request they sent you.
export async function POST(req: Request) {
  if (!pool) return json({ error: "The wallet isn't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const body = (await req.json()) as { to?: string; amount?: number; note?: string; tip?: boolean; requestId?: string };
  let to = body.to ?? "";
  let amount = money(body.amount);
  let note = String(body.note ?? "").slice(0, 200);
  if (body.requestId) {
    const { rows } = await pool.query("select requester_id, payer_id, amount, note, status from public.money_requests where id = $1", [body.requestId]);
    const r = rows[0];
    if (!r || r.payer_id !== user.id) return json({ error: "We couldn't find that request." }, 404);
    if (r.status !== "pending") return json({ error: "This request was already answered." }, 409);
    to = r.requester_id;
    amount = money(r.amount);
    note = r.note || "Paid your request";
  }
  if (!/^[0-9a-f-]{36}$/.test(to) || to === user.id) return json({ error: "Pick who to send it to." }, 400);
  if (!(amount >= 1 && amount <= 5000)) return json({ error: "Send between $1 and $5,000." }, 400);
  const { rows: who } = await pool.query("select 1 from public.profiles where id = $1", [to]);
  if (!who.length) return json({ error: "That person no longer exists." }, 404);
  const { rows: blocked } = await pool.query("select 1 from public.blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)", [user.id, to]);
  if (blocked.length) return json({ error: "You can't send money to this person." }, 403);
  const r = await transfer(user.id, to, amount, note, !!body.tip, body.requestId
    ? async (q) => {
        await q("update public.money_requests set status = 'paid' where id = $1 and status = 'pending'", [body.requestId]);
      }
    : undefined);
  if (r.error) return json({ error: r.error }, 402);
  return json({ sent: amount });
}
