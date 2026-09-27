"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ImageUp, Pencil, Plus, RefreshCw, Search, Trash } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, errorMessage, isoToLocalInput, localInputToIso, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { EmptyState, Notice, Skeleton } from "@/components/ui/feedback";

export type FieldType =
  "text" | "textarea" | "url" | "image" | "number" | "select" | "tags" | "boolean" | "datetime" | "date" | "slug";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For slug fields: the field whose value generates the slug. */
  from?: string;
  wide?: boolean;
};

export type ColumnDef<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

export type ResourceConfig<T extends { id: string }> = {
  table: string;
  singular: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  order: { column: string; ascending?: boolean }[];
  search: (row: T) => string;
  defaults?: Record<string, unknown>;
  publishField?: string;
  rowActions?: (row: T) => ReactNode;
};

type FormValues = Record<string, string | boolean>;

function toForm(fields: FieldDef[], row: Record<string, unknown> | null, defaults: Record<string, unknown> = {}): FormValues {
  const values: FormValues = {};
  for (const f of fields) {
    const raw = row ? row[f.name] : defaults[f.name];
    if (f.type === "boolean") values[f.name] = Boolean(raw ?? false);
    else if (f.type === "tags") values[f.name] = Array.isArray(raw) ? raw.join(", ") : "";
    else if (f.type === "datetime") values[f.name] = isoToLocalInput(raw as string | null);
    else if (f.type === "date") values[f.name] = typeof raw === "string" ? raw.slice(0, 10) : "";
    else values[f.name] = raw === null || raw === undefined ? "" : String(raw);
  }
  return values;
}

function fromForm(fields: FieldDef[], values: FormValues) {
  const payload: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "boolean") payload[f.name] = Boolean(v);
    else if (f.type === "tags")
      payload[f.name] = String(v ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    else if (f.type === "number") payload[f.name] = v === "" ? null : Number(v);
    else if (f.type === "datetime") payload[f.name] = localInputToIso(String(v));
    else if (f.type === "date") payload[f.name] = v ? String(v) : null;
    else payload[f.name] = typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v;
  }
  return payload;
}

/** Unique, URL-safe storage path for an uploaded file. */
function storagePath(prefix: string, file: File) {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-60);
  return `${prefix}/${Date.now()}-${safe}`;
}

export async function revalidatePublicPages() {
  try {
    await fetch("/api/revalidate", { method: "POST" });
  } catch {
    // pages still refresh within a minute via ISR
  }
}

