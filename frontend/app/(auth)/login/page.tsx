"use client";

import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch {
      toast.error("Invalid credentials. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-block animate-float mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/10 mx-auto animate-pulse-ring">
            <span className="text-2xl font-bold text-[#00D4FF] font-[family-name:var(--font-syne)]">G1</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] tracking-wide">
          WAYFINDER G1
        </h1>
        <p className="mt-1 text-xs text-[#00D4FF]/60 font-mono tracking-[0.2em]">
          NEURAL COMMAND INTERFACE
        </p>
      </div>

      {/* Card */}
      <div className="glass rounded-2xl p-8">
        <h2 className="mb-6 text-lg font-semibold text-white font-[family-name:var(--font-syne)]">
          INITIATE SESSION
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#00D4FF]/70 tracking-widest uppercase">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="admin@wayfinder.io"
              className="w-full rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#00D4FF]/50 focus:bg-[#00D4FF]/8"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#00D4FF]/70 tracking-widest uppercase">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#00D4FF]/50 focus:bg-[#00D4FF]/8"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-[#00D4FF] px-4 py-3 text-sm font-bold text-[#050C18] font-mono tracking-widest transition hover:bg-[#00D4FF]/90 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "AUTHENTICATING..." : "INITIATE SESSION"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          No account?{" "}
          <Link href="/signup" className="text-[#00D4FF]/80 hover:text-[#00D4FF] transition">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
