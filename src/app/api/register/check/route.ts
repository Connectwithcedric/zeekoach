import { json, pool } from "@/lib/server/db";
import { usernameProblem } from "@/lib/server/validate";

// Live checks while signing up, like the old app: is this email or username already taken?
export async function POST(req: Request) {
  if (!pool) return json({});
  const { email, username } = (await req.json().catch(() => ({}))) as { email?: string; username?: string };
  const out: { email?: string; username?: string } = {};
  if (email) {
    const { rowCount } = await pool.query("select 1 from auth.users where lower(email) = lower($1) limit 1", [email.trim()]);
    if (rowCount) out.email = "There's already an account with this email.";
  }
  if (username !== undefined) {
    const u = username.trim().toLowerCase();
    const problem = usernameProblem(u);
    if (problem) out.username = problem;
    else {
      const { rowCount } = await pool.query("select 1 from public.profiles where username = $1 limit 1", [u]);
      if (rowCount) out.username = "This username is taken.";
    }
  }
  return json(out);
}
