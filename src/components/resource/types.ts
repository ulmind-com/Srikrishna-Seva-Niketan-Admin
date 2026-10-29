import type { ReactNode } from "react";
import type { CrudService } from "@/services/crud.factory";

export type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "richtext"
  | "select"
  | "customer"
  | "switch"
  | "image"
  | "video"
  | "tags"
  | "date"
  | "geopoint"
  | "divider";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  name: string; // supports dot paths, e.g. "seo.meta_title"
  label: string;
  type: FieldType;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  options?: FieldOption[];
  /** For `select` fields whose options are loaded from the API at runtime
   *  (e.g. a branch/location picker). Takes precedence is given to static
   *  `options` when both are set. */
  /** Shown inside an API-backed picker when the list comes back empty. */
  emptyMessage?: string;
  dynamicOptions?: {
    queryKey: string;
    fetch: () => Promise<FieldOption[]>;
  };
  colSpan?: 1 | 2;
  section?: string;
  folder?: string; // image upload folder
  defaultValue?: unknown;
  min?: number;
  max?: number;
  /** For `geopoint` fields — the flat form keys the pin writes to. */
  latField?: string;
  lngField?: string;
}

export interface ColumnConfig<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headClassName?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FieldOption[];
}

export interface ResourceConfig<T extends { id: string }> {
  name: string; // singular, e.g. "Service"
  titlePlural: string; // e.g. "Services"
  description?: string;
  icon: ReactNode;
  service: CrudService<T>;
  queryKey: string;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  filters?: FilterConfig[];
  /** Filter values applied on first load (user can still change them). */
  defaultFilters?: Record<string, string>;
  searchPlaceholder?: string;
  permission: string; // resource key for RBAC, e.g. "services"
  defaultSort?: string;
  formWidth?: "md" | "lg" | "xl";
  getRowTitle?: (row: T) => string;
}
