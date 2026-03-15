"use client";

import type { Route } from "@/lib/types";
import { MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RoutesTableProps {
  routes: Route[];
}

export function RoutesTable({ routes }: RoutesTableProps) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
        <MapPin className="h-8 w-8 opacity-40" />
        <p className="text-sm font-mono tracking-wider">NO ROUTES CONFIGURED</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#00D4FF]/10 hover:bg-transparent">
          <TableHead className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Name</TableHead>
          <TableHead className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Waypoints</TableHead>
          <TableHead className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Description</TableHead>
          <TableHead className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.map((route) => (
          <TableRow key={route.id} className="border-[#00D4FF]/08 hover:bg-[#00D4FF]/03">
            <TableCell className="font-medium text-white">{route.name}</TableCell>
            <TableCell>
              <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20 font-mono text-xs">
                {route.waypoints.length} pts
              </Badge>
            </TableCell>
            <TableCell className="text-slate-400 text-sm">{route.description || "—"}</TableCell>
            <TableCell className="text-slate-500 font-mono text-xs">
              {new Date(route.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
