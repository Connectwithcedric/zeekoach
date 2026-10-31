import { randomInt } from "node:crypto";
import { json, pool } from "@/lib/server/db";
import { hashCode } from "@/lib/server/phone";

// Sends a 6-digit code by SMS through Twilio. Without Twilio keys it says so, and sign up goes on unverified.
export async function POST(req: Request) {
  const { phone } = (await req.json().catch(() => ({}))) as { phone?: string };
  if (!phone || !/^\+\d{7,15}$/.test(phone)) return json({ error: "Check the phone number." }, 400);
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
  if (!pool || !sid || !token || !from) return json({ configured: false });

  const { rows } = await pool.query("select expires_at from public.phone_codes where phone = $1", [phone]);
  if (rows[0] && Date.parse(rows[0].expires_at) - 10 * 60_000 > Date.now() - 30_000) return json({ error: "Wait 30 seconds before asking for a new code." }, 429);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    body: new URLSearchParams({ From: from, To: phone, Body: `${code} is your zKoach code. It expires in 10 minutes.` }),
  });
  if (!res.ok) return json({ error: "We couldn't send an SMS to this number." }, 400);
  await pool.query(
    `insert into public.phone_codes (phone, code_hash, expires_at, tries, verified_at) values ($1, $2, now() + interval '10 minutes', 0, null)
     on conflict (phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0, verified_at = null`,
    [phone, hashCode(phone, code)],
  );
  return json({ configured: true });
}
