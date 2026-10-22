import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Helmet } from "react-helmet-async";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  MapPin,
  Globe,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  Building2,
  ShieldCheck,
} from "lucide-react";
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

interface CredentialShareModalData {
  name: string;
  email: string;
  password?: string;
  role: string;
  branchNames: string[];
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

  // Password visibility & generator
  const [showPassword, setShowPassword] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<CredentialShareModalData | null>(null);
  const [copiedText, setCopiedText] = useState(false);

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
      role: "manager",
      location_ids: [],
      is_active: true,
      is_superuser: false,
    },
  });

  const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz";
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const specials = "@#$%&*";
    const pick = (str: string) => str[Math.floor(Math.random() * str.length)];
    const pass = [
      pick(uppers),
      pick(chars),
      pick(digits),
      pick(specials),
      ...Array.from({ length: 6 }, () => pick(chars + uppers + digits)),
    ]
      .sort(() => 0.5 - Math.random())
      .join("");
    const finalPass = `${pass}1!`;
    form.setValue("password", finalPass);
    setShowPassword(true);
    toast.success("Generated strong password");
  };

  const openCreate = () => {
    setEditing(null);
    setShowPassword(false);
    form.reset({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "manager",
      location_ids: branches[0]?.id ? [branches[0].id] : [],
      is_active: true,
      is_superuser: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setShowPassword(false);
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
        const updatePayload: Partial<User> & { password?: string } = {
          name: rest.name,
          phone: rest.phone,
          role: rest.role,
          location_ids: rest.location_ids,
          is_active: rest.is_active,
          is_superuser: rest.is_superuser,
        };
        if (rest.password && rest.password.trim().length >= 8) {
          updatePayload.password = rest.password.trim();
        }
        return userService.update(editing.id, updatePayload);
      }
      return userService.create(values as UserCreatePayload);
    },
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      const branchNames = (values.location_ids ?? []).map(
        (id) => branches.find((b) => b.id === id)?.name ?? "Branch"
      );

      // If user was newly created or password was updated, pop credential card
      if (!editing || (values.password && values.password.trim())) {
        setCreatedCreds({
          name: values.name,
          email: values.email,
          password: values.password?.trim(),
          role: values.role,
          branchNames,
        });
      }

      toast.success(editing ? "User updated" : "User created successfully");
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

  const copyCredsToClipboard = () => {
    if (!createdCreds) return;
    const branchesText =
      createdCreds.branchNames.length > 0
        ? createdCreds.branchNames.join(", ")
        : "All Branches / Head Office";

    const msg = `*Shri Krishna Nursing — Staff Portal Login*
Role: ${humanize(createdCreds.role)}
Portal URL: ${window.location.origin}/login
Email: ${createdCreds.email}
${createdCreds.password ? `Password: ${createdCreds.password}` : ""}
Assigned Branch: ${branchesText}
Please keep your credentials safe and do not share them.`;

    navigator.clipboard.writeText(msg);
    setCopiedText(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopiedText(false), 2500);
  };

  const items = data?.items ?? [];
  const selectedRole = form.watch("role");
  const isSuperuserChecked = form.watch("is_superuser");
  const selectedLocationIds = form.watch("location_ids") ?? [];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Users & Branch Managers · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Users & Managers"
        description="Assign branch managers to specific locations, manage roles, and control access credentials."
        icon={<UsersIcon />}
        actions={
          canCreate && (
            <Button onClick={openCreate} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Add Manager / User
            </Button>
          )
        }
      />

      <Card className="overflow-hidden border border-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/50 p-4">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search by name or email…"
            className="w-full sm:max-w-xs"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Branch Managers are scoped strictly to their assigned locations
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Branch(es)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              {(canUpdate || canDelete) && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState icon={<UsersIcon />} title="No users found" />
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => {
                const isManager = u.role === "manager";
                const hasLocations = u.location_ids && u.location_ids.length > 0;
                return (
                  <TableRow key={u.id} className="transition-colors hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          {u.avatar?.url && <AvatarImage src={u.avatar.url} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.is_superuser ? "default" : isManager ? "secondary" : "outline"}
                        className={
                          u.is_superuser
                            ? "bg-primary text-primary-foreground font-semibold"
                            : isManager
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : ""
                        }
                      >
                        {u.is_superuser ? "Super Admin" : humanize(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.is_superuser ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
                          <Globe className="h-3 w-3" /> All Locations (Global)
                        </span>
                      ) : hasLocations ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {u.location_ids.map((lid) => {
                            const branch = branches.find((b) => b.id === lid);
                            return (
                              <span
                                key={lid}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-foreground"
                              >
                                <MapPin className="h-3 w-3 text-primary" />
                                {branch ? branch.name : "Branch"}
                              </span>
                            );
                          })}
                        </div>
                      ) : isManager ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <ShieldAlert className="h-3 w-3" /> Unassigned (No Access)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">All Branches</span>
                      )}
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
                                <Pencil className="mr-2 h-4 w-4" /> Edit & Assign Location
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem destructive onClick={() => setDeleteTarget(u)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
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

      {/* Create / Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editing ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editing ? "Edit User & Branch Assignment" : "Create Manager / User Account"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update credentials, assigned branch(es), or reset the login password."
                  : "Create credentials for a branch manager or administrator."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input placeholder="e.g. Rahul Sharma" {...form.register("name", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (Login ID) *</Label>
                  <Input
                    type="email"
                    placeholder="manager@srikrishnanursing.com"
                    disabled={Boolean(editing)}
                    {...form.register("email", { required: true })}
                  />
                </div>
              </div>

              {/* Password field with Generator & Eye Toggle */}
              <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Key className="h-3.5 w-3.5 text-primary" />
                    {editing ? "Reset Password (leave empty to keep current)" : "Login Password *"}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generatePassword}
                    className="h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10 gap-1 px-2"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Strong
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={editing ? "•••••••• (unchanged)" : "Enter login password (min 8 chars)"}
                    className="pr-10 font-mono text-sm"
                    {...form.register("password", { required: !editing })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Must contain min 8 chars with uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input placeholder="+91 98765 43210" {...form.register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
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

              {/* Branch Assignment Section */}
              {!isSuperuserChecked && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        Assign Location / Branch
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {selectedRole === "manager"
                          ? "This manager will strictly access staff, duty shifts, and revenue for selected branch(es)."
                          : "Select which branches this user has jurisdiction over."}
                      </p>
                    </div>
                    {branches.length > 1 && (
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => form.setValue("location_ids", branches.map((b) => b.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => form.setValue("location_ids", [])}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {branches.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No branches found. Please create branches in the Locations section first.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {branches.map((b) => {
                        const selected = selectedLocationIds.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              const cur = selectedLocationIds;
                              form.setValue(
                                "location_ids",
                                selected ? cur.filter((x) => x !== b.id) : [...cur, b.id]
                              );
                            }}
                            className={`flex cursor-pointer items-start justify-between rounded-xl border p-3 transition-all ${
                              selected
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                <MapPin className={`h-3.5 w-3.5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                                {b.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {b.city || "—"} · <span className="font-mono text-[11px]">{b.code}</span>
                              </p>
                            </div>
                            <div
                              className={`grid h-5 w-5 place-items-center rounded-full border transition-colors ${
                                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                              }`}
                            >
                              {selected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedLocationIds.length === 0 && selectedRole === "manager" && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Warning: Please select at least one branch for this manager, otherwise they won't have access to any branch data.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium">Active Account</span>
                    <p className="text-xs text-muted-foreground">Allows login access</p>
                  </div>
                  <Switch
                    checked={form.watch("is_active")}
                    onCheckedChange={(v) => form.setValue("is_active", v)}
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium">Super Admin</span>
                    <p className="text-xs text-muted-foreground">Unrestricted global access</p>
                  </div>
                  <Switch
                    checked={isSuperuserChecked}
                    onCheckedChange={(v) => form.setValue("is_superuser", v)}
                  />
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={save.isPending}>
                {editing ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credential Share Card Modal */}
      <Dialog open={Boolean(createdCreds)} onOpenChange={(open) => !open && setCreatedCreds(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">Manager Credentials Ready</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Account created/updated successfully. You can copy these details and send them directly to the manager.
            </DialogDescription>
          </DialogHeader>

          {createdCreds && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 font-sans text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Manager Name:</span>
                <span className="font-semibold">{createdCreds.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Role:</span>
                <Badge variant="secondary" className="capitalize">{humanize(createdCreds.role)}</Badge>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Assigned Branch(es):</span>
                <span className="font-medium text-primary">
                  {createdCreds.branchNames.length > 0 ? createdCreds.branchNames.join(", ") : "All Branches"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Login Email:</span>
                <span className="font-mono text-xs font-semibold">{createdCreds.email}</span>
              </div>
              {createdCreds.password && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Password:</span>
                  <span className="font-mono text-xs font-bold bg-background px-2 py-1 rounded border border-border text-emerald-600 dark:text-emerald-400">
                    {createdCreds.password}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              type="button"
              className="w-full gap-2"
              onClick={copyCredsToClipboard}
            >
              {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedText ? "Copied to Clipboard!" : "Copy Full Login Message"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setCreatedCreds(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete user?"
        description={`"${deleteTarget?.name}" will lose all system access immediately.`}
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
