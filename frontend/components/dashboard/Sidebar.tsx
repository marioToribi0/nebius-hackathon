"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Cpu, LayoutDashboard, Map, Network } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/routes", label: "Routes", icon: Map },
  { href: "/embeddings", label: "Embeddings", icon: Network },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-[#091020] border-r border-[#00D4FF]/08">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#00D4FF]/08">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/10 animate-glow-pulse">
          <Cpu className="h-5 w-5 text-[#00D4FF]" />
        </div>
        <div>
          <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)] tracking-wide">
            WAYFINDER
          </p>
          <p className="text-[10px] font-mono text-[#00D4FF]/50 tracking-widest">
            G1 SYSTEM
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3 pt-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-[#00D4FF]")} />
              <span className={cn("font-mono text-xs tracking-wider uppercase", active && "text-[#00D4FF]")}>
                {label}
              </span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Robot status badge */}
      <div className="p-4 border-t border-[#00D4FF]/08">
        <div className="flex items-center gap-3 rounded-lg bg-[#00D4FF]/5 border border-[#00D4FF]/15 px-3 py-2.5">
          <div className="relative">
            <Bot className="h-5 w-5 text-[#00D4FF]" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse-ring" />
          </div>
          <div>
            <p className="text-xs font-mono text-[#00D4FF] tracking-wider">ROBOT ONLINE</p>
            <p className="text-[10px] text-slate-500">Unit G1-001</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
