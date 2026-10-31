import { json, pool } from "@/lib/server/db";
import { hashCode } from "@/lib/server/phone";

export async function POST(req: Request) {
  const { phone, code } = (await req.json().catch(() => ({}))) as { phone?: string; code?: string };
  if (!pool || !phone || !code) return json({ error: "Type the 6-digit code." }, 400);
  const { rows } = await pool.query("update public.phone_codes set tries = tries + 1 where phone = $1 returning code_hash, expires_at, tries", [phone]);
  const row = rows[0];
  if (!row || Date.parse(row.expires_at) < Date.now()) return json({ error: "This code has expired. Ask for a new one." }, 400);
  if (row.tries > 5) return json({ error: "Too many tries. Ask for a new code." }, 400);
  if (row.code_hash !== hashCode(phone, code.trim())) return json({ error: "Wrong code." }, 400);
  await pool.query("update public.phone_codes set verified_at = now() where phone = $1", [phone]);
  return json({ ok: true });
}
