// Applies the SQL files in db/migrations that haven't run yet. Runs before every
// build on Vercel, where the Supabase integration provides POSTGRES_URL_NON_POOLING.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.log("migrate: no POSTGRES_URL_NON_POOLING, skipping");
  process.exit(0);
}

const dir = path.join(process.cwd(), "db/migrations");
// Supabase uses a certificate chain Node doesn't know; the connection is still encrypted.
const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
client.on("notice", (n) => console.log(`migrate: ${n.severity}: ${n.message}`));
await client.connect();
try {
  await client.query("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  await client.query("alter table public.schema_migrations enable row level security");
  const done = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`migrate: applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`migrate: ${file} failed: ${err.message}`);
    }
  }
} finally {
  await client.end();
}
