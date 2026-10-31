import "server-only";
import { pool, requestUser } from "@/lib/server/db";

// The signed-in user, only if they're a zKoach admin.
export async function requireAdmin(req: Request) {
  const user = await requestUser(req);
  if (!user || !pool) return null;
  const { rows } = await pool.query("select 1 from public.admins where user_id = $1", [user.id]);
  return rows.length ? user : null;
}

// A short-lived link to a private file (an ID photo), when the server has the Supabase service key.
export async function signedUrl(bucket: string, path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/storage/v1/object/sign/${bucket}/${path}`, { method: "POST", headers: { authorization: `Bearer ${key}`, apikey: key, "content-type": "application/json" }, body: JSON.stringify({ expiresIn: 600 }) });
  const j = (await r.json().catch(() => null)) as { signedURL?: string } | null;
  return j?.signedURL ? `${url}/storage/v1${j.signedURL}` : null;
}
