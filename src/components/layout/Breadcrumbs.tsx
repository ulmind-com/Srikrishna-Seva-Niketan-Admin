import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { humanize } from "@/lib/utils";

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="hidden items-center gap-1.5 text-sm md:flex">
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, i) => {
        const to = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={to} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground">
                {humanize(segment)}
              </span>
            ) : (
              <Link
                to={to}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {humanize(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
