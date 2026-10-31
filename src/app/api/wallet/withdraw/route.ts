import { json, pool, requestUser } from "@/lib/server/db";
import { money } from "@/lib/server/wallet";

// Ask for a payout. The money leaves the wallet now and zKoach pays it out by hand until Stripe payouts are set up.
export async function POST(req: Request) {
  if (!pool) return json({ error: "The wallet isn't switched on yet." }, 503);
  const user = await requestUser(req);
  if (!user) return json({ error: "Log in first." }, 401);
  const { amount: raw, payoutTo } = (await req.json()) as { amount: number; payoutTo: string };
  const amount = money(raw);
  const to = String(payoutTo ?? "").trim().slice(0, 200);
  if (to.length < 4) return json({ error: "Say where to send the money (bank account or PayPal email)." }, 400);
  if (!(amount >= 10)) return json({ error: "You can withdraw $10 or more." }, 400);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [user.id]);
    const { rows } = await client.query("select withdrawable from public.wallet_summary($1)", [user.id]);
    if (money(rows[0]?.withdrawable ?? 0) < amount) {
      await client.query("rollback");
      return json({ error: "That's more than you can withdraw." }, 402);
    }
    const w = await client.query("insert into public.withdrawals (user_id, amount, payout_to) values ($1, $2, $3) returning id", [user.id, amount, to]);
    await client.query("insert into public.wallet_transactions (user_id, amount, kind, ref, note, status) values ($1, $2, 'withdraw', $3, 'Withdrawal', 'pending')", [user.id, -amount, w.rows[0].id]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  return json({ requested: amount });
}
