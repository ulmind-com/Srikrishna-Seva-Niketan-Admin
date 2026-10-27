import { useEffect, useMemo, useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { resourceServices } from "@/services/resources";
import { describeError } from "@/services/api/client";
import { loadBranchOptions } from "@/config/resources/branch-field";
import { AsyncSelect } from "@/components/common/AsyncSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Customer picker for the assignment form — branch-aware, so the "staff and
 * customer must belong to the same branch" rule is enforced by the UI instead
 * of only surfacing as an error on save.
 *
 * Once a staff member is chosen, the list is narrowed to that staff member's
 * branch, a customer already picked from a different branch is cleared, and a
 * new customer created inline inherits that same branch. If the person is new
 * you can add them here (name + phone) without leaving the form.
 */
export function CustomerField({
  value,
  onChange,
  id,
  control,
}: {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  control?: Control<Record<string, unknown>>;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  // The staff member chosen in the same form drives the branch constraint.
  const staffId = useWatch({ control, name: "employee_id" }) as
    | string
    | undefined;

  const employees = useQuery({
    queryKey: ["assignment-employees-raw"],
    queryFn: () => resourceServices.employees.list({ page_size: 100 }),
    staleTime: 60_000,
  });
  const customersQ = useQuery({
    queryKey: ["assignment-customers-raw"],
    queryFn: () => resourceServices.customers.list({ page_size: 100 }),
    staleTime: 60_000,
  });
  const branches = useQuery({
    queryKey: ["field-options", "branches"],
    queryFn: loadBranchOptions,
    staleTime: 60_000,
  });

  const branchName = (lid?: string | null) =>
    branches.data?.find((b) => b.value === lid)?.label ?? "";

  const staffBranch = employees.data?.items.find(
    (e) => e.id === staffId,
  )?.location_id;

  const allCustomers = useMemo(
    () => customersQ.data?.items ?? [],
    [customersQ.data],
  );

  // Only customers in the staff member's branch are valid once staff is picked.
  const options = useMemo(() => {
    const visible = staffBranch
      ? allCustomers.filter((c) => c.location_id === staffBranch)
      : allCustomers;
    return visible
      .map((c) => ({
        label: [`${c.name} (${c.code})`, branchName(c.location_id)]
          .filter(Boolean)
          .join(" · "),
        value: c.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCustomers, staffBranch, branches.data]);

  // Drop a selection that no longer matches the staff member's branch.
  useEffect(() => {
    if (!value || !staffBranch) return;
    const current = allCustomers.find((c) => c.id === value);
    if (current && current.location_id !== staffBranch) onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffBranch]);

  const createMutation = useMutation({
    mutationFn: () =>
      resourceServices.customers.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        // New customer joins the staff member's branch so the pair always match.
        location_id: staffBranch || undefined,
      } as never),
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["assignment-customers-raw"] });
      qc.invalidateQueries({ queryKey: ["field-options", "customer-options"] });
      onChange(customer.id);
      setAdding(false);
      setForm({ name: "", phone: "" });
      toast.success("Customer added");
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const canCreate =
    form.name.trim().length >= 2 && form.phone.trim().length >= 4;

  if (adding) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">New customer</p>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Customer's full name"
            />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Mobile number"
            />
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
            <span className="text-muted-foreground">Branch: </span>
            {staffBranch ? (
              <span className="font-medium">{branchName(staffBranch)}</span>
            ) : (
              <span className="text-warning">Select a staff member first</span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!canCreate || !staffBranch || createMutation.isPending}
            >
              {createMutation.isPending ? "Adding…" : "Add customer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AsyncSelect
        id={id}
        value={value}
        onChange={onChange}
        options={options}
        isLoading={customersQ.isLoading}
        isError={customersQ.isError}
        onRetry={() => void customersQ.refetch()}
        placeholder="Select customer…"
        emptyMessage={
          staffBranch
            ? "No customers in this branch yet — add one below."
            : "No customers yet — add one below."
        }
      />
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" /> New customer
      </button>
    </div>
  );
}