export function ResourceManager<T extends { id: string }>({ config }: { config: ResourceConfig<T> }) {
  const toast = useToast();
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    let request = getSupabaseBrowserClient().from(config.table).select("*");
    for (const o of config.order) request = request.order(o.column, { ascending: o.ascending ?? true });
    const { data, error: loadError } = await request;
    if (loadError) setError(loadError.message);
    else {
      setError(null);
      setRows((data as T[]) ?? []);
    }
  }, [config.table, config.order]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((row) => !q || config.search(row).toLowerCase().includes(q));
  }, [rows, query, config]);

  function openCreate() {
    setValues(toForm(config.fields, null, config.defaults));
    setCreating(true);
  }

  function openEdit(row: T) {
    setValues(toForm(config.fields, row as unknown as Record<string, unknown>));
    setEditing(row);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const payload = fromForm(config.fields, values);
    // auto-generate slugs from their source field
    for (const f of config.fields) {
      if (f.type === "slug" && !payload[f.name] && f.from) payload[f.name] = slugify(String(values[f.from] ?? ""));
    }
    const supabase = getSupabaseBrowserClient();
    const result = editing
      ? await supabase.from(config.table).update(payload).eq("id", editing.id)
      : await supabase.from(config.table).insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error(`Couldn't save ${config.singular}`, errorMessage(result.error));
      return;
    }
    toast.success(editing ? `${config.singular} updated` : `${config.singular} created`);
    close();
    await load();
    void revalidatePublicPages();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { error: deleteError } = await getSupabaseBrowserClient().from(config.table).delete().eq("id", deleting.id);
    if (deleteError) toast.error("Delete failed", errorMessage(deleteError));
    else {
      toast.success(`${config.singular} deleted`);
      void revalidatePublicPages();
    }
    setDeleting(null);
    await load();
  }

  async function togglePublish(row: T) {
    if (!config.publishField) return;
    const field = config.publishField;
    const next = !(row as unknown as Record<string, boolean>)[field];
    setRows((all) => all?.map((r) => (r.id === row.id ? { ...r, [field]: next } : r)) ?? null);
    const { error: updateError } = await getSupabaseBrowserClient()
      .from(config.table)
      .update({ [field]: next })
      .eq("id", row.id);
    if (updateError) {
      toast.error("Update failed", errorMessage(updateError));
      await load();
      return;
    }
    void revalidatePublicPages();
  }

  async function upload(fieldName: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", "Images must be under 10 MB.");
      return;
    }
    setUploading(fieldName);
    const supabase = getSupabaseBrowserClient();
    const path = storagePath(config.table, file);
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    setUploading(null);
    if (uploadError) {
      toast.error("Upload failed", errorMessage(uploadError));
      return;
    }
    const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    setValues((v) => ({ ...v, [fieldName]: url }));
  }

  const renderField = (f: FieldDef) => {
    const id = `${config.table}-${f.name}`;
    const value = values[f.name];
    const set = (v: string | boolean) => setValues((all) => ({ ...all, [f.name]: v }));
    const wide = f.wide || ["textarea", "image", "tags"].includes(f.type);

    if (f.type === "boolean") {
      return (
        <div key={f.name} className={cn("rounded-xl border border-line px-4 py-3", wide && "sm:col-span-2")}>
          <Switch id={id} label={f.label} description={f.hint} checked={Boolean(value)} onChange={set} />
        </div>
      );
    }

    let control: ReactNode;
    switch (f.type) {
      case "textarea":
        control = (
          <Textarea
            id={id}
            rows={5}
            value={String(value ?? "")}
            onChange={(e) => set(e.target.value)}
            required={f.required}
            placeholder={f.placeholder}
          />
        );
        break;
      case "select":
        control = (
          <Select id={id} value={String(value ?? "")} onChange={(e) => set(e.target.value)} required={f.required}>
            {!f.required ? <option value="">—</option> : null}
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        );
        break;
      case "image":
        control = (
          <div className="flex gap-2">
            <Input
              id={id}
              type="url"
              value={String(value ?? "")}
              onChange={(e) => set(e.target.value)}
              placeholder="https://… or upload"
            />
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3 text-sm text-muted focus-within:border-primary/60 hover:border-primary/40 hover:text-ink">
              <ImageUp className="size-4" aria-hidden />
              {uploading === f.name ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(f.name, file);
                }}
              />
            </label>
          </div>
        );
        break;
      default:
        control = (
          <Input
            id={id}
            type={
              f.type === "number"
                ? "number"
                : f.type === "url"
                  ? "url"
                  : f.type === "datetime"
                    ? "datetime-local"
                    : f.type === "date"
                      ? "date"
                      : "text"
            }
            value={String(value ?? "")}
            onChange={(e) => set(e.target.value)}
            required={f.required}
            placeholder={f.type === "slug" && f.from ? "auto-generated from the title" : f.placeholder}
            pattern={f.type === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
          />
        );
    }

    return (
      <Field
        key={f.name}
        label={f.label}
        htmlFor={id}
        hint={f.hint}
        required={f.required}
        className={cn(wide && "sm:col-span-2")}
      >
        {control}
      </Field>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input
            aria-label={`Search ${config.singular.toLowerCase()}s`}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => void load()} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden /> New {config.singular.toLowerCase()}
          </Button>
        </div>
      </div>

      {error ? (
        <Notice tone="error" title="Couldn't load data" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {rows === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={rows.length ? "No matches" : `No ${config.singular.toLowerCase()}s yet`}
          description={rows.length ? "Try a different search." : `Create the first ${config.singular.toLowerCase()}.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-surface-2 font-mono text-xs tracking-wider text-faint uppercase">
              <tr>
                {config.columns.map((c) => (
                  <th key={c.header} scope="col" className={cn("px-4 py-3 font-medium", c.className)}>
                    {c.header}
                  </th>
                ))}
                {config.publishField ? (
                  <th scope="col" className="px-4 py-3 font-medium">
                    Published
                  </th>
                ) : null}
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {filtered.map((row) => (
                <tr key={row.id} className="align-middle hover:bg-white/[0.02]">
                  {config.columns.map((c) => (
                    <td key={c.header} className={cn("px-4 py-3", c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                  {config.publishField ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean((row as unknown as Record<string, boolean>)[config.publishField])}
                        aria-label="Published"
                        onClick={() => void togglePublish(row)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
                          (row as unknown as Record<string, boolean>)[config.publishField]
                            ? "border-primary/60 bg-primary/80"
                            : "border-line-strong bg-surface-3",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block size-3.5 rounded-full bg-white transition-transform",
                            (row as unknown as Record<string, boolean>)[config.publishField]
                              ? "translate-x-4"
                              : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {config.rowActions?.(row)}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(row)}
                        aria-label={`Edit ${config.singular.toLowerCase()}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(row)}
                        aria-label={`Delete ${config.singular.toLowerCase()}`}
                        className="hover:text-danger"
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={creating || Boolean(editing)}
        onClose={close}
        title={editing ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        size="lg"
      >
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          {config.fields.map(renderField)}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save changes" : `Create ${config.singular.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete this ${config.singular.toLowerCase()}?`}
        description="This can't be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              <Trash className="size-4" aria-hidden /> Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Anything that depends on it (for example registrations of an event) is removed as well.
        </p>
      </Dialog>
    </div>
  );
}
