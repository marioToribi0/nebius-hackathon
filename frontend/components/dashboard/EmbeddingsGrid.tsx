"use client";

import type { Embedding } from "@/lib/types";
import { Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EmbeddingsGridProps {
  embeddings: Embedding[];
}

const statusStyle: Record<string, string> = {
  pending:    "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
  processing: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20",
  completed:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  failed:     "bg-red-400/10 text-red-400 border-red-400/20",
};

export function EmbeddingsGrid({ embeddings }: EmbeddingsGridProps) {
  if (embeddings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
        <Network className="h-8 w-8 opacity-40" />
        <p className="text-sm font-mono tracking-wider">NO EMBEDDINGS INGESTED</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {embeddings.map((emb) => (
        <div key={emb.id} className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={cn("font-mono text-[10px] tracking-wider uppercase", statusStyle[emb.status] ?? statusStyle.pending)}>
              {emb.status}
            </Badge>
            <span className="text-[10px] font-mono text-slate-500 uppercase">{emb.source_type}</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500">
            {new Date(emb.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
