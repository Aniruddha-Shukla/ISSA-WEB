"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";

const DOMAIN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function SettingsForm() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [domains, setDomains] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getSupabaseBrowserClient()
      .from("app_settings")
      .select("*")
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Couldn't load settings", error.message);
          return;
        }
        const s = data as AppSettings;
        setSettings(s);
        setDomains(s.allowed_domains.join(", "));
      });
  }, [toast]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    const list = domains
      .split(/[\s,]+/)
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);
    const invalid = list.find((d) => !DOMAIN.test(d));
    if (invalid) {
      toast.error("Invalid domain", `“${invalid}” doesn't look like a domain (example: college.edu).`);
      return;
    }
    if (settings.restrict_signups && list.length === 0) {
      toast.error("Add a domain first", "Restricting sign-ups needs at least one allowed domain.");
      return;
    }
    setSaving(true);
    const { error } = await getSupabaseBrowserClient()
      .from("app_settings")
      .update({
        allowed_domains: list,
        restrict_signups: settings.restrict_signups,
        auto_member_for_domains: settings.auto_member_for_domains,
      })
      .eq("id", true);
    setSaving(false);
    if (error) toast.error("Couldn't save settings", errorMessage(error));
    else {
      setSettings({ ...settings, allowed_domains: list });
      setDomains(list.join(", "));
      toast.success("Settings saved");
    }
  }

  if (!settings) return <Skeleton className="h-72 w-full" />;

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6 card p-6">
      <Field
        label="College email domains"
        htmlFor="domains"
        hint="Comma-separated, e.g. college.edu, student.college.edu. Sub-domains match automatically."
      >
        <Input id="domains" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="college.edu" />
      </Field>
      <Switch
        id="auto-member"
        label="Verify college emails as members"
        description="New accounts from these domains get the Member role automatically. Everyone else starts as Guest."
        checked={settings.auto_member_for_domains}
        onChange={(v) => setSettings({ ...settings, auto_member_for_domains: v })}
      />
      <Switch
        id="restrict"
        label="Only allow college emails to sign up"
        description="Enforced in the database for email and Google sign-ups alike."
        checked={settings.restrict_signups}
        onChange={(v) => setSettings({ ...settings, restrict_signups: v })}
      />
      {settings.restrict_signups ? (
        <Notice tone="warning">Existing accounts from other domains keep working; this only affects new sign-ups.</Notice>
      ) : null}
      <Button type="submit" loading={saving}>
        <Save className="size-4" aria-hidden /> Save settings
      </Button>
    </form>
  );
}
