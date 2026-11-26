import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import type { ListParams } from "@/types/api";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ResourceForm } from "./ResourceForm";
import type { ResourceConfig } from "./types";

export interface ResourceViewProps<T extends { id: string }> {
  config: ResourceConfig<T>;
  extraRowAction?: (row: T) => React.ReactNode;
  extraDropdownItems?: (row: T) => React.ReactNode;
  children?: React.ReactNode;
}

export function ResourceView<T extends { id: string }>({
  config,
  extraRowAction,
  extraDropdownItems,
  children,
}: ResourceViewProps<T>) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [filters, setFilters] = useState<Record<string, string>>(
    config.defaultFilters ?? {},
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const canCreate = hasPermission(`${config.permission}:create`);
  const canUpdate = hasPermission(`${config.permission}:update`);
  const canDelete = hasPermission(`${config.permission}:delete`);

  useEffect(() => {
    if (searchParams.get("action") === "new" && canCreate) {
      setEditing(null);
      setSheetOpen(true);
    }
  }, [searchParams, canCreate]);

  const prefillInitial = useMemo(() => {
    if (editing) return editing;
    const custId = searchParams.get("customer_id");
    if (custId) {
      return { customer_id: custId } as unknown as T;
    }
    return null;
  }, [editing, searchParams]);

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      sort_by: config.defaultSort,
      sort_order: config.defaultSort === "order" ? "asc" : "desc",
      ...filters,
    }),
    [page, pageSize, search, filters, config.defaultSort]
  );

  const listQuery = useQuery({
    queryKey: [config.queryKey, "list", params],
    queryFn: () => config.service.list(params),
  });

  const sanitizeValues = (vals: Record<string, unknown>) => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(vals)) {
      if (typeof v === "string") {
        const trimmed = v.trim();
        cleaned[k] = trimmed === "" ? null : trimmed;
      } else if (typeof v === "number" && isNaN(v)) {
        cleaned[k] = null;
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  };

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const cleaned = sanitizeValues(values);
      return editing
        ? config.service.update(editing.id, cleaned as Partial<T>)
        : config.service.create(cleaned as Partial<T>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      if (config.queryKey === "assignments") {
        qc.invalidateQueries({ queryKey: ["monthly-bills"] });
        qc.invalidateQueries({ queryKey: ["reports"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.invalidateQueries({ queryKey: ["payroll-run"] });
        qc.invalidateQueries({ queryKey: ["payslip"] });
        qc.invalidateQueries({ queryKey: ["daily-roster"] });
      }
      if (config.queryKey === "locations") {
        qc.invalidateQueries({ queryKey: ["payroll-locations"] });
        qc.invalidateQueries({ queryKey: ["field-options"] });
        qc.invalidateQueries({ queryKey: ["branches"] });
        qc.invalidateQueries({ queryKey: ["staff-portal"] });
      }
      toast.success(editing ? `${config.name} updated` : `${config.name} created`);
      handleSheetOpenChange(false);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => config.service.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      if (
        config.queryKey === "locations" ||
        config.queryKey === "employees" ||
        config.queryKey === "customers" ||
        config.queryKey === "assignments"
      ) {
        // Cascading delete affects dashboard, staff, customers, duties, attendance, payslips, bills, and reports
        qc.invalidateQueries();
      }
      toast.success(`${config.name} deleted`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.pagination;
  const colCount = config.columns.length + (canUpdate || canDelete ? 1 : 0);

  const editId = searchParams.get("edit") || searchParams.get("id");

  useEffect(() => {
    if (!editId) return;
    if (editing && (editing as any).id === editId) return;
    const found = items.find((it) => (it as any).id === editId);
    if (found) {
      setEditing(found);
      setSheetOpen(true);
    } else if (config.service?.get) {
      config.service
        .get(editId)
        .then((res) => {
          if (res) {
            setEditing(res);
            setSheetOpen(true);
          }
        })
        .catch(() => {});
    }
  }, [editId, items, config.service, editing]);

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setEditing(null);
      if (searchParams.get("edit") || searchParams.get("id") || searchParams.get("action")) {
        const next = new URLSearchParams(searchParams);
        next.delete("edit");
        next.delete("id");
        next.delete("action");
        setSearchParams(next, { replace: true });
      }
    }
  };

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (row: T) => {
    setEditing(row);
    setSheetOpen(true);
  };

  const sheetWidth =
    config.formWidth === "xl"
      ? "sm:max-w-2xl"
      : config.formWidth === "lg"
        ? "sm:max-w-xl"
        : "sm:max-w-lg";

  return (
    <div className="space-y-6">
      <Helmet>
        <title>
          {config.titlePlural} · Admin · {env.APP_NAME}
        </title>
      </Helmet>

      <PageHeader
        title={config.titlePlural}
        description={config.description}
        icon={config.icon}
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus /> New {config.name}
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder={config.searchPlaceholder ?? `Search ${config.titlePlural.toLowerCase()}…`}
            className="w-full lg:max-w-xs"
          />
          {config.filters && config.filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {config.filters.map((filter) => (
                <Select
                  key={filter.key}
                  value={filters[filter.key] ?? "__all__"}
                  onValueChange={(value) => {
                    setPage(1);
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (value === "__all__") delete next[filter.key];
                      else next[filter.key] = value;
                      return next;
                    });
                  }}
                >
                  <SelectTrigger className="h-10 w-[160px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{filter.label}: All</SelectItem>
                    {filter.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>

        {/* Table — wide column sets get a min width so the overflow-x wrapper
            scrolls horizontally instead of crushing / clipping columns. */}
        <Table style={colCount > 7 ? { minWidth: `${colCount * 118}px` } : undefined}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {config.columns.map((col, i) => (
                <TableHead key={i} className={col.headClassName}>
                  {col.header}
                </TableHead>
              ))}
              {(canUpdate || canDelete || extraRowAction || extraDropdownItems) && (
                <TableHead className="text-right pr-4">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              <TableSkeleton rows={pageSize > 10 ? 8 : 6} cols={colCount} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  <EmptyState
                    icon={config.icon}
                    title={`No ${config.titlePlural.toLowerCase()} found`}
                    description={
                      search || Object.keys(filters).length
                        ? "Try adjusting your search or filters."
                        : canCreate
                          ? `Get started by adding your first ${config.name.toLowerCase()}.`
                          : undefined
                    }
                    action={
                      canCreate && !search ? (
                        <Button onClick={openCreate}>
                          <Plus /> New {config.name}
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((row, idx) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className="border-b border-border transition-colors hover:bg-muted/50"
                >
                  {config.columns.map((col, i) => (
                    <TableCell key={i} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {(canUpdate || canDelete || extraRowAction || extraDropdownItems) && (
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {extraRowAction?.(row)}
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            onClick={() => openEdit(row)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                        )}
                        {(canDelete || extraDropdownItems) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {extraDropdownItems?.(row)}
                              {canDelete && (
                                <DropdownMenuItem
                                  destructive
                                  onClick={() => setDeleteTarget(row)}
                                >
                                  <Trash2 /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  )}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>

        {items.length > 0 && (
          <Pagination
            meta={meta}
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

      {/* Create / Edit drawer */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className={sheetWidth}>
          <SheetHeader>
            <SheetTitle>
              {editing ? `Edit ${config.name}` : `New ${config.name}`}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? config.getRowTitle?.(editing) ??
                  `Update the details below and save your changes.`
                : `Fill in the details to create a new ${config.name.toLowerCase()}.`}
            </SheetDescription>
          </SheetHeader>
          {sheetOpen && (
            <ResourceForm
              fields={config.fields}
              initial={prefillInitial}
              submitting={saveMutation.isPending}
              onCancel={() => handleSheetOpenChange(false)}
              onSubmit={(values) => saveMutation.mutate(values)}
              submitLabel={editing ? "Save changes" : `Create ${config.name}`}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${config.name}?`}
        description={
          deleteTarget
            ? config.queryKey === "locations"
              ? `"${
                  config.getRowTitle?.(deleteTarget) ?? "This branch"
                }" and ALL data under this branch (staff, customers, assignments, attendance, payslips, bills, expenses, payments, and reports) will be permanently deleted. This cannot be undone.`
              : config.queryKey === "employees"
                ? `"${
                    config.getRowTitle?.(deleteTarget) ?? "This staff member"
                  }" and all their assignments, attendance, and payslips will be permanently deleted. This cannot be undone.`
                : config.queryKey === "customers"
                  ? `"${
                      config.getRowTitle?.(deleteTarget) ?? "This customer"
                    }" and all their assignments, bills, payments, and related attendance records will be permanently deleted. This cannot be undone.`
                  : `"${
                      config.getRowTitle?.(deleteTarget) ?? "This item"
                    }" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      {/* Additional custom sheets/dialogs passed by caller */}
      {children}
    </div>
  );
}
