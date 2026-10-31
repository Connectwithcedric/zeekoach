"use client";

import { supabase } from "@/lib/supabase";

// POST to one of our server routes as the signed-in person.
export async function api<T = Record<string, unknown>>(path: string, body: unknown): Promise<T & { error?: string }> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ error: "Something went wrong, try again." }));
}
