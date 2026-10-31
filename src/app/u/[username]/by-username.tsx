"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function ByUsername({ username }: { username: string }) {
  const router = useRouter();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    supabase
      ?.from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle()
      .then(({ data }) => (data ? router.replace(`/profile/${data.id}`) : setMissing(true)));
  }, [username, router]);
  return (
    <div className="mx-auto mt-[30px] max-w-[440px] rounded-card bg-surface px-8 py-12 text-center text-[14px] font-semibold text-muted">
      {missing ? `Nobody is called @${username}.` : "Loading…"}
    </div>
  );
}
