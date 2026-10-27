import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { resourceServices } from "@/services/resources";
import { describeError } from "@/services/api/client";
import {
  loadBranchOptions,
  loadCustomerOptions,
} from "@/config/resources/branch-field";
import { AsyncSelect } from "@/components/common/AsyncSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Customer picker for the assignment form.
 *
 * Normally you pick an existing customer, but if the person is new you can type
 * their details right here instead of leaving to the Customers page first — a
 * customer still needs a name and phone to bill against, so the inline form
 * collects those plus the branch rather than taking a bare name.
 */
export function CustomerField({
  value,
  onChange,
  id,
}: {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", location_id: "" });

  const customers = useQuery({
    queryKey: ["field-options", "customer-options"],
    queryFn: loadCustomerOptions,
    staleTime: 60_000,
  });

  const branches = useQuery({
    queryKey: ["field-options", "branches"],
    queryFn: loadBranchOptions,
    staleTime: 60_000,
    enabled: adding,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      resourceServices.customers.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        location_id: form.location_id || undefined,
      } as never),
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["field-options", "customer-options"] });
      onChange(customer.id);
      setAdding(false);
      setForm({ name: "", phone: "", location_id: "" });
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
          <div>
            <Label className="text-xs">Branch</Label>
            <Select
              value={form.location_id || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, location_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch…" />
              </SelectTrigger>
              <SelectContent>
                {(branches.data ?? []).map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Must match the staff member's branch.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!canCreate || createMutation.isPending}
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
        options={customers.data ?? []}
        isLoading={customers.isLoading}
        isError={customers.isError}
        onRetry={() => void customers.refetch()}
        placeholder="Select customer…"
        emptyMessage="No customers yet — add one below."
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
