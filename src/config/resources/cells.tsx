import { Star } from "lucide-react";
import type { ImageAsset } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn, formatDate, initials } from "@/lib/utils";

/** Thumbnail + title + subtitle cell used across catalogue tables. */
export function MediaCell({
  image,
  title,
  subtitle,
}: {
  image?: ImageAsset | null;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-secondary/50 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-black/5 dark:ring-white/10" />
        {image?.url ? (
          <img
            src={image.url}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <span className="text-[14px] font-bold text-muted-foreground leading-none">{initials(title)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground/90 transition-colors group-hover:text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function DateCell({ value }: { value?: string | null }) {
  return <span className="text-sm text-muted-foreground">{formatDate(value)}</span>;
}

export function FeaturedCell({ value }: { value?: boolean }) {
  if (!value) return <span className="text-muted-foreground/50">—</span>;
  return (
    <Badge variant="warning">
      <Star className="h-3 w-3 fill-current" /> Featured
    </Badge>
  );
}

export function StatusCell({ value }: { value?: string | null }) {
  return <StatusBadge status={value} />;
}

export function BoolCell({
  value,
  labels = ["Yes", "No"],
}: {
  value?: boolean;
  labels?: [string, string];
}) {
  return (
    <Badge variant={value ? "success" : "muted"}>
      {value ? labels[0] : labels[1]}
    </Badge>
  );
}

export function MutedCell({
  value,
  className,
}: {
  value?: string | number | null;
  className?: string;
}) {
  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      {value ?? "—"}
    </span>
  );
}

export const STATUS_OPTIONS = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];
