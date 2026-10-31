import { createClient } from "@supabase/supabase-js";
import { json, pool } from "@/lib/server/db";

// Log in with a phone number, username or email, like the old app. We find the account's email, then sign in with it.
export async function POST(req: Request) {
  const { id, password } = (await req.json().catch(() => ({}))) as { id?: string; password?: string };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!pool || !url || !key || !id || !password) return json({ error: "Type your login and password." }, 400);

  let email = id.trim();
  if (!email.includes("@")) {
    const phone = /^\+?[\d\s().-]{7,}$/.test(email) ? `+${email.replace(/\D/g, "")}` : null;
    const { rows } = await pool.query(
      `select u.email from public.profiles p join auth.users u on u.id = p.id left join public.private_details d on d.user_id = p.id
       where ($1::text is not null and d.phone = $1) or p.username = lower($2) limit 1`,
      [phone, email],
    );
    if (!rows[0]) return json({ error: "Wrong login or password." }, 400);
    email = rows[0].email;
  }

  const supa = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return json({ error: "Confirm your email first: tap the link we sent you." }, 400);
    return json({ error: "Wrong login or password." }, 400);
  }
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
