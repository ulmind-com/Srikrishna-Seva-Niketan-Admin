import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  meta?: PaginationMeta;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  meta,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const total = meta?.total ?? 0;
  const totalPages = meta?.total_pages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border px-4 py-3.5 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-9 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!meta?.has_prev}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[84px] text-center text-sm font-medium">
            Page {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!meta?.has_next}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
