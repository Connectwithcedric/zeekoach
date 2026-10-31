import "server-only";
import { pool, stripe } from "@/lib/server/db";

export const money = (v: unknown) => Math.round(Number(v) * 100) / 100;

export async function summary(uid: string) {
  const { rows } = await pool!.query("select * from public.wallet_summary($1)", [uid]);
  const r = rows[0] ?? {};
  return { balance: money(r.balance ?? 0), withdrawable: money(r.withdrawable ?? 0), pending: money(r.pending ?? 0), giftLeft: money(r.gift_left ?? 0) };
}

// Moves money between two wallets in one transaction, locked per sender so two clicks can't overspend.
export async function transfer(from: string, to: string, amount: number, note: string, tip: boolean, after?: (q: (sql: string, args: unknown[]) => Promise<unknown>) => Promise<void>) {
  const client = await pool!.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [from]);
    const { rows } = await client.query("select withdrawable from public.wallet_summary($1)", [from]);
    // Gift credit is only for bookings, so it can't be sent on.
    if (money(rows[0]?.withdrawable ?? 0) < amount) {
      await client.query("rollback");
      return { error: "Not enough money in your wallet. Add funds first." };
    }
    await client.query(
      `insert into public.wallet_transactions (user_id, amount, kind, counterparty_id, note) values ($1, $2, $3, $4, $5), ($4, $6, $7, $1, $5)`,
      [from, -amount, tip ? "tip_sent" : "send", to, note, amount, tip ? "tip_received" : "receive"],
    );
    if (after) await after((sql, args) => client.query(sql, args));
    await client.query("commit");
    return { ok: true };
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// The person's Stripe customer, made on first use, so cards can be saved and reused.
export async function customerFor(uid: string, email?: string) {
  const { rows } = await pool!.query("select customer_id from public.stripe_customers where user_id = $1", [uid]);
  if (rows[0]) return rows[0].customer_id as string;
  const c = await stripe!.customers.create({ email, metadata: { user_id: uid } });
  await pool!.query("insert into public.stripe_customers (user_id, customer_id) values ($1, $2) on conflict (user_id) do nothing", [uid, c.id]);
  const again = await pool!.query("select customer_id from public.stripe_customers where user_id = $1", [uid]);
  return again.rows[0].customer_id as string;
}
