"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Logo from "@/components/layout/Logo";
import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  parseLoginReturnTo,
  parseSafePostLoginNext,
  workspacePostLoginUrl,
} from "@/lib/app-domains";
import {
  marketingFadeIn,
  marketingLegalLink,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { navigateRedirectPath } from "@/lib/navigate-redirect";

/** High-resolution operations background (≈3.2K, progressive JPEG). */
const LOGIN_BACKGROUND = "/images/login-operations-bg.jpg";
const RETURN_TO_STORAGE_KEY = "unit311_workspace_return_to";
const NEXT_STORAGE_KEY = "unit311_post_login_next";

/** ~2.5–3× standard logo height; reserved box prevents layout shift. */
const LOGO_HEIGHT_DESKTOP = 200;

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
      backgroundImageClassName="object-cover object-center opacity-45"
      backgroundImageQuality={90}
      overlayClassName="absolute inset-0 bg-[#020617]/78"
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center justify-center py-10 sm:py-14`}
    >
      <div
        className={`flex w-full max-w-[440px] flex-col items-center ${marketingFadeIn}`}
      >
        {/* Reserved logo slot — fixed aspect prevents CLS */}
        <div
          className="mx-auto flex h-[140px] w-[min(100%,308px)] items-center justify-center sm:h-[200px] sm:w-[min(100%,440px)]"
        >
          <Logo
            href={null}
            variant="hero"
            fillContainer
            height={LOGO_HEIGHT_DESKTOP}
            className="object-contain object-center drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div className="mt-8 w-full text-center sm:mt-10">
          <h1 className="text-[1.65rem] font-bold tracking-[-0.03em] text-white sm:text-[2rem]">
            Internal Operations
          </h1>
          <p className="mx-auto mt-3 max-w-[22rem] text-[14px] leading-relaxed text-white/60 sm:text-[15px]">
            Secure access to the Unit311 Central Operations Platform
          </p>
        </div>

        <div className="mt-8 w-full rounded-[24px] border border-white/12 bg-gradient-to-b from-white/[0.11] to-white/[0.04] p-7 shadow-[0_32px_100px_rgba(0,0,0,0.45)] backdrop-blur-md sm:mt-10 sm:rounded-[28px] sm:p-9">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-[13px] font-medium tracking-wide text-white/75"
              >
                {isCentral ? "Email address" : "Username"}
              </label>
              <input
                id="username"
                name="username"
                type={isCentral ? "email" : "text"}
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                placeholder={isCentral ? "you@unit311central.com" : "Enter username"}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[13px] font-medium tracking-wide text-white/75"
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
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:opacity-60"
                placeholder="Enter password"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_0_36px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="pt-1 text-center text-sm">
              <Link href="/resetpassword" className={marketingLegalLink}>
                Reset password
              </Link>
            </p>
          </form>
        </div>

        <footer className="mt-10 space-y-1.5 text-center sm:mt-12">
          <p className="text-[13px] font-semibold tracking-wide text-white/80">
            Unit311 Central
          </p>
          <p className="text-[12px] text-white/45">Internal Operations Platform</p>
          <p className="pt-1 text-[11px] uppercase tracking-[0.16em] text-white/30">
            Release Candidate 1
          </p>
        </footer>
      </div>
    </MarketingPageShell>
  );
}
