import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { FileUser, FileText, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { ApplicationStatus, JobApplication } from "@/types/models";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { formatDate } from "@/lib/utils";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const STATUSES: ApplicationStatus[] = [
  "received",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
];

export function ApplicationsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("applications:update");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<JobApplication | null>(null);

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
    queryKey: ["applications", "list", params],
    queryFn: () =>
      http.list<JobApplication>(endpoints.careers.applications, params),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      http.put(endpoints.careers.application(id), { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application updated");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Job Applications · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Job Applications"
        description="Review and manage candidate applications."
        icon={<FileUser />}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search by name, email, reference…"
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
              <TableHead>Candidate</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Resume</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={<FileUser />}
                    title="No applications"
                    description="Job applications submitted from your website will appear here."
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(a)}
                >
                  <TableCell>
                    <p className="font-medium">{a.full_name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{a.job_title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(a.created_at)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {a.resume?.url ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={a.resume.url} target="_blank" rel="noreferrer">
                          <FileText className="h-3.5 w-3.5" /> View
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canUpdate ? (
                      <Select
                        value={a.status}
                        onValueChange={(v) =>
                          update.mutate({ id: a.id, status: v as ApplicationStatus })
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
                      <StatusBadge status={a.status} />
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

      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.full_name}</SheetTitle>
                <SheetDescription>
                  Applied for {selected.job_title} · {selected.reference}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {selected.email}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {selected.phone}
                </div>
                {selected.qualification && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Qualification</p>
                    <p className="text-sm">{selected.qualification}</p>
                  </div>
                )}
                {selected.experience && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Experience</p>
                    <p className="text-sm">{selected.experience}</p>
                  </div>
                )}
                {selected.preferred_duty && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Preferred Duty</p>
                    <p className="text-sm">{selected.preferred_duty}</p>
                  </div>
                )}
                {selected.preferred_location && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Preferred Location</p>
                    <p className="text-sm">{selected.preferred_location}</p>
                  </div>
                )}
                {selected.previous_employer && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Previous Employer</p>
                    <p className="text-sm">{selected.previous_employer}</p>
                  </div>
                )}
                {selected.relevant_skills && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Relevant Skills</p>
                    <p className="whitespace-pre-wrap text-sm">{selected.relevant_skills}</p>
                  </div>
                )}
                {selected.certificates && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Certificates</p>
                    <p className="whitespace-pre-wrap text-sm">{selected.certificates}</p>
                  </div>
                )}
                {selected.cover_letter && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Cover letter
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      {selected.cover_letter}
                    </p>
                  </div>
                )}
                {selected.resume?.url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={selected.resume.url} target="_blank" rel="noreferrer">
                      <FileText /> Open resume
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
