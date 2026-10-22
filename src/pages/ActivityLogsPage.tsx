import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ScrollText,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Check,
  X,
  Upload,
  Download,
  Activity,
} from "lucide-react";
import type { ListParams } from "@/types/api";
import type { ActivityLog } from "@/types/models";
import { dashboardService } from "@/services/dashboard.service";
import { downloadBlob, formatDateTime, humanize } from "@/lib/utils";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_META: Record<string, { icon: typeof Plus; variant: "success" | "warning" | "danger" | "default" | "muted" }> = {
  create: { icon: Plus, variant: "success" },
  update: { icon: Pencil, variant: "default" },
  delete: { icon: Trash2, variant: "danger" },
  login: { icon: LogIn, variant: "muted" },
  logout: { icon: LogOut, variant: "muted" },
  approve: { icon: Check, variant: "success" },
  reject: { icon: X, variant: "danger" },
  upload: { icon: Upload, variant: "default" },
  export: { icon: Download, variant: "muted" },
};

export function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const params: ListParams = useMemo(
    () => ({ page, page_size: pageSize, search: search || undefined }),
    [page, pageSize, search]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["activity", "list", params],
    queryFn: () => dashboardService.activityLogs(params),
  });

  const items = data?.items ?? [];

  const exportCsv = () => {
    const rows = [
      ["Time", "User", "Action", "Entity", "Description", "IP"],
      ...items.map((l) => [
        formatDateTime(l.created_at),
        l.user_email ?? "",
        l.action,
        l.entity,
        l.description,
        l.ip_address ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "activity-logs.csv");
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Activity Logs · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Activity Logs"
        description="A complete audit trail of every administrative action."
        icon={<ScrollText />}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
            <Download /> Export CSV
          </Button>
        }
      />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search by user, entity or action…"
            className="w-full sm:max-w-sm"
          />
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Activity />} title="No activity yet" description="Admin actions will be recorded here." />
          ) : (
            <ol className="relative space-y-6 before:absolute before:left-[18px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
              {items.map((log: ActivityLog, i) => {
                const meta = ACTION_META[log.action] ?? { icon: Activity, variant: "muted" as const };
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="relative flex gap-4"
                  >
                    <div className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-accent shadow-soft">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant}>{humanize(log.action)}</Badge>
                        <span className="text-sm font-medium text-foreground">
                          {log.description}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.user_email ?? "System"} · {humanize(log.entity)} ·{" "}
                        {formatDateTime(log.created_at)}
                        {log.ip_address ? ` · ${log.ip_address}` : ""}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </div>

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
