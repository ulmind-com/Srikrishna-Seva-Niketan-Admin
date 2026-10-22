import type { FieldConfig } from "./types";
import type { ImageAsset } from "@/types/models";

export type { FieldConfig, ImageAsset };

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
    case "number":
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
