"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050C18]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#00D4FF] border-t-transparent animate-spin" />
          <span className="font-mono text-sm text-[#00D4FF]/60 tracking-widest">
            INITIALIZING
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
