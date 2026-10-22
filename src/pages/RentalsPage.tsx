import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { EquipmentRental, RentalStatus } from "@/types/models";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: RentalStatus[] = [
  "pending",
  "approved",
  "active",
  "returned",
  "rejected",
  "cancelled",
];

export function RentalsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("rentals:update");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
    }),
    [page, pageSize, search, status]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["rentals", "list", params],
    queryFn: () => http.list<EquipmentRental>(endpoints.equipment.rentals, params),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RentalStatus }) =>
      http.put(endpoints.equipment.rental(id), { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("Rental updated");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Rental Requests · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Rental Requests"
        description="Manage medical equipment rental requests."
        icon={<ClipboardList />}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search by customer, phone, reference…"
            className="w-full lg:max-w-sm"
          />
          <Select
            value={status || "__all__"}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v === "__all__" ? "" : v);
            }}
          >
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={<ClipboardList />}
                    title="No rental requests"
                    description="Equipment rental requests will appear here."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                  <TableCell>
                    <p className="font-medium">{r.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{r.customer_phone}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={r.address}>
                      {r.address}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{r.equipment_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.start_date)}
                    {r.end_date ? ` → ${formatDate(r.end_date)}` : ""}
                    {r.duration_days ? <><br/>({r.duration_days} days)</> : ""}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.total_amount ? formatCurrency(r.total_amount) : "—"}
                  </TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <Select
                        value={r.status}
                        onValueChange={(v) =>
                          update.mutate({ id: r.id, status: v as RentalStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={r.status} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {items.length > 0 && (
          <Pagination
            meta={data?.pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPage(1);
              setPageSize(s);
            }}
          />
        )}
      </Card>
    </div>
  );
}
