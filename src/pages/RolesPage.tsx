import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Plus, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { userService } from "@/services/user.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { cn, humanize } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RolesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("roles:update");

  const { data: roles, isLoading } = useQuery({
    queryKey: ["users", "roles"],
    queryFn: () => userService.roles(),
  });
  const { data: permissions } = useQuery({
    queryKey: ["users", "permissions"],
    queryFn: () => userService.permissions(),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = roles?.find((r) => r.id === activeId) ?? roles?.[0] ?? null;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (active) setSelected(new Set(active.permissions));
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    (permissions ?? []).forEach((p) => {
      const list = map.get(p.group) ?? [];
      list.push(p.code);
      map.set(p.group, list);
    });
    return Array.from(map.entries());
  }, [permissions]);

  const save = useMutation({
    mutationFn: () =>
      userService.updateRole(active!.id, { permissions: Array.from(selected) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "roles"] });
      toast.success("Permissions updated");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const isWildcard = active?.permissions.includes("*");

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Roles · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Roles & Permissions"
        description="Define what each role can access across the platform."
        icon={<ShieldCheck />}
        actions={
          canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> New role
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Roles list */}
        <Card className="h-fit p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(roles ?? []).map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActiveId(role.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    active?.id === role.id ? "bg-primary/10" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-semibold", active?.id === role.id && "text-accent")}>
                      {role.name}
                    </span>
                    {role.is_system && (
                      <Badge variant="muted" className="text-[10px]">
                        <Lock className="h-2.5 w-2.5" /> System
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {role.description || "No description"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Permission matrix */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{active?.name ?? "Select a role"}</CardTitle>
              <CardDescription>
                {isWildcard
                  ? "This role has full unrestricted access."
                  : "Toggle the permissions granted to this role."}
              </CardDescription>
            </div>
            {canManage && active && !active.is_system && (
              <Button onClick={() => save.mutate()} loading={save.isPending}>
                <Save /> Save
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isWildcard ? (
              <div className="grid place-items-center gap-2 py-16 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <p className="font-semibold">Super Administrator</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  This role bypasses all permission checks and has complete
                  access to every module.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {grouped.map(([group, codes]) => (
                  <div key={group} className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {humanize(group)}
                    </p>
                    <div className="space-y-2">
                      {codes.map((code) => {
                        const action = code.split(":")[1];
                        return (
                          <label
                            key={code}
                            className="flex items-center gap-2.5 text-sm"
                          >
                            <Checkbox
                              checked={selected.has(code)}
                              onCheckedChange={() => toggle(code)}
                              disabled={!canManage || active?.is_system}
                            />
                            <span className="capitalize text-foreground">
                              {action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateRoleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => userService.createRole({ name, description, permissions: [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "roles"] });
      toast.success("Role created");
      onOpenChange(false);
      setName("");
      setDescription("");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            Create a role, then assign its permissions from the matrix.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Role name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Content Manager" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What can this role do?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name}>
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
