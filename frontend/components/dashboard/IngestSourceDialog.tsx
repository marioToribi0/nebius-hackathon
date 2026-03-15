"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { embeddingSchema, type EmbeddingInput } from "@/lib/validations";
import { embeddingsApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface IngestSourceDialogProps {
  onCreated: () => void;
}

export function IngestSourceDialog({ onCreated }: IngestSourceDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmbeddingInput>({
    resolver: zodResolver(embeddingSchema),
    defaultValues: { source_type: "text" },
  });

  async function onSubmit(data: EmbeddingInput) {
    try {
      await embeddingsApi.generate(data);
      toast.success("Embedding queued for processing.");
      reset();
      setOpen(false);
      onCreated();
    } catch {
      toast.error("Failed to queue embedding.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-bold text-white font-mono tracking-wider transition hover:bg-[#8B5CF6]/90 hover:shadow-[0_0_16px_rgba(139,92,246,0.3)]">
        <Plus className="h-4 w-4" />
        INGEST SOURCE
      </DialogTrigger>

      <DialogContent className="bg-[#0A1628] border-[#8B5CF6]/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-syne)] tracking-wide text-[#8B5CF6]">
            INGEST KNOWLEDGE SOURCE
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Source Type</label>
            <select
              {...register("source_type")}
              className="w-full rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]/40"
            >
              <option value="text">Text</option>
              <option value="url">URL</option>
              <option value="file">File</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Content</label>
            <textarea
              {...register("content")}
              rows={4}
              placeholder="Paste text, enter URL, or file path..."
              className="w-full rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#8B5CF6]/40 resize-none"
            />
            {errors.content && <p className="text-xs text-red-400">{errors.content.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#8B5CF6] py-2.5 text-sm font-bold text-white font-mono tracking-widest transition hover:bg-[#8B5CF6]/90 disabled:opacity-50"
          >
            {isSubmitting ? "QUEUEING..." : "QUEUE EMBEDDING"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
