import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./Breadcrumbs";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsPopover } from "./NotificationsPopover";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Separator } from "@/components/ui/separator";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
        <ThemeToggle />
        <NotificationsPopover />
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
