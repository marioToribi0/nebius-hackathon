"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routeSchema, type RouteInput } from "@/lib/validations";
import { routesApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateRouteDialogProps {
  onCreated: () => void;
}

export function CreateRouteDialog({ onCreated }: CreateRouteDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RouteInput>({
    resolver: zodResolver(routeSchema),
    defaultValues: { waypoints: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "waypoints" });

  async function onSubmit(data: RouteInput) {
    try {
      await routesApi.create({
        name: data.name,
        description: data.description,
        waypoints: data.waypoints?.map((w) => ({
          name: w.name,
          description: w.description,
        })),
      });
      toast.success("Route created successfully.");
      reset();
      setOpen(false);
      onCreated();
    } catch {
      toast.error("Failed to create route.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-2 rounded-lg bg-[#00D4FF] px-4 py-2 text-xs font-bold text-[#050C18] font-mono tracking-wider transition hover:bg-[#00D4FF]/90 hover:shadow-[0_0_16px_rgba(0,212,255,0.3)]">
        <Plus className="h-4 w-4" />
        NEW ROUTE
      </DialogTrigger>

      <DialogContent className="bg-[#0A1628] border-[#00D4FF]/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-syne)] tracking-wide text-[#00D4FF]">
            CREATE TOUR ROUTE
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Route Name</label>
            <input
              {...register("name")}
              placeholder="Main Hall Tour"
              className="w-full rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#00D4FF]/40"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Description</label>
            <input
              {...register("description")}
              placeholder="Optional description"
              className="w-full rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#00D4FF]/40"
            />
          </div>

          {/* Waypoints */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Waypoints</label>
              <button
                type="button"
                onClick={() => append({ name: "", description: "" })}
                className="flex items-center gap-1 text-[10px] font-mono text-[#00D4FF]/70 hover:text-[#00D4FF] transition"
              >
                <Plus className="h-3 w-3" /> ADD
              </button>
            </div>

            {fields.map((field, i) => (
              <div key={field.id} className="flex gap-2">
                <input
                  {...register(`waypoints.${i}.name`)}
                  placeholder={`Waypoint ${i + 1}`}
                  className="flex-1 rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#8B5CF6]/40"
                />
                <input
                  {...register(`waypoints.${i}.description`)}
                  placeholder="Description"
                  className="flex-1 rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#8B5CF6]/40"
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-lg p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#00D4FF] py-2.5 text-sm font-bold text-[#050C18] font-mono tracking-widest transition hover:bg-[#00D4FF]/90 disabled:opacity-50"
          >
            {isSubmitting ? "CREATING..." : "CREATE ROUTE"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
