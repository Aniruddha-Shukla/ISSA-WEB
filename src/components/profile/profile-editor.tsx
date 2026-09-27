"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { errorMessage, isSafeHttpUrl } from "@/lib/utils";
import { BRANCHES } from "@/components/auth/signup-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const MAX_AVATAR = 2 * 1024 * 1024;

export function ProfileEditor({ profile, prominent }: { profile: Profile; prominent?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    roll_no: profile.roll_no ?? "",
    branch: profile.branch ?? "",
    year: profile.year ? String(profile.year) : "",
    bio: profile.bio ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function uploadAvatar(file: File) {
    if (file.size > MAX_AVATAR) {
      toast.error("Image too large", "Please use an image under 2 MB.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      toast.error("Upload failed", errorMessage(error));
      return;
    }
    setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    for (const key of ["github_url", "linkedin_url"] as const) {
      if (form[key] && !isSafeHttpUrl(form[key])) {
        toast.error("Invalid link", "Profile links must start with https://");
        return;
      }
    }
    setSaving(true);
    const { error } = await getSupabaseBrowserClient()
      .from("profiles")
      .update({
        full_name: form.full_name.trim() || null,
        roll_no: form.roll_no.trim() || null,
        branch: form.branch || null,
        year: form.year ? Number(form.year) : null,
        bio: form.bio.trim() || null,
        github_url: form.github_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save profile", errorMessage(error));
      return;
    }
    toast.success("Profile updated");
    setOpen(false);
    await refreshProfile();
    router.refresh();
  }

  return (
    <>
      <Button variant={prominent ? "primary" : "secondary"} size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden /> {prominent ? "Complete profile" : "Edit profile"}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit profile"
        description="Your roll number, branch and year are only visible to you and the core team."
        size="lg"
      >
        <form id="profile-form" onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <Avatar name={form.full_name || profile.email} src={avatarUrl} size={64} />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3 py-2 text-sm text-muted transition-colors focus-within:border-primary/60 hover:border-primary/40 hover:text-ink">
              <Camera className="size-4" aria-hidden /> Change photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
            </label>
          </div>
          <Field label="Full name" htmlFor="pf-name" className="sm:col-span-2">
            <Input id="pf-name" maxLength={80} value={form.full_name} onChange={set("full_name")} />
          </Field>
          <Field label="Roll number" htmlFor="pf-roll">
            <Input id="pf-roll" maxLength={40} value={form.roll_no} onChange={set("roll_no")} />
          </Field>
          <Field label="Year" htmlFor="pf-year">
            <Select id="pf-year" value={form.year} onChange={set("year")}>
              <option value="">Select…</option>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Branch" htmlFor="pf-branch" className="sm:col-span-2">
            <Select id="pf-branch" value={form.branch} onChange={set("branch")}>
              <option value="">Select…</option>
              {(BRANCHES.includes(form.branch) || !form.branch ? BRANCHES : [...BRANCHES, form.branch]).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bio" htmlFor="pf-bio" hint="Up to 500 characters" className="sm:col-span-2">
            <Textarea id="pf-bio" maxLength={500} rows={3} value={form.bio} onChange={set("bio")} />
          </Field>
          <Field label="GitHub" htmlFor="pf-gh">
            <Input
              id="pf-gh"
              type="url"
              placeholder="https://github.com/…"
              value={form.github_url}
              onChange={set("github_url")}
            />
          </Field>
          <Field label="LinkedIn" htmlFor="pf-li">
            <Input
              id="pf-li"
              type="url"
              placeholder="https://linkedin.com/in/…"
              value={form.linkedin_url}
              onChange={set("linkedin_url")}
            />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
