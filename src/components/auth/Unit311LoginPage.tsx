"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  parseLoginReturnTo,
  parseSafePostLoginNext,
  workspacePostLoginUrl,
} from "@/lib/app-domains";
import { marketingFadeIn, MARKETING_CONTENT_CLASS } from "@/lib/marketing-ui";
import { navigateRedirectPath } from "@/lib/navigate-redirect";
import { SITE_NAME } from "@/lib/site";

/** Dark engineering/infrastructure background (4K). */
const LOGIN_BACKGROUND = "/images/login-workspace-bg.jpg";
/** High-resolution Unit311 Central mark (transparent, Retina-ready). */
const LOGIN_LOGO = "/images/unit311central-login.png";
const LOGIN_LOGO_WIDTH = 1462;
const LOGIN_LOGO_HEIGHT = 334;

const RETURN_TO_STORAGE_KEY = "unit311_workspace_return_to";
const NEXT_STORAGE_KEY = "unit311_post_login_next";

function readReturnToFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("return_to");
  return parseLoginReturnTo(raw)?.origin ?? null;
}

function readNextFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return parseSafePostLoginNext(new URLSearchParams(window.location.search).get("next"));
}

function readPersistedReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return parseLoginReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY))?.origin ?? null;
  } catch {
    return null;
  }
}

function readPersistedNext(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSafePostLoginNext(sessionStorage.getItem(NEXT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistReturnTo(origin: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (origin) sessionStorage.setItem(RETURN_TO_STORAGE_KEY, origin);
    else sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch {
    // Ignore quota / private mode failures.
  }
}

function persistNext(next: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (next) sessionStorage.setItem(NEXT_STORAGE_KEY, next);
    else sessionStorage.removeItem(NEXT_STORAGE_KEY);
  } catch {
    // Ignore quota / private mode failures.
  }
}

/**
 * After auth, never stay on apex when the user started from a workspace/demo/internal host.
 * The API redirect is authoritative when absolute; otherwise fall back by return target kind.
 */
function resolveReturnNavigationTarget(
  apiRedirectPath: string,
  returnOrigin: string,
): string {
  if (/^https?:\/\//i.test(apiRedirectPath)) {
    return apiRedirectPath;
  }

  const loginReturn = parseLoginReturnTo(returnOrigin);
  if (loginReturn?.kind === "workspace") {
    return workspacePostLoginUrl(returnOrigin, "dashboard");
  }
  if (loginReturn?.kind === "demo" || loginReturn?.kind === "internal") {
    const next = parseSafePostLoginNext(apiRedirectPath) ?? "/";
    return `${loginReturn.origin}${next === "/" ? "/" : next}`;
  }
  return apiRedirectPath;
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 120) || "Unexpected server response");
  }
}

export default function Unit311LoginPage({
  variant = "default",
  returnTo = null,
  nextPath = null,
}: {
  variant?: "default" | "central";
  /** Validated return origin (`return_to`) for workspace / demo / internal. */
  returnTo?: string | null;
  /** Canonical deep-link path (`next`), e.g. `/?view=clients`. */
  nextPath?: string | null;
}) {
  const router = useRouter();
  const isCentral = variant === "central";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromUrl = readReturnToFromLocation() ?? returnTo;
    if (fromUrl) persistReturnTo(fromUrl);
    const nextFromUrl = readNextFromLocation() ?? nextPath;
    if (nextFromUrl) persistNext(nextFromUrl);
  }, [returnTo, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const workspaceReturnTo =
      readReturnToFromLocation() ?? returnTo ?? readPersistedReturnTo();
    const deepLinkNext = readNextFromLocation() ?? nextPath ?? readPersistedNext();
    if (workspaceReturnTo) persistReturnTo(workspaceReturnTo);
    if (deepLinkNext) persistNext(deepLinkNext);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          ...(workspaceReturnTo ? { returnTo: workspaceReturnTo } : {}),
          ...(deepLinkNext ? { next: deepLinkNext } : {}),
        }),
      });

      const data = await readApiJson<{ redirectPath?: string; error?: string }>(response);
      if (!response.ok || !data.redirectPath) {
        throw new Error(data.error ?? "Invalid username or password.");
      }

      persistNext(null);

      if (workspaceReturnTo) {
        window.location.assign(
          resolveReturnNavigationTarget(data.redirectPath, workspaceReturnTo),
        );
        return;
      }

      navigateRedirectPath(data.redirectPath, router);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      backgroundImage={LOGIN_BACKGROUND}
      backgroundImageClassName="object-cover object-[center_35%] opacity-50 sm:object-center"
      backgroundImageQuality={92}
      overlayClassName="absolute inset-0 bg-[#020617]/72"
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center justify-center py-12 sm:py-16`}
    >
      <div className={`flex w-full max-w-[480px] flex-col items-center ${marketingFadeIn}`}>
        {/* Fixed aspect logo slot — ~2× previous display size, no CLS */}
        <div className="flex w-full items-center justify-center px-2">
          <div
            className="relative w-full max-w-[min(100%,420px)] sm:max-w-[520px]"
            style={{ aspectRatio: `${LOGIN_LOGO_WIDTH} / ${LOGIN_LOGO_HEIGHT}` }}
          >
            <Image
              src={LOGIN_LOGO}
              alt={SITE_NAME}
              fill
              priority
              sizes="(max-width: 640px) 420px, 520px"
              className="object-contain object-center drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>

        <div className="mt-10 w-full text-center sm:mt-12">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.035em] text-white sm:text-[2.125rem]">
            Workspace Login
          </h1>
          <p className="mx-auto mt-3 max-w-[20rem] text-[14px] leading-relaxed text-white/55 sm:mt-3.5 sm:max-w-none sm:text-[15px]">
            Secure Access to your Workspace
          </p>
        </div>

        <div className="mt-9 w-full rounded-[26px] border border-white/[0.1] bg-gradient-to-b from-white/[0.1] to-white/[0.035] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:mt-11 sm:rounded-[30px] sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label
                htmlFor="username"
                className="mb-2.5 block text-[13px] font-medium tracking-[0.01em] text-white/70"
              >
                {isCentral ? "Email Address" : "Username"}
              </label>
              <input
                id="username"
                name="username"
                type={isCentral ? "email" : "text"}
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                placeholder={isCentral ? "you@unit311central.com" : "Enter username"}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2.5 block text-[13px] font-medium tracking-[0.01em] text-white/70"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                placeholder="Enter password"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(37,99,235,0.28)] transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing In…" : "Sign In"}
            </button>

            <p className="pt-1 text-center text-sm">
              <Link
                href="/resetpassword"
                className="font-medium text-[#93c5fd]/90 transition-colors hover:text-[#bfdbfe] hover:underline"
              >
                Reset Password
              </Link>
            </p>
          </form>
        </div>
      </div>
    </MarketingPageShell>
  );
}
