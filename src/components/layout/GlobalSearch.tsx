import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  CornerDownLeft,
  Stethoscope,
  Newspaper,
  Package,
  Calendar,
  FileUser,
  Loader2,
} from "lucide-react";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: string;
  title?: string;
  name?: string;
  reference?: string;
  patient?: string;
  slug?: string;
  status?: string;
}

interface SearchResults {
  query: string;
  results: {
    services: { id: string; title: string; slug: string }[];
    blogs: { id: string; title: string; slug: string }[];
    equipment: { id: string; name: string; slug: string }[];
    bookings: { id: string; reference: string; patient: string; status: string }[];
    applications: { id: string; reference: string; name: string; status: string }[];
  };
}

const GROUP_META = {
  services: { icon: Stethoscope, label: "Services", to: "/services" },
  equipment: { icon: Package, label: "Equipment", to: "/equipment" },
  blogs: { icon: Newspaper, label: "Blogs", to: "/blogs" },
  bookings: { icon: Calendar, label: "Bookings", to: "/bookings" },
  applications: { icon: FileUser, label: "Applications", to: "/applications" },
} as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () =>
      http.get<SearchResults>(endpoints.search, { q: debounced, limit: 5 }),
    enabled: open && debounced.length > 0,
  });

  const go = (to: string) => {
    setOpen(false);
    setTerm("");
    navigate(to);
  };

  const groups = data
    ? (Object.keys(GROUP_META) as (keyof typeof GROUP_META)[])
        .map((key) => ({ key, items: data.results[key] ?? [] }))
        .filter((g) => g.items.length > 0)
    : [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded border border-border bg-card px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" hideClose>
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search services, bookings, blogs…"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!debounced ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Type to search across your workspace.
              </p>
            ) : groups.length === 0 && !isFetching ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for “{debounced}”.
              </p>
            ) : (
              groups.map((group) => {
                const meta = GROUP_META[group.key];
                const Icon = meta.icon;
                return (
                  <div key={group.key} className="mb-2">
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {meta.label}
                    </p>
                    {(group.items as SearchItem[]).map((item) => {
                      const label =
                        item.title ??
                        item.name ??
                        (item.reference
                          ? `${item.reference} · ${item.patient ?? ""}`
                          : "");
                      return (
                        <button
                          key={item.id}
                          onClick={() => go(meta.to)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{label}</span>
                          <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
