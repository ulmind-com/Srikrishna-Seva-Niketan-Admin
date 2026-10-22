import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { HeartPulse, ChevronsLeft } from "lucide-react";
import { NAV_SECTIONS } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { env } from "@/config/env";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const { hasPermission } = useAuth();
  const { data: unread } = useUnreadCount();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl brand-gradient text-primary-foreground shadow-glow">
          <HeartPulse className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-sidebar-foreground">
              Nupun Health
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Admin Panel
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const badge =
                    item.badgeKey === "notifications" && unread ? unread : 0;

                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          collapsed && "justify-center px-0",
                          isActive
                            ? "bg-primary/10 text-accent"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="active-nav"
                              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                            />
                          )}
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                          {!collapsed && badge > 0 && (
                            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                          {collapsed && badge > 0 && (
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );

                  return collapsed ? (
                    <Tooltip key={item.to} delayDuration={0}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onToggle}
          className={cn(
            "hidden w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex",
            collapsed && "justify-center px-0"
          )}
        >
          <ChevronsLeft
            className={cn("h-[18px] w-[18px] transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && (
          <p className="mt-2 px-3 text-[11px] text-muted-foreground/60">
            {env.APP_NAME}
          </p>
        )}
      </div>
    </div>
  );
}
