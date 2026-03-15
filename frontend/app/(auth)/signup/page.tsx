"use client";

import { authApi } from "@/lib/api";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Compass } from "lucide-react";

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
      toast.success("Account created. Please sign in.");
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
        <div className="inline-block mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 mx-auto">
            <Compass className="h-7 w-7 text-accent" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-playfair)]">
          Wayfinder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your account
        </p>
      </div>

      <div className="warm-card p-8">
        <h2 className="mb-6 text-lg font-semibold text-foreground font-[family-name:var(--font-playfair)]">
          Sign Up
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Full Name
            </label>
            <input
              {...register("full_name")}
              type="text"
              placeholder="Your name"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="Choose a password"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              placeholder="Confirm your password"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 transition font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
