"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Explore", icon: Compass },
  { href: "/discover", label: "Discover", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground font-[family-name:var(--font-playfair)] tracking-wide">
            Wayfinder
          </p>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Travel Discovery
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
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span className={cn("text-sm", active && "font-medium text-primary")}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Brand footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 rounded-lg bg-accent/5 border border-accent/15 px-3 py-2.5">
          <MapPin className="h-5 w-5 text-accent" />
          <div>
            <p className="text-xs font-medium text-accent">Discover the world</p>
            <p className="text-[10px] text-muted-foreground">Find your next adventure</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
