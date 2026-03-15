"use client";

import { useAuth } from "@/lib/auth";
import { TopNav } from "@/components/dashboard/TopNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { Bot, Map, Network, Zap } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
            Welcome back,{" "}
            <span className="text-[#00D4FF]">{user?.full_name || user?.email}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-mono">
            WAYFINDER G1 — COMMAND INTERFACE ACTIVE
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Active Routes"
            value="0"
            icon={Map}
            trend="No routes yet"
            accent="cyan"
          />
          <StatCard
            label="Embeddings"
            value="0"
            icon={Network}
            trend="Knowledge base empty"
            accent="violet"
          />
          <StatCard
            label="System Status"
            value="OK"
            icon={Zap}
            trend="All systems nominal"
            accent="emerald"
          />
          <StatCard
            label="Robot Unit"
            value="G1-001"
            icon={Bot}
            trend="Online"
            accent="amber"
          />
        </div>

        {/* Robot status panel */}
        <div className="glass rounded-xl p-6 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold font-[family-name:var(--font-syne)] text-white tracking-wider">
              ROBOT STATUS — UNIT G1-001
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Mode", value: "Standby" },
              { label: "Battery", value: "98%" },
              { label: "Location", value: "Base Station" },
              { label: "Uptime", value: "0h 00m" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-[#00D4FF]/5 border border-[#00D4FF]/10 px-4 py-3">
                <p className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">{label}</p>
                <p className="mt-1 text-sm font-bold text-[#00D4FF] font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
