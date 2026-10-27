import { resourceServices } from "@/services/resources";
import type { FieldConfig } from "@/components/resource/types";
import { STORAGE_KEYS } from "@/config/env";

/** The signed-in user's scoping, read from storage (no React context needed). */
function currentScope(): { isSuper: boolean; locationIds: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return { isSuper: false, locationIds: [] };
    const u = JSON.parse(raw) as {
      is_superuser?: boolean;
      location_ids?: string[];
    };
    return {
      isSuper: Boolean(u.is_superuser),
      locationIds: u.location_ids ?? [],
    };
  } catch {
    return { isSuper: false, locationIds: [] };
  }
}

/** Shared loader for branch/location select options (used by employees,
 *  customers, assignments, expenses and payments forms).
 *
 *  A branch manager only ever sees their own branch(es), so they cannot even
 *  pick another branch — matching the backend, which rejects cross-branch
 *  writes outright. */
export async function loadBranchOptions() {
  const res = await resourceServices.locations.list({ page_size: 100 });
  const { isSuper, locationIds } = currentScope();
  const items =
    isSuper || locationIds.length === 0
      ? res.items
      : res.items.filter((b) => locationIds.includes(b.id));
  return items.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }));
}

/** Branch id → readable name, so pickers can show which branch a record is in. */
async function branchNames(): Promise<Record<string, string>> {
  try {
    const res = await resourceServices.locations.list({ page_size: 100 });
    return Object.fromEntries(res.items.map((b) => [b.id, b.name]));
  } catch {
    // A missing branch name must never stop the picker from listing people.
    return {};
  }
}

/** Loader for customer select options (assignments, payments forms). */
export async function loadCustomerOptions() {
  const [res, names] = await Promise.all([
    resourceServices.customers.list({ page_size: 100 }),
    branchNames(),
  ]);
  return res.items
    .map((c) => ({
      label: [`${c.name} (${c.code})`, names[c.location_id]]
        .filter(Boolean)
        .join(" · "),
      value: c.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Loader for employee select options (assignments forms). */
export async function loadEmployeeOptions() {
  const [res, names] = await Promise.all([
    resourceServices.employees.list({ page_size: 100 }),
    branchNames(),
  ]);
  return res.items
    .map((e) => ({
      label: [`${e.name} (${e.code})`, e.category, names[e.location_id]]
        .filter(Boolean)
        .join(" · "),
      value: e.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** A ready-made `location_id` form field backed by the live branch list. */
export function branchField(overrides: Partial<FieldConfig> = {}): FieldConfig {
  return {
    name: "location_id",
    label: "Branch",
    type: "select",
    required: true,
    section: "Branch",
    placeholder: "Select branch…",
    helper: "The branch this record belongs to.",
    dynamicOptions: { queryKey: "branches", fetch: loadBranchOptions },
    ...overrides,
  };
}
