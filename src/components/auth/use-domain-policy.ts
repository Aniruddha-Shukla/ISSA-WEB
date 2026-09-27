"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";

export type DomainPolicy = Pick<AppSettings, "allowed_domains" | "restrict_signups" | "auto_member_for_domains">;

/** Reads the (public) sign-up domain policy so forms can explain it up front. */
export function useDomainPolicy(enabled: boolean) {
  const [policy, setPolicy] = useState<DomainPolicy | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getSupabaseBrowserClient()
      .from("app_settings")
      .select("allowed_domains, restrict_signups, auto_member_for_domains")
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setPolicy(data as DomainPolicy);
      });
    return () => {
      active = false;
    };
  }, [enabled]);
  return policy;
}

export function emailMatchesDomains(email: string, domains: string[]) {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  return domains.some((d) => {
    const allowed = d.toLowerCase().trim();
    return domain === allowed || domain.endsWith(`.${allowed}`);
  });
}
