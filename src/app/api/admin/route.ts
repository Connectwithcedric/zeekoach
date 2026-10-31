import { json, pool } from "@/lib/server/db";
import { requireAdmin, signedUrl } from "@/lib/server/admin";

const notify = (uid: string, kind: string, target: string, text: string) =>
  pool!.query("insert into public.notifications (user_id, kind, target, text) values ($1, $2, $3, $4)", [uid, kind, target, text]);

// Everything the admin page reads and changes. Only admins get in.
export async function POST(req: Request) {
  if (!pool) return json({ error: "The database isn't connected." }, 503);
  const admin = await requireAdmin(req);
  if (!admin) return json({ error: "Only zKoach admins can open this." }, 403);
  const b = (await req.json()) as Record<string, unknown> & { action: string };
  const q = (sql: string, args: unknown[] = []) => pool!.query(sql, args).then((r) => r.rows);

  switch (b.action) {
    case "overview": {
      const [applications, ids, withdrawals, reports, plans, coupons, admins, stats] = await Promise.all([
        q(`select a.*, p.name, p.username from public.prokoach_applications a join public.profiles p on p.id = a.user_id where a.status = 'pending' order by a.created_at`),
        q(`select c.user_id, c.doc_path, c.created_at, p.name, p.username from public.identity_checks c join public.profiles p on p.id = c.user_id where c.status = 'pending' order by c.created_at`),
        q(`select w.*, p.name from public.withdrawals w join public.profiles p on p.id = w.user_id where w.status = 'requested' order by w.created_at`),
        q(`select r.*, p.name as reporter from public.reports r join public.profiles p on p.id = r.reporter_id where r.status = 'open' order by r.created_at desc limit 100`),
        q(`select * from public.plans order by sort, price`),
        q(`select * from public.coupons order by created_at desc`),
        q(`select a.user_id, p.name, u.email from public.admins a join public.profiles p on p.id = a.user_id join auth.users u on u.id = a.user_id`),
        q(`select (select count(*) from public.profiles)::int as people, (select count(*) from public.profiles where role <> 'member')::int as koaches,
                  (select count(*) from public.sessions where starts_at > now() and status = 'scheduled')::int as upcoming,
                  (select count(*) from public.bookings where status = 'confirmed')::int as bookings,
                  (select coalesce(sum(total), 0) from public.bookings where status = 'confirmed')::float as booked_total,
                  (select count(*) from public.subscriptions where status in ('active', 'trialing'))::int as subscribers`),
      ]);
      for (const c of ids) c.url = await signedUrl("ids", c.doc_path);
      return json({ applications, ids, withdrawals, reports, plans, coupons, admins, stats: stats[0] });
    }
    case "application": {
      const status = b.status === "approved" ? "approved" : "declined";
      await q("update public.prokoach_applications set status = $2 where user_id = $1", [b.userId, status]);
      return json({ ok: true });
    }
    case "identity": {
      const ok = b.status === "approved";
      await q("update public.identity_checks set status = $2, note = $3, reviewed_at = now() where user_id = $1", [b.userId, ok ? "approved" : "rejected", String(b.note ?? "").slice(0, 200)]);
      await q("update public.profiles set id_verified = $2 where id = $1", [b.userId, ok]);
      await notify(String(b.userId), "account", "/settings/verification", ok ? "Your ID is verified. Your badge is on." : "We couldn't verify your ID. Please send it again.");
      return json({ ok: true });
    }
    case "withdrawal": {
      const [w] = await q("update public.withdrawals set status = $2, handled_at = now() where id = $1 and status = 'requested' returning user_id, amount", [b.id, b.status === "paid" ? "paid" : "rejected"]);
      if (!w) return json({ error: "Already handled." }, 409);
      if (b.status === "paid") {
        await q("update public.wallet_transactions set status = 'done' where kind = 'withdraw' and ref = $1", [b.id]);
        await notify(w.user_id, "money", "/wallet", `Your $${w.amount} withdrawal was sent.`);
      } else {
        await q("update public.wallet_transactions set status = 'done' where kind = 'withdraw' and ref = $1", [b.id]);
        await q("insert into public.wallet_transactions (user_id, amount, kind, ref, note) values ($1, $2, 'withdraw_returned', $3, 'Withdrawal not sent')", [w.user_id, w.amount, b.id]);
        await notify(w.user_id, "money", "/wallet", `Your $${w.amount} withdrawal couldn't be sent, so the money is back in your wallet.`);
      }
      return json({ ok: true });
    }
    case "report": {
      await q("update public.reports set status = $2 where id = $1", [b.id, b.status === "reviewed" ? "reviewed" : "dismissed"]);
      return json({ ok: true });
    }
    case "plan": {
      const p = b.plan as { id?: string; name: string; description: string; features: string[]; price: number; interval: string; active: boolean; sort: number };
      const args = [p.name, p.description ?? "", (p.features ?? []).filter(Boolean).slice(0, 12), Number(p.price) || 0, p.interval === "year" ? "year" : "month", p.active !== false, Number(p.sort) || 0];
      if (p.id) await q("update public.plans set name = $1, description = $2, features = $3, price = $4, interval = $5, active = $6, sort = $7 where id = $8", [...args, p.id]);
      else await q("insert into public.plans (name, description, features, price, interval, active, sort) values ($1, $2, $3, $4, $5, $6, $7)", args);
      return json({ ok: true });
    }
    case "coupon": {
      const c = b.coupon as { code: string; percent_off: number; months: number; max_uses?: number | null; expires_at?: string | null; active?: boolean };
      const code = String(c.code ?? "").toUpperCase().trim();
      await q(
        `insert into public.coupons (code, percent_off, months, max_uses, expires_at, active) values ($1, $2, $3, $4, $5, $6)
         on conflict (code) do update set active = excluded.active, max_uses = excluded.max_uses, expires_at = excluded.expires_at`,
        [code, Number(c.percent_off), Number(c.months) || 1, c.max_uses || null, c.expires_at || null, c.active !== false],
      );
      return json({ ok: true });
    }
    case "admin": {
      const [u] = await q("select id from auth.users where lower(email) = lower($1)", [String(b.email ?? "").trim()]);
      if (!u) return json({ error: "No zKoach account uses that email." }, 404);
      await q("insert into public.admins (user_id) values ($1) on conflict do nothing", [u.id]);
      return json({ ok: true });
    }
  }
  return json({ error: "Unknown action." }, 400);
}
