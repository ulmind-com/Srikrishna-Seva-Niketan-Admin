import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { humanize, initials } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full pl-1 pr-1 outline-none transition-opacity hover:opacity-90 sm:pr-3">
        <Avatar className="h-9 w-9 border border-border">
          {user.avatar?.url && <AvatarImage src={user.avatar.url} />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="hidden text-left leading-tight sm:block">
          <p className="max-w-[140px] truncate text-sm font-semibold text-foreground">
            {user.name}
          </p>
          <p className="text-xs text-muted-foreground">{humanize(user.role)}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <p className="text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <UserIcon /> My Profile
        </DropdownMenuItem>
        {user.is_superuser && (
          <DropdownMenuItem onClick={() => navigate("/roles")}>
            <Shield /> Roles &amp; Permissions
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={() => logout()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
