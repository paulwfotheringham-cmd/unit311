"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import { marketingFadeIn, MARKETING_CONTENT_CLASS } from "@/lib/marketing-ui";
import { SITE_NAME } from "@/lib/site";

/** Match Workspace Login visuals. */
const LOGIN_BACKGROUND = "/images/login-workspace-bg.webp";
const LOGIN_LOGO = "/images/unit311central-login.webp";
const LOGIN_LOGO_WIDTH = 1462;
const LOGIN_LOGO_HEIGHT = 334;

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 120) || "Unexpected server response");
  }
}

export default function ResetPasswordPage({
  variant = "default",
}: {
  variant?: "default" | "central";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const isResetStep = token.length > 0;

  const isCentral = variant === "central";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const heading = useMemo(
    () => (isResetStep ? "Choose a New Password" : "Reset Password"),
    [isResetStep],
  );

  const description = useMemo(
    () =>
      isResetStep
        ? "Enter your new password twice to finish resetting your account."
        : "Enter your email address. We will send you a link to reset your password.",
    [isResetStep],
  );

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await readApiJson<{ message?: string; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send reset email.");
      }

      setSuccess(
        data.message ??
          "If an account matches that email address, we sent a password reset link.",
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await readApiJson<{ message?: string; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to reset password.");
      }

      setSuccess(data.message ?? "Your password has been updated.");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1800);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      backgroundImage={LOGIN_BACKGROUND}
      backgroundImageClassName="object-cover object-[center_35%] opacity-80 sm:object-center"
      backgroundImageQuality={92}
      overlayClassName="absolute inset-0 bg-[#020617]/45"
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center justify-center py-12 sm:py-16`}
    >
      <div className={`flex w-full max-w-[480px] flex-col items-center ${marketingFadeIn}`}>
        <div className="flex w-full items-center justify-center px-2">
          <div
            className="relative w-full max-w-[min(100%,240px)] sm:max-w-[280px]"
            style={{ aspectRatio: `${LOGIN_LOGO_WIDTH} / ${LOGIN_LOGO_HEIGHT}` }}
          >
            <Image
              src={LOGIN_LOGO}
              alt={SITE_NAME}
              fill
              priority
              sizes="(max-width: 640px) 240px, 280px"
              className="object-contain object-center drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>

        <div className="mt-10 w-full text-center sm:mt-12">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.035em] text-white sm:text-[2.125rem]">
            {heading}
          </h1>
          <p className="mx-auto mt-3 max-w-[22rem] text-[14px] leading-relaxed text-white/55 sm:mt-3.5 sm:text-[15px]">
            {description}
          </p>
        </div>

        <div className="mt-9 w-full rounded-[26px] border border-white/[0.1] bg-gradient-to-b from-white/[0.1] to-white/[0.035] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:mt-11 sm:rounded-[30px] sm:p-10">
          {isResetStep ? (
            <form onSubmit={handleCompleteReset} className="space-y-7">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2.5 block text-[13px] font-medium tracking-[0.01em] text-white/70"
                >
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2.5 block text-[13px] font-medium tracking-[0.01em] text-white/70"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                  placeholder="Enter password again"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(37,99,235,0.28)] transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Updating Password…" : "Update Password"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-7">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block text-[13px] font-medium tracking-[0.01em] text-white/70"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                  placeholder={isCentral ? "you@unit311central.com" : "Enter email address"}
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(37,99,235,0.28)] transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Sending Link…" : "Send Reset Link"}
              </button>
            </form>
          )}

          <p className="mt-7 pt-1 text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[#93c5fd]/90 transition-colors hover:text-[#bfdbfe] hover:underline"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
