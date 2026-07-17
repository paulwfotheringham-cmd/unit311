"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  parseValidWorkspaceReturnTo,
  workspacePostLoginUrl,
} from "@/lib/app-domains";
import {
  marketingBtnSubmit,
  marketingEyebrow,
  marketingFadeIn,
  marketingFormShell,
  marketingInput,
  marketingInputLabel,
  marketingLegalLink,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { navigateRedirectPath } from "@/lib/navigate-redirect";
import { SITE_NAME } from "@/lib/site";

const LOGIN_BACKGROUND = "/images/construction-bg.jpg";
const RETURN_TO_STORAGE_KEY = "unit311_workspace_return_to";

function readReturnToFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return parseValidWorkspaceReturnTo(
    new URLSearchParams(window.location.search).get("return_to"),
  );
}

function readPersistedReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return parseValidWorkspaceReturnTo(sessionStorage.getItem(RETURN_TO_STORAGE_KEY));
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

/**
 * After auth, never stay on apex when the user started from a workspace.
 * Prefer the API destination when it already targets that workspace origin.
 */
function resolveWorkspaceNavigationTarget(
  apiRedirectPath: string,
  workspaceOrigin: string,
): string {
  try {
    if (/^https?:\/\//i.test(apiRedirectPath)) {
      const apiUrl = new URL(apiRedirectPath);
      const originUrl = new URL(workspaceOrigin);
      if (apiUrl.origin === originUrl.origin) {
        return apiRedirectPath;
      }
    }
  } catch {
    // Fall through to dashboard.
  }
  return workspacePostLoginUrl(workspaceOrigin, "dashboard");
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
}: {
  variant?: "default" | "central";
  /** Validated workspace origin from `?return_to=` (e.g. https://fotheringham.unit311central.com). */
  returnTo?: string | null;
}) {
  const router = useRouter();
  const isCentral = variant === "central";
  const workspaceName = isCentral ? "Unit311 Central" : SITE_NAME;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromUrl = readReturnToFromLocation() ?? returnTo;
    if (fromUrl) persistReturnTo(fromUrl);
  }, [returnTo]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    // Prefer live URL, then server prop, then sessionStorage (survives lost query string).
    const workspaceReturnTo =
      readReturnToFromLocation() ?? returnTo ?? readPersistedReturnTo();
    if (workspaceReturnTo) persistReturnTo(workspaceReturnTo);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          ...(workspaceReturnTo ? { returnTo: workspaceReturnTo } : {}),
        }),
      });

      const data = await readApiJson<{ redirectPath?: string; error?: string }>(response);
      if (!response.ok || !data.redirectPath) {
        throw new Error(data.error ?? "Invalid username or password.");
      }

      if (workspaceReturnTo) {
        window.location.assign(
          resolveWorkspaceNavigationTarget(data.redirectPath, workspaceReturnTo),
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
      backgroundImageClassName="object-cover object-center grayscale opacity-35"
      overlayClassName="absolute inset-0 bg-[#020617]/86"
      contentClassName={`${MARKETING_CONTENT_CLASS} flex flex-col items-center`}
    >
      <div className={`w-full max-w-md space-y-8 ${marketingFadeIn}`}>
        <div className="text-center">
          <p className={marketingEyebrow}>{workspaceName}</p>
          <h1 className={`mt-4 ${marketingPageTitle}`}>Sign in</h1>
          {!isCentral ? (
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              Access your {SITE_NAME} workspace.
            </p>
          ) : null}
        </div>

        <div className={marketingFormShell}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className={marketingInputLabel}>
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
                className={marketingInput}
                placeholder={isCentral ? "you@unit311central.com" : "Enter username"}
              />
            </div>

            <div>
              <label htmlFor="password" className={marketingInputLabel}>
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
                className={marketingInput}
                placeholder="Enter password"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={marketingBtnSubmit}>
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-sm">
              <Link href="/resetpassword" className={marketingLegalLink}>
                Reset password
              </Link>
            </p>
          </form>
        </div>
      </div>
    </MarketingPageShell>
  );
}
