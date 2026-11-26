import type { FieldConfig, FieldOption } from "./types";
import type { ImageAsset } from "@/types/models";

export type { FieldConfig, FieldOption, ImageAsset };

/** Get a nested value by dot path. */
function getPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj
    );
}

/** Set a nested value by dot path (mutating helper on a fresh object). */
function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function fallbackForType(field: FieldConfig): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  switch (field.type) {
    case "switch":
      return false;
    case "tags":
      return [];
    case "shift_windows":
    case "documents":
      return [];
    case "number":
    case "geopoint":
    case "duty_schedule":
      return undefined;
    case "image":
    case "video":
      return null;
    default:
      return "";
  }
}

/** Build react-hook-form default values from field config + initial record. */
export function buildDefaults(
  fields: FieldConfig[],
  initial?: Record<string, unknown> | object
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const existing = initial ? getPath(initial, field.name) : undefined;
    setPath(
      out,
      field.name,
      existing !== undefined && existing !== null
        ? existing
        : fallbackForType(field)
    );
    if (field.type === "documents") {
      const existingDocs = Array.isArray(out[field.name]) ? (out[field.name] as unknown[]) : [];
      if (existingDocs.length === 0 && initial) {
        const initObj = initial as Record<string, unknown>;
        const hydrated: Record<string, unknown>[] = [];
        if (initObj.id_proof_type || initObj.id_proof_number || initObj.id_proof) {
          hydrated.push({
            doc_type: (initObj.id_proof_type as string) || "Aadhaar",
            doc_number: (initObj.id_proof_number as string) || "",
            file: initObj.id_proof ?? null,
          });
        }
        if (
          (initObj.voter_number || initObj.voter_photo) &&
          !hydrated.some((d) => String(d.doc_type).toLowerCase().includes("voter"))
        ) {
          hydrated.push({
            doc_type: "Voter ID",
            doc_number: (initObj.voter_number as string) || "",
            file: initObj.voter_photo ?? null,
          });
        }
        if (
          (initObj.pan_number || initObj.pan_photo) &&
          !hydrated.some((d) => String(d.doc_type).toLowerCase() === "pan")
        ) {
          hydrated.push({
            doc_type: "PAN",
            doc_number: (initObj.pan_number as string) || "",
            file: initObj.pan_photo ?? null,
          });
        }
        out[field.name] = hydrated;
      }
    }
    if (field.type === "duty_schedule") {
      const initObj = (initial || {}) as Record<string, unknown>;
      if (out.shift === undefined) out.shift = initObj.shift ?? "full_24h";
      if (out.start_date === undefined) out.start_date = initObj.start_date ?? new Date().toISOString().slice(0, 10);
      if (out.start_time === undefined) out.start_time = initObj.start_time ?? "08:00";
      if (out.end_date === undefined) out.end_date = initObj.end_date ?? null;
      if (out.end_time === undefined) out.end_time = initObj.end_time ?? (initObj.end_date ? "20:00" : null);
      if (out.shift_windows === undefined) out.shift_windows = initObj.shift_windows ?? [];
    }
  }
  return out;
}

export interface FieldSection {
  title: string;
  fields: FieldConfig[];
}

/** Group fields by their `section` property, preserving order. */
export function groupSections(fields: FieldConfig[]): FieldSection[] {
  const sections: FieldSection[] = [];
  const index = new Map<string, FieldSection>();
  for (const field of fields) {
    const title = field.section ?? "__default__";
    let section = index.get(title);
    if (!section) {
      section = { title, fields: [] };
      index.set(title, section);
      sections.push(section);
    }
    section.fields.push(field);
  }
  return sections;
}
