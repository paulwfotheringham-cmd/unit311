"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import Logo from "@/components/layout/Logo";
import {
  ONBOARDING_MODULE_GROUPS,
  ONBOARDING_MODULES,
  type OnboardingModuleId,
} from "@/lib/onboarding-modules-data";
import type { WorkspaceOnboardingState } from "@/lib/workspace-customer-onboarding-service";
import {
  marketingBtnGreen,
  marketingBtnSecondary,
  marketingBtnSubmit,
  marketingCard,
  marketingEyebrow,
  marketingFadeIn,
  marketingFormShell,
  marketingInput,
  marketingInputLabel,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { workspaceDashboardUrl } from "@/lib/workspace-customer-onboarding-service";
import { cn } from "@/lib/utils";

function onboardingStepHref(slug: string, stepId: string) {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === `${slug.trim().toLowerCase()}.unit311central.com`) {
      return `/onboarding?step=${encodeURIComponent(stepId)}`;
    }
  }
  return `/onboarding/${encodeURIComponent(slug)}?step=${encodeURIComponent(stepId)}`;
}

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "modules", label: "Choose Modules" },
  { id: "branding", label: "Company Branding" },
  { id: "invite", label: "Invite Users" },
  { id: "finish", label: "Finish" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type Props = {
  initialState: WorkspaceOnboardingState;
  initialStep?: string;
};

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 160) || "Unexpected server response");
  }
}

