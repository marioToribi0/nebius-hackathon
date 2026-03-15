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
    toast.success("Session terminated.");
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#00D4FF]/08 bg-[#050C18]/80 px-6 backdrop-blur-sm">
      <h1 className="text-sm font-bold font-[family-name:var(--font-syne)] text-white tracking-widest uppercase">
        {title}
      </h1>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-[#00D4FF]/15 bg-[#00D4FF]/5 px-3 py-1.5 text-xs text-[#00D4FF] font-mono tracking-wider transition hover:border-[#00D4FF]/30 hover:bg-[#00D4FF]/10">
          <User className="h-3.5 w-3.5" />
          {user?.email ?? "Operator"}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[#0A1628] border-[#00D4FF]/20 text-slate-200"
        >
          <DropdownMenuItem className="text-xs font-mono text-slate-400 focus:bg-transparent cursor-default">
            {user?.full_name || user?.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#00D4FF]/10" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer text-xs"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Terminate Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
