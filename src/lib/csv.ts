/**
 * RFC 4180 CSV with protection against spreadsheet formula injection: cells
 * that start with = + - @ (or tab/CR) are prefixed with a quote so Excel and
 * Sheets treat them as text instead of executing them.
 */
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text =
    value instanceof Date
      ? value.toISOString()
      : Array.isArray(value)
        ? value.join("; ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
  if (DANGEROUS_PREFIX.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: { key: keyof T & string; header: string }[]) {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, header: key }));
  const lines = [cols.map((c) => cell(c.header)).join(",")];
  for (const row of rows) lines.push(cols.map((c) => cell(row[c.key])).join(","));
  // BOM so Excel opens UTF-8 (names with accents, ₹, etc.) correctly
  return "﻿" + lines.join("\r\n") + "\r\n";
}
