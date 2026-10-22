import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // content
  published: "success",
  active: "success",
  draft: "muted",
  inactive: "muted",
  archived: "muted",
  // bookings / rentals
  pending: "warning",
  approved: "success",
  in_progress: "default",
  completed: "success",
  returned: "success",
  rejected: "danger",
  cancelled: "danger",
  // applications
  received: "muted",
  shortlisted: "default",
  interview: "warning",
  hired: "success",
  // contact
  new: "warning",
  read: "default",
  replied: "success",
  closed: "muted",
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="muted">—</Badge>;
  const variant = STATUS_VARIANT[status] ?? "default";
  return (
    <Badge variant={variant} className="capitalize">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {humanize(status)}
    </Badge>
  );
}
