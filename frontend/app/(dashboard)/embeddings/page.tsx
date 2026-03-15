"use client";

import { useCallback, useEffect, useState } from "react";
import { embeddingsApi } from "@/lib/api";
import type { Embedding } from "@/lib/types";
import { TopNav } from "@/components/dashboard/TopNav";
import { EmbeddingsGrid } from "@/components/dashboard/EmbeddingsGrid";
import { IngestSourceDialog } from "@/components/dashboard/IngestSourceDialog";

export default function EmbeddingsPage() {
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await embeddingsApi.list();
      setEmbeddings(data);
    } catch {
      setEmbeddings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Embeddings" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between animate-fade-in-up">
          <div>
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
              Knowledge Embeddings
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {embeddings.length} source{embeddings.length !== 1 ? "s" : ""} ingested
            </p>
          </div>
          <IngestSourceDialog onCreated={load} />
        </div>

        <div className="animate-fade-in-up">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
            </div>
          ) : (
            <EmbeddingsGrid embeddings={embeddings} />
          )}
        </div>
      </div>
    </div>
  );
}
