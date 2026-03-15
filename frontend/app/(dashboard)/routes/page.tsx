"use client";

import { useCallback, useEffect, useState } from "react";
import { routesApi } from "@/lib/api";
import type { Route } from "@/lib/types";
import { TopNav } from "@/components/dashboard/TopNav";
import { RoutesTable } from "@/components/dashboard/RoutesTable";
import { CreateRouteDialog } from "@/components/dashboard/CreateRouteDialog";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await routesApi.list();
      setRoutes(data);
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Routes" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between animate-fade-in-up">
          <div>
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
              Tour Routes
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {routes.length} route{routes.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <CreateRouteDialog onCreated={load} />
        </div>

        <div className="glass rounded-xl overflow-hidden animate-fade-in-up">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 rounded-full border-2 border-[#00D4FF] border-t-transparent animate-spin" />
            </div>
          ) : (
            <RoutesTable routes={routes} />
          )}
        </div>
      </div>
    </div>
  );
}