export default function WorkspaceOnboardingWizard({ initialState, initialStep }: Props) {
  const router = useRouter();
  const startIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.id === initialStep),
  );
  const [stepIndex, setStepIndex] = useState(startIndex >= 0 ? startIndex : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyDisplayName, setCompanyDisplayName] = useState(initialState.name);
  const [primaryColour, setPrimaryColour] = useState(initialState.primaryColour || "#0b2d63");
  const [secondaryColour, setSecondaryColour] = useState(
    initialState.secondaryColour || "#2563eb",
  );
  const [selectedModules, setSelectedModules] = useState<OnboardingModuleId[]>(
    initialState.selectedModules.length > 0
      ? initialState.selectedModules
      : (["clients", "crm", "projects", "financials"] as OnboardingModuleId[]),
  );
  const [inviteText, setInviteText] = useState("");

  const step = STEPS[stepIndex];
  const inviteEmails = useMemo(
    () =>
      inviteText
        .split(/[\n,;]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    [inviteText],
  );

  function toggleModule(id: OnboardingModuleId) {
    setSelectedModules((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function draftPayload() {
    return {
      selectedModules,
      primaryColour,
      secondaryColour,
      companyDisplayName,
      inviteEmails,
    };
  }

  async function saveDraft() {
    const response = await fetch(
      `/api/workspace-onboarding/${encodeURIComponent(initialState.slug)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload()),
      },
    );
    const data = await readApiJson<{ error?: string }>(response);
    if (!response.ok) throw new Error(data.error ?? "Unable to save progress.");
  }

  async function goNext() {
    setBusy(true);
    setError(null);
    try {
      await saveDraft();
      if (stepIndex < STEPS.length - 1) {
        const next = stepIndex + 1;
        setStepIndex(next);
        router.replace(onboardingStepHref(initialState.slug, STEPS[next].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function goBack() {
    if (stepIndex === 0) return;
    const prev = stepIndex - 1;
    setStepIndex(prev);
    router.replace(onboardingStepHref(initialState.slug, STEPS[prev].id));
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspace-onboarding/${encodeURIComponent(initialState.slug)}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftPayload()),
        },
      );
      const data = await readApiJson<{ error?: string; dashboardUrl?: string }>(response);
      if (!response.ok || !data.dashboardUrl) {
        throw new Error(data.error ?? "Unable to complete onboarding.");
      }
      window.location.assign(data.dashboardUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to finish onboarding.");
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center py-10`}
    >
      <div className={`w-full max-w-3xl space-y-6 ${marketingFadeIn}`}>
        <div className="flex justify-center">
          <Logo href="/" height={48} />
        </div>

        <div className={`${marketingFormShell} space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={marketingEyebrow}>Workspace setup</p>
              <h1 className={`mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl`}>
                {companyDisplayName || initialState.name}
              </h1>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/45">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>

          <ol className="grid gap-2 sm:grid-cols-5">
            {STEPS.map((item, index) => {
              const done = index < stepIndex;
              const active = index === stepIndex;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em]",
                    active
                      ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                      : done
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 text-white/40",
                  )}
                >
                  {item.label}
                </li>
              );
            })}
          </ol>

          {step.id === "welcome" ? (
            <section className="space-y-4">
              <h2 className={marketingPageTitle}>Welcome to Unit311 Central</h2>
              <p className={marketingPageIntro}>
                This short setup wizard prepares your <strong className="text-white">Fotheringham</strong>{" "}
                workspace. You will choose modules, set brand colours, and invite teammates.
                Nothing advanced — just the essentials to get started.
              </p>
              <div className={`${marketingCard} p-4 text-sm text-white/70`}>
                Prototype for testing only. Your choices are saved when you continue, and you can
                reset onboarding from Internal Operations.
              </div>
            </section>
          ) : null}

          {step.id === "modules" ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Choose modules</h2>
              <p className="text-sm text-white/60">
                Select the areas you want available in your workspace. You can change these later.
              </p>
              <div className="space-y-5">
                {ONBOARDING_MODULE_GROUPS.map((group) => {
                  const modules = ONBOARDING_MODULES.filter(
                    (module) => module.groupId === group.id,
                  );
                  if (modules.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                        {group.label}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {modules.map((module) => {
                          const selected = selectedModules.includes(module.id);
                          return (
                            <button
                              key={module.id}
                              type="button"
                              onClick={() => toggleModule(module.id)}
                              className={cn(
                                "rounded-xl border px-3 py-3 text-left transition-colors",
                                selected
                                  ? "border-emerald-400/40 bg-emerald-500/10"
                                  : "border-white/10 bg-white/[0.03] hover:border-white/20",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold text-white">
                                  {module.label}
                                </span>
                                {selected ? (
                                  <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-white/50">
                                {module.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step.id === "branding" ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Company branding</h2>
              <p className="text-sm text-white/60">
                Set how your workspace presents your company. Logo upload comes later — colours
                and display name are enough for this prototype.
              </p>
              <div>
                <label className={marketingInputLabel} htmlFor="company-name">
                  Company display name
                </label>
                <input
                  id="company-name"
                  className={marketingInput}
                  value={companyDisplayName}
                  onChange={(event) => setCompanyDisplayName(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={marketingInputLabel} htmlFor="primary-colour">
                    Primary colour
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="primary-colour"
                      type="color"
                      value={primaryColour}
                      onChange={(event) => setPrimaryColour(event.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                    />
                    <input
                      className={marketingInput}
                      value={primaryColour}
                      onChange={(event) => setPrimaryColour(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={marketingInputLabel} htmlFor="secondary-colour">
                    Secondary colour
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="secondary-colour"
                      type="color"
                      value={secondaryColour}
                      onChange={(event) => setSecondaryColour(event.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                    />
                    <input
                      className={marketingInput}
                      value={secondaryColour}
                      onChange={(event) => setSecondaryColour(event.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl border border-white/10 p-5"
                style={{
                  background: `linear-gradient(135deg, ${primaryColour} 0%, ${secondaryColour} 100%)`,
                }}
              >
                <p className="text-sm font-semibold text-white/95">{companyDisplayName}</p>
                <p className="mt-1 text-xs text-white/75">Brand preview</p>
              </div>
            </section>
          ) : null}

          {step.id === "invite" ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Invite users</h2>
              <p className="text-sm text-white/60">
                Add email addresses for teammates you want in the workspace. Invites are not sent
                in this prototype — this step validates the experience only.
              </p>
              <div>
                <label className={marketingInputLabel} htmlFor="invites">
                  Email addresses
                </label>
                <textarea
                  id="invites"
                  rows={5}
                  className={marketingInput}
                  placeholder={"alex@company.com\njordan@company.com"}
                  value={inviteText}
                  onChange={(event) => setInviteText(event.target.value)}
                />
              </div>
              <p className="text-xs text-white/45">
                {inviteEmails.length} address{inviteEmails.length === 1 ? "" : "es"} entered
              </p>
            </section>
          ) : null}

          {step.id === "finish" ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">You are ready</h2>
              <p className="text-sm text-white/60">
                Review your setup, then finish to open the workspace dashboard. Onboarding will be
                marked complete so the next login skips this wizard.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`${marketingCard} p-4`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    Modules
                  </p>
                  <p className="mt-2 text-sm text-white">{selectedModules.length} selected</p>
                </div>
                <div className={`${marketingCard} p-4`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    Invites
                  </p>
                  <p className="mt-2 text-sm text-white">{inviteEmails.length} queued (not sent)</p>
                </div>
              </div>
              <p className="text-xs text-white/40">
                Dashboard: {workspaceDashboardUrl(initialState.slug)}
              </p>
            </section>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => void goBack()}
              disabled={busy || stepIndex === 0}
              className={`${marketingBtnSecondary} disabled:opacity-40`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </button>

            {step.id === "finish" ? (
              <button
                type="button"
                onClick={() => void finish()}
                disabled={busy}
                className={marketingBtnGreen}
              >
                {busy ? "Finishing…" : "Finish and open dashboard"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={busy || (step.id === "modules" && selectedModules.length === 0)}
                className={marketingBtnSubmit}
              >
                {busy ? "Saving…" : "Continue"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
