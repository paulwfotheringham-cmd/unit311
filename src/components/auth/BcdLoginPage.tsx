"use client";

import LoginForm from "@/components/auth/LoginForm";
import Logo from "@/components/layout/Logo";
import { SITE_NAME } from "@/lib/site";

type BcdLoginPageProps = {
  variant?: "operations" | "client";
};

export default function BcdLoginPage({ variant = "operations" }: BcdLoginPageProps) {
  const isClient = variant === "client";

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#020617] px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37, 99, 235, 0.18), transparent 65%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(14, 165, 233, 0.08), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto inline-flex rounded-xl bg-white px-4 py-3 shadow-lg shadow-blue-950/30">
            <Logo height={36} href={undefined} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {isClient ? "Client Portal" : "Workspace Sign In"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            {isClient
              ? `Sign in to your ${SITE_NAME} client workspace — projects, documents, and delivery updates.`
              : `Sign in to your ${SITE_NAME} operations workspace — projects, finance, files, logistics, and client delivery.`}
          </p>
        </div>

        <LoginForm
          dark
          storageKey={isClient ? "unit311-client-login" : "unit311-operations-login"}
        />
      </div>

      <p className="relative mt-10 text-center text-xs text-white/35">
        © {new Date().getFullYear()} {SITE_NAME}
      </p>
    </div>
  );
}
