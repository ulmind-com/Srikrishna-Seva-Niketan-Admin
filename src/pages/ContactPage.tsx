import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Mail, Phone, Trash2, Archive, Reply, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { ContactMessage, ContactStatus } from "@/types/models";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { cn, formatDateTime, initials, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody } from "@/components/ui/table";

const STATUS_ACTIONS: { label: string; value: ContactStatus }[] = [
  { label: "Mark as read", value: "read" },
  { label: "Mark as replied", value: "replied" },
  { label: "Close", value: "closed" },
];

export function ContactPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("contacts:update");
  const canDelete = hasPermission("contacts:delete");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  const params: ListParams = useMemo(
    () => ({ page: 1, page_size: 50, search: search || undefined }),
    [search]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", "list", params],
    queryFn: () => http.list<ContactMessage>(endpoints.contact.root, params),
  });

  const items = data?.items ?? [];
  const active = selected ?? items[0] ?? null;

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) =>
      http.put(`${endpoints.contact.root}/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Message updated");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => http.del(`${endpoints.contact.root}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Message deleted");
      setDeleteTarget(null);
      setSelected(null);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Contact Messages · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Contact Messages"
        description="Read and respond to inbound enquiries."
        icon={<Mail />}
      />

      <Card className="grid overflow-hidden lg:grid-cols-[380px_1fr]">
        {/* List */}
        <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search messages…" />
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {isLoading ? (
              <Table>
                <TableBody>
                  <TableSkeleton rows={6} cols={1} />
                </TableBody>
              </Table>
            ) : items.length === 0 ? (
              <EmptyState icon={<Mail />} title="Inbox empty" description="No messages yet." />
            ) : (
              items.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    active?.id === m.id && "bg-secondary/60",
                    m.status === "new" && "bg-primary/[0.03]"
                  )}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full brand-gradient text-xs font-semibold text-white">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(m.created_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs font-medium text-foreground">
                      {m.service_required ?? m.subject ?? "General Enquiry"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.message}</p>
                  </div>
                  {m.status === "new" && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Reading pane */}
        <div className="min-h-[400px]">
          {!active ? (
            <EmptyState
              icon={<Mail />}
              title="Select a message"
              description="Choose a message from the list to read it."
            />
          ) : (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col"
            >
              <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full brand-gradient font-semibold text-white">
                    {initials(active.name)}
                  </div>
                  <div>
                    <p className="font-semibold">{active.name}</p>
                    <p className="text-sm text-muted-foreground">{active.email}</p>
                  </div>
                </div>
                <StatusBadge status={active.status} />
              </div>

              <div className="flex-1 space-y-5 p-5">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {formatDateTime(active.created_at)}
                  </span>
                  {active.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" /> {active.phone}
                    </span>
                  )}
                  {active.patient_location && (
                    <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-full text-xs text-foreground/80">
                      Location: {active.patient_location}
                    </span>
                  )}
                </div>
                {(active.service_required || active.subject) && (
                  <h3 className="text-lg font-semibold">{active.service_required ?? active.subject}</h3>
                )}
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {active.message}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 p-4">
                <Button asChild>
                  <a href={`mailto:${active.email}?subject=Re: ${active.service_required ?? active.subject ?? "Your enquiry"}`}>
                    <Reply /> Reply by email
                  </a>
                </Button>
                {canUpdate &&
                  STATUS_ACTIONS.map((a) => (
                    <Button
                      key={a.value}
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: active.id, status: a.value })}
                    >
                      {a.value === "closed" ? <Archive /> : null}
                      {a.label}
                    </Button>
                  ))}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(active)}
                  >
                    <Trash2 /> Delete
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete message?"
        description="This message will be permanently removed."
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
