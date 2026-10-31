import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Download, Eye, UserCheck } from "lucide-react";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { Booking, BookingStatus } from "@/types/models";
import { bookingService } from "@/services/booking.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn, downloadBlob, formatDate } from "@/lib/utils";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
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
import { BookingDrawer } from "./BookingDrawer";
import { BookingAssignmentDrawer } from "@/components/bookings/BookingAssignmentDrawer";

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

export function BookingsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [exporting, setExporting] = useState(false);

  const completeMutation = useMutation({
    mutationFn: (id: string) => bookingService.changeStatus(id, "completed"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("✓ কাজ সম্পন্ন হিসেবে মার্ক করা হয়েছে (Duty completed)");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: (status as BookingStatus) || undefined,
    }),
    [page, pageSize, search, status]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", "list", params],
    queryFn: () => bookingService.list(params),
    refetchInterval: 20_000,
  });

  const items = data?.items ?? [];

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await bookingService.exportCsv();
      downloadBlob(blob, `bookings-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Export ready");
    } catch (err) {
      toast.error(normalizeError(err).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Bookings · {env.APP_NAME}</title>
      </Helmet>

      <PageHeader
        title="Bookings"
        description="Review, approve and manage all service bookings."
        icon={<CalendarCheck />}
        actions={
          hasPermission("bookings:view") && (
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download /> Export CSV
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search by name, phone or reference…"
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
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Reference</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Preferred date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={7} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={<CalendarCheck />}
                    title="No bookings found"
                    description="Bookings submitted from your website will appear here."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((b, idx) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                  onClick={() => setSelected(b)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {b.reference}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{b.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{b.contact_phone}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.service_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                        b.payment_type === "postpaid"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-sky-500/30 bg-sky-500/10 text-sky-400"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          b.payment_type === "postpaid" ? "bg-amber-400" : "bg-sky-400"
                        )}
                      />
                      {b.payment_type === "postpaid" ? "Postpaid" : "Prepaid"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(b.preferred_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={b.status} />
                      {b.assigned_staff_name && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25"
                          title={`Assigned to ${b.assigned_staff_name}`}
                        >
                          <UserCheck className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[120px]">{b.assigned_staff_name}</span>
                          {b.staff_acceptance_status === "accepted" && <VerifiedBadge size={13} />}
                        </span>
                      )}
                      {b.staff_acceptance_status === "accepted" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          ✓ Nurse Accepted
                        </span>
                      ) : b.staff_acceptance_status === "declined" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
                          ✗ Nurse Declined
                        </span>
                      ) : b.assigned_staff_name ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                          ⏳ Awaiting Nurse
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(b.status === "assigned" || b.status === "in_progress") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-semibold shadow-xs"
                          onClick={() => completeMutation.mutate(b.id)}
                          disabled={completeMutation.isPending}
                          title="Mark Duty Complete"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Complete</span>
                        </Button>
                      )}
                      {b.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 text-xs font-semibold shadow-xs"
                          onClick={() => setAssigningBooking(b)}
                          title="Assign Nurse or Duty"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                          <span>{b.assigned_staff_name ? "Reassign" : "Assign Duty"}</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSelected(b)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
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

      <BookingDrawer
        booking={selected}
        onClose={() => setSelected(null)}
        onAssignDuty={(b) => {
          setSelected(null);
          setAssigningBooking(b);
        }}
      />

      <BookingAssignmentDrawer
        booking={assigningBooking}
        onClose={() => setAssigningBooking(null)}
      />
    </div>
  );
}
