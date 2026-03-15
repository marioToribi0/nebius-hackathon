"use client";

import { authApi } from "@/lib/api";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(data: SignupInput) {
    try {
      await authApi.signup({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
      toast.success("Account created. Please log in.");
      router.push("/login");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Registration failed.";
      toast.error(msg);
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-block animate-float mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 mx-auto">
            <span className="text-2xl font-bold text-[#8B5CF6] font-[family-name:var(--font-syne)]">G1</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] tracking-wide">
          WAYFINDER G1
        </h1>
        <p className="mt-1 text-xs text-[#8B5CF6]/60 font-mono tracking-[0.2em]">
          REGISTER OPERATOR
        </p>
      </div>

      <div className="glass rounded-2xl p-8">
        <h2 className="mb-6 text-lg font-semibold text-white font-[family-name:var(--font-syne)]">
          CREATE ACCOUNT
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#8B5CF6]/70 tracking-widest uppercase">
              Full Name
            </label>
            <input
              {...register("full_name")}
              type="text"
              placeholder="Operator name"
              className="w-full rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#8B5CF6]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#8B5CF6]/70 tracking-widest uppercase">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="admin@wayfinder.io"
              className="w-full rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#8B5CF6]/50"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#8B5CF6]/70 tracking-widest uppercase">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#8B5CF6]/50"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[#8B5CF6]/70 tracking-widest uppercase">
              Confirm Password
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#8B5CF6]/50"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-[#8B5CF6] px-4 py-3 text-sm font-bold text-white font-mono tracking-widest transition hover:bg-[#8B5CF6]/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "REGISTERING..." : "REGISTER OPERATOR"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="text-[#8B5CF6]/80 hover:text-[#8B5CF6] transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
