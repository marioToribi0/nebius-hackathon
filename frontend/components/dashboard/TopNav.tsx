"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

interface TopNavProps {
  title: string;
}

export function TopNav({ title }: TopNavProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    toast.success("Signed out successfully.");
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-bold text-foreground font-[family-name:var(--font-playfair)]">
        {title}
      </h1>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground transition hover:bg-secondary/80">
          <User className="h-3.5 w-3.5" />
          {user?.email ?? "Guest"}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-card border-border text-foreground"
        >
          <DropdownMenuItem className="text-sm text-muted-foreground focus:bg-transparent cursor-default">
            {user?.full_name || user?.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-sm"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
