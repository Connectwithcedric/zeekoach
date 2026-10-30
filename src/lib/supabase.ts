import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when the app runs without the Supabase integration (for example locally),
// so screens can fall back to the demo data instead of crashing.
export const supabase = url && key ? createClient(url, key) : null;

export type Profile = {
  id: string;
  name: string;
  username: string | null;
  role: "member" | "koach" | "prokoach";
  bio: string;
  city: string;
  avatar_url: string | null;
  sports?: string[];
  hourly_rate?: number | null;
  onboarded?: boolean;
};
