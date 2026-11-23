import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CalendarCheck, Download, Eye, Sparkles, UserCheck, UserPlus, Contact, Loader2 } from "lucide-react";
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
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

export function ComprehensiveBookingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [exporting, setExporting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const convertMutation = useMutation({
    mutationFn: (bookingId: string) => {
      setConvertingId(bookingId);
      return bookingService.convertToCustomer(bookingId);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`✓ কাস্টমারে সফলভাবে যুক্ত হয়েছে: ${res.customer.name} (${res.customer.code})`);
      setConvertingId(null);
      navigate(`/customers?edit=${res.customer.id}`);
    },
    onError: (err) => {
      setConvertingId(null);
      toast.error(normalizeError(err).message);
    },
  });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: (status as BookingStatus) || undefined,
      source: "Comprehensive",
    }),
    [page, pageSize, search, status]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", "list", params],
    queryFn: () => bookingService.list(params),
  });

  const items = data?.items ?? [];

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await bookingService.exportCsv({ source: "Comprehensive" });
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
        <title>Comprehensive Bookings · {env.APP_NAME}</title>
      </Helmet>

      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">
              Comprehensive Bookings
            </span>
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
        }
        description="Premium dashboard for reviewing and managing comprehensive service bookings."
        icon={<CalendarCheck className="text-primary" />}
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
                    {b.customer_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers?edit=${b.customer_id}`);
                        }}
                        className="mt-1 inline-flex items-center gap-1 rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-colors"
                        title="View / Edit Customer in Customers register"
                      >
                        <Contact className="h-3 w-3" />
                        <span>Customer Linked</span>
                      </button>
                    )}
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
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!b.customer_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 text-xs font-semibold shadow-xs"
                          onClick={() => convertMutation.mutate(b.id)}
                          disabled={convertMutation.isPending && convertingId === b.id}
                          title="Add this booking into Customers database"
                        >
                          {convertMutation.isPending && convertingId === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5 text-purple-400" />
                          )}
                          <span>Add to Customer</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-purple-500/30 bg-purple-500/5 text-purple-400 hover:bg-purple-500/15 text-xs font-medium shadow-xs"
                          onClick={() => navigate(`/customers?edit=${b.customer_id}`)}
                          title="Open customer profile to edit or view details"
                        >
                          <Contact className="h-3.5 w-3.5 text-purple-400" />
                          <span>Edit Customer</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-semibold shadow-xs"
                        onClick={() => setAssigningBooking(b)}
                        title="Assign Nurse or Duty"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Assign Duty</span>
                      </Button>
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
