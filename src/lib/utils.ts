import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO date string as a readable date. */
export function formatDate(value?: string | null, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  try {
    return format(typeof value === "string" ? parseISO(value) : value, pattern);
  } catch {
    return "—";
  }
}

/** Format an ISO date string as date + time. */
export function formatDateTime(value?: string | null): string {
  return formatDate(value, "dd MMM yyyy, HH:mm");
}

/** Relative time e.g. "3 hours ago". */
export function timeAgo(value?: string | null): string {
  if (!value) return "—";
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return "—";
  }
}

/** Currency formatter (INR by default). */
export function formatCurrency(value?: number | null, currency = "INR"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact number formatting: 1200 → 1.2K. */
export function formatCompact(value?: number | null): string {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

/** Turn a string into initials, e.g. "Super Admin" → "SA". */
export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Title-case a snake/kebab string: "in_progress" → "In Progress". */
export function humanize(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Basic slugify for previewing slugs in forms. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Download a Blob as a file. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
