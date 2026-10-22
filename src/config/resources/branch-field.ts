import { resourceServices } from "@/services/resources";
import type { FieldConfig } from "@/components/resource/types";

/** Shared loader for branch/location select options (used by employees,
 *  customers, assignments, expenses and payments forms). */
export async function loadBranchOptions() {
  const res = await resourceServices.locations.list({ page_size: 100 });
  return res.items.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }));
}

/** Loader for customer select options (assignments, payments forms). */
export async function loadCustomerOptions() {
  const res = await resourceServices.customers.list({ page_size: 200 });
  return res.items.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id }));
}

/** Loader for employee select options (assignments forms). */
export async function loadEmployeeOptions() {
  const res = await resourceServices.employees.list({ page_size: 200 });
  return res.items.map((e) => ({
    label: `${e.name} (${e.code}) · ${e.category}`,
    value: e.id,
  }));
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
