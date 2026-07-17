"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { navigateRedirectPath } from "@/lib/navigate-redirect";

type SavedLogin = {
  username: string;
  password: string;
};

function loadSavedLogin(storageKey: string): SavedLogin | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedLogin>;
    if (typeof parsed.username !== "string" || typeof parsed.password !== "string") {
      return null;
    }

    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
}

function persistSavedLogin(storageKey: string, login: SavedLogin | null) {
  if (typeof window === "undefined") return;

  if (login) {
    window.localStorage.setItem(storageKey, JSON.stringify(login));
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 120) || "Unexpected server response");
  }
}

type LoginFormProps = {
  dark?: boolean;
  storageKey?: string;
};

export default function LoginForm({
  dark = false,
  storageKey = "bcd-operations-login",
}: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadSavedLogin(storageKey);
    if (!saved) return;

    setUsername(saved.username);
    setPassword(saved.password);
    setRememberLogin(true);
  }, [storageKey]);

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
        throw new Error(data.error ?? "Unable to sign in");
      }

      persistSavedLogin(
        storageKey,
        rememberLogin ? { username: username.trim(), password } : null,
      );

      navigateRedirectPath(data.redirectPath, router);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        dark
          ? "rounded-2xl border border-white/[0.1] bg-white/[0.04] p-6 shadow-xl shadow-black/30 backdrop-blur-sm sm:p-8"
          : "rounded-2xl border border-border bg-surface p-6 sm:p-8"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className={`mb-1.5 block text-sm font-medium ${dark ? "text-white/80" : "text-foreground"}`}>
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
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
              dark
                ? "border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
                : "border-border bg-background text-foreground placeholder:text-muted/60"
            }`}
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label htmlFor="password" className={`mb-1.5 block text-sm font-medium ${dark ? "text-white/80" : "text-foreground"}`}>
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
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
              dark
                ? "border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
                : "border-border bg-background text-foreground placeholder:text-muted/60"
            }`}
            placeholder="Enter your password"
          />
        </div>

        <label className={`flex items-center gap-2 text-sm ${dark ? "text-white/65" : "text-muted"}`}>
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => setRememberLogin(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 accent-[#0b2d63]"
          />
          Save username and password
        </label>

        {error && (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              dark
                ? "border-red-400/30 bg-red-500/10 text-red-300"
                : "border-red-500/30 bg-red-500/10 text-red-700"
            }`}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#0b2d63] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#082652] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? "Connecting…" : "Connect"}
        </button>

        <p className={`text-center text-sm ${dark ? "text-white/40" : "text-muted"}`}>
          <button
            type="button"
            className={`font-medium underline-offset-2 hover:underline ${dark ? "text-sky-400" : "text-[#0b2d63]"}`}
            onClick={() => setError("Password reset is not available yet.")}
          >
            Reset password
          </button>
        </p>
      </form>
    </div>
  );
}
