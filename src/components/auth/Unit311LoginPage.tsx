"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Logo from "@/components/layout/Logo";
import { SITE_NAME } from "@/lib/site";

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
}: {
  variant?: "default" | "central";
}) {
  const router = useRouter();
  const isCentral = variant === "central";
  const workspaceName = isCentral ? "Unit311 Central" : SITE_NAME;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await readApiJson<{ redirectPath?: string; error?: string }>(response);
      if (!response.ok || !data.redirectPath) {
        throw new Error(data.error ?? "Invalid username or password.");
      }

      router.push(data.redirectPath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="safe-area-px safe-area-pb relative flex min-h-dvh w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#020617] px-4 py-6 sm:px-6 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37, 99, 235, 0.18), transparent 65%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(14, 165, 233, 0.08), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto inline-flex rounded-xl bg-white px-4 py-3 shadow-lg shadow-blue-950/30 sm:px-5 sm:py-3.5">
            <Logo height={38} href={undefined} />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-white sm:mt-6 sm:text-2xl md:text-3xl">
            Sign in
          </h1>
          <p className="mt-2 px-2 text-sm leading-relaxed text-white/55">
            {isCentral
              ? "Internal operations workspace for senior managers, board, and admin."
              : `Access your ${SITE_NAME} workspace.`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-5 shadow-xl shadow-black/30 backdrop-blur-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
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
                className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:py-2.5 sm:text-sm"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 w-full touch-manipulation items-center justify-center rounded-md bg-[#0b2d63] px-4 text-base font-semibold text-white transition-colors hover:bg-[#082652] disabled:cursor-not-allowed disabled:opacity-70 sm:h-11 sm:text-sm"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-sm">
              <button
                type="button"
                className="touch-manipulation font-medium text-sky-400/80 underline-offset-2 hover:text-sky-300 hover:underline"
              >
                Reset password
              </button>
            </p>
          </form>
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
