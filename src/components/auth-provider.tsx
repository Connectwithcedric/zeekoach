"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/lib/supabase";

type Auth = { ready: boolean; user: User | null; profile: Profile | null; refresh: () => Promise<void> };

const AuthContext = createContext<Auth>({ ready: false, user: null, profile: null, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!supabase || !u) return setProfile(null);
    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // Supabase advises against awaiting other calls inside this callback.
      setTimeout(() => loadProfile(u).finally(() => setReady(true)), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(user), [loadProfile, user]);

  return <AuthContext value={{ ready, user, profile, refresh }}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
