"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Logo from "@/components/layout/Logo";
import { SITE_NAME } from "@/lib/site";

const LOGIN_BACKGROUND = "/images/construction-bg.jpg";

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
  const workspaceName = isCentral ? "Unit311 Central" : SITE_NAME;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const heading = useMemo(
    () => (isResetStep ? "Choose a new password" : "Reset password"),
    [isResetStep],
  );

  const description = useMemo(
    () =>
      isResetStep
        ? "Enter your new password twice to finish resetting your account."
        : "Enter your username and email address. We will send you a link to reset your password.",
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
        body: JSON.stringify({ username, email }),
      });

      const data = await readApiJson<{ message?: string; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send reset email.");
      }

      setSuccess(
        data.message ??
          "If an account matches that username and email, we sent a password reset link.",
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
    <div className="safe-area-px safe-area-pb relative flex min-h-dvh w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={LOGIN_BACKGROUND}
          alt=""
          fill
          priority
          className="object-cover object-center grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#020617]/86" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2, 6, 23, 0.35) 0%, rgba(2, 6, 23, 0.72) 55%, rgba(2, 6, 23, 0.92) 100%), radial-gradient(ellipse 70% 55% at 50% 0%, rgba(37, 99, 235, 0.14), transparent 68%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto inline-flex justify-center">
            <Logo
              height={240}
              href={undefined}
              variant="hero"
              className="drop-shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            />
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-white sm:mt-8 sm:text-2xl md:text-3xl">
            {heading}
          </h1>
          <p className="mt-2 px-2 text-sm leading-relaxed text-white/55">{description}</p>
        </div>

        <div className="rounded-2xl border border-white/[0.12] bg-[#07111f]/72 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-8">
          {isResetStep ? (
            <form onSubmit={handleCompleteReset} className="space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
                  New password
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
                  className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:py-2.5 sm:text-sm"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-white/80"
                >
                  Confirm new password
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
                  className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:py-2.5 sm:text-sm"
                  placeholder="Enter password again"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full touch-manipulation items-center justify-center rounded-md bg-[#0b2d63] px-4 text-base font-semibold text-white transition-colors hover:bg-[#082652] disabled:cursor-not-allowed disabled:opacity-70 sm:h-11 sm:text-sm"
              >
                {busy ? "Updating password…" : "Update password"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-white/80">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:py-2.5 sm:text-sm"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:py-2.5 sm:text-sm"
                  placeholder="Enter email address"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full touch-manipulation items-center justify-center rounded-md bg-[#0b2d63] px-4 text-base font-semibold text-white transition-colors hover:bg-[#082652] disabled:cursor-not-allowed disabled:opacity-70 sm:h-11 sm:text-sm"
              >
                {busy ? "Sending link…" : "Send reset link"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm">
            <Link
              href="/login"
              className="touch-manipulation font-medium text-sky-400/80 underline-offset-2 hover:text-sky-300 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>

      <p className="relative mt-8 text-center text-xs text-white/35 sm:mt-10">
        © {new Date().getFullYear()} {workspaceName}
        {isCentral ? (
          <span className="mt-1 block text-[10px] text-white/25">unit311central.com</span>
        ) : null}
      </p>
    </div>
  );
}
