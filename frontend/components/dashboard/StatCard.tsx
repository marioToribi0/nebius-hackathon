import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "cyan" | "violet" | "amber" | "emerald";
}

const accentMap = {
  cyan:    { text: "text-[#00D4FF]", bg: "bg-[#00D4FF]/10", border: "border-[#00D4FF]/20" },
  violet:  { text: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10", border: "border-[#8B5CF6]/20" },
  amber:   { text: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/20" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
};

export function StatCard({ label, value, icon: Icon, trend, accent = "cyan" }: StatCardProps) {
  const a = accentMap[accent];
  return (
    <div className="glass rounded-xl p-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{label}</p>
          <p className={cn("mt-2 text-3xl font-bold font-[family-name:var(--font-syne)]", a.text)}>
            {value}
          </p>
          {trend && (
            <p className="mt-1 text-xs text-slate-500">{trend}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5 border", a.bg, a.border)}>
          <Icon className={cn("h-5 w-5", a.text)} />
        </div>
      </div>
    </div>
  );
}
