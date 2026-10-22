import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import { Users as UsersIcon, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { ListParams } from "@/types/api";
import type { User } from "@/types/models";
import { userService, type UserCreatePayload } from "@/services/user.service";
import { resourceServices } from "@/services/resources";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { formatDate, humanize, initials } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";

interface UserForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  location_ids: string[];
  is_active: boolean;
  is_superuser: boolean;
}

export function UsersPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users:create");
  const canUpdate = hasPermission("users:update");
  const canDelete = hasPermission("users:delete");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const params: ListParams = useMemo(
    () => ({ page, page_size: pageSize, search: search || undefined }),
    [page, pageSize, search]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["users", "list", params],
    queryFn: () => userService.list(params),
  });
  const { data: roles } = useQuery({
    queryKey: ["users", "roles"],
    queryFn: () => userService.roles(),
  });
  const { data: locationsData } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
  });
  const branches = locationsData?.items ?? [];

  const form = useForm<UserForm>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "admin",
      location_ids: [],
      is_active: true,
      is_superuser: false,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "admin",
      location_ids: [],
      is_active: true,
      is_superuser: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    form.reset({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone ?? "",
      role: user.role,
      location_ids: user.location_ids ?? [],
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: (values: UserForm) => {
      if (editing) {
        const { ...rest } = values;
        return userService.update(editing.id, {
          name: rest.name,
          phone: rest.phone,
          role: rest.role,
          location_ids: rest.location_ids,
          is_active: rest.is_active,
          is_superuser: rest.is_superuser,
        });
      }
      return userService.create(values as UserCreatePayload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(editing ? "User updated" : "User created");
      setDialogOpen(false);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => userService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Users · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Users"
        description="Manage admin and staff accounts and their roles."
        icon={<UsersIcon />}
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus /> New user
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search users…"
            className="w-full sm:max-w-xs"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              {(canUpdate || canDelete) && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={<UsersIcon />} title="No users" />
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {u.avatar?.url && <AvatarImage src={u.avatar.url} />}
                        <AvatarFallback>{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_superuser ? "default" : "secondary"}>
                      {u.is_superuser ? "Super Admin" : humanize(u.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.is_active ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_login_at ? formatDate(u.last_login_at) : "Never"}
                  </TableCell>
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
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem destructive onClick={() => setDeleteTarget(u)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update this user's details and permissions."
                  : "Create a new admin or staff account."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input {...form.register("name", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  disabled={Boolean(editing)}
                  {...form.register("email", { required: true })}
                />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" {...form.register("password", { required: !editing })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...form.register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(v) => form.setValue("role", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(roles ?? []).map((r) => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!form.watch("is_superuser") && (
                <div className="space-y-1.5">
                  <Label>Assigned branches</Label>
                  <p className="text-xs text-muted-foreground">
                    Select the branch(es) a manager may access. Leave empty for
                    head-office / all-branch access.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {branches.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No branches yet — create one under Branches first.
                      </span>
                    )}
                    {branches.map((b) => {
                      const selected = (form.watch("location_ids") ?? []).includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            const cur = form.watch("location_ids") ?? [];
                            form.setValue(
                              "location_ids",
                              selected ? cur.filter((x) => x !== b.id) : [...cur, b.id]
                            );
                          }}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <span className="text-sm font-medium">Active account</span>
                <Switch
                  checked={form.watch("is_active")}
                  onCheckedChange={(v) => form.setValue("is_active", v)}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Super admin</p>
                  <p className="text-xs text-muted-foreground">Full unrestricted access</p>
                </div>
                <Switch
                  checked={form.watch("is_superuser")}
                  onCheckedChange={(v) => form.setValue("is_superuser", v)}
                />
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={save.isPending}>
                {editing ? "Save changes" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete user?"
        description={`"${deleteTarget?.name}" will lose access immediately.`}
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
