import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CalendarCheck, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { Booking, BookingStatus } from "@/types/models";
import { bookingService } from "@/services/booking.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { downloadBlob, formatDate } from "@/lib/utils";
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

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

export function BookingsPage() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [exporting, setExporting] = useState(false);

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
              <TableHead>Preferred date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
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
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(b.preferred_date)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(b);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

      <BookingDrawer booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
