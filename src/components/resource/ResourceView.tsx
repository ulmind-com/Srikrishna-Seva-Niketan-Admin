import { useMemo, useState } from "react";
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

export function ResourceView<T extends { id: string }>({
  config,
}: {
  config: ResourceConfig<T>;
}) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const canCreate = hasPermission(`${config.permission}:create`);
  const canUpdate = hasPermission(`${config.permission}:update`);
  const canDelete = hasPermission(`${config.permission}:delete`);

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

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editing
        ? config.service.update(editing.id, values as Partial<T>)
        : config.service.create(values as Partial<T>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      toast.success(editing ? `${config.name} updated` : `${config.name} created`);
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => config.service.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      toast.success(`${config.name} deleted`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.pagination;
  const colCount = config.columns.length + (canUpdate || canDelete ? 1 : 0);

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

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {config.columns.map((col, i) => (
                <TableHead key={i} className={col.headClassName}>
                  {col.header}
                </TableHead>
              ))}
              {(canUpdate || canDelete) && (
                <TableHead className="w-16 text-right">Actions</TableHead>
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
                  {(canUpdate || canDelete) && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                          )}
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
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
              initial={editing}
              submitting={saveMutation.isPending}
              onCancel={() => setSheetOpen(false)}
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
            ? `"${
                config.getRowTitle?.(deleteTarget) ?? "This item"
              }" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
