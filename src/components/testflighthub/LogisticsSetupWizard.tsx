"use client";

/**
 * Workspace Logistics Setup Wizard (MOD-092)
 *
 * ---------------------------------------------------------------------------
 * PHASE 1 ONBOARDING — FROZEN (2026-07-19)
 * Implementation Review: Approved
 *
 * Entry flow also FROZEN — see MOD-092-PHASE1-ENTRY-FLOW-FREEZE.md
 * Open Logistics → Setup Wizard only → then dashboard.
 * Do not revisit onboarding unless usability testing identifies issues.
 *
 * Do not revisit this wizard UI unless a usability issue is identified in
 * testing. Phase 2+ enhancements are tracked separately and must not delay
 * Logistics operational workflows (shipments, inbound/outbound, returns,
 * tracking, POD, provider management).
 *
 * Accepted Phase 1 behaviours:
 * - "Use Unit311 Logistics" (not "Manual Logistics")
 * - Registry-driven provider cards
 * - "Not now" on every step
 * - Configuration summary (enabled / connected / deferred / next steps)
 * - Future access documented: Settings → Logistics → Shipping Providers
 * - No API integration in this wizard
 *
 * Development note (temporary): still launches every time Logistics opens
 * until first-run persistence is authorised separately.
 * ---------------------------------------------------------------------------
 *
 * Future access (product):
 *   Settings → Logistics → Shipping Providers
 */

import { useMemo, useState } from "react";
import { Check, Package, Truck } from "lucide-react";

import {
  SHIPPING_REGIONS,
  getShippingProviderByCode,
  listRecommendedProvidersForRegion,
  type ShippingRegionCode,
} from "@/lib/shipping-provider-registry";
import { cn } from "@/lib/utils";

type SetupPath = "unit311" | "connect" | null;
type TriState = "yes" | "no" | "unsure" | null;

type WizardStep =
  | "welcome"
  | "choose_path"
  | "unit311_ready"
  | "region"
  | "provider"
  | "business_account"
  | "api_credentials"
  | "finish";

type LogisticsSetupWizardProps = {
  onOpenLogistics: () => void;
};

const FUTURE_ACCESS_PATH = "Settings → Logistics → Shipping Providers";

const panelClassName =
  "rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8";

const primaryBtnClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/15 px-5 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40";

const secondaryBtnClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.08]";

const notNowBtnClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline";

function OptionCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-4 py-4 text-left transition-colors",
        selected
          ? "border-sky-400/50 bg-sky-500/15 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]"
          : "border-white/12 bg-[#0b1524]/80 hover:border-white/25",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-sky-300 bg-sky-400" : "border-white/35",
          )}
          aria-hidden
        >
          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-[#0b1524]" /> : null}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-white/75">{description}</span>
        </span>
      </div>
    </button>
  );
}

function StepActions({
  onBack,
  onContinue,
  continueDisabled,
  continueLabel = "Continue",
  onNotNow,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  onNotNow: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
      <button type="button" className={notNowBtnClassName} onClick={onNotNow}>
        Not now
      </button>
      <div className="flex flex-wrap gap-2">
        {onBack ? (
          <button type="button" className={secondaryBtnClassName} onClick={onBack}>
            Back
          </button>
        ) : null}
        {onContinue ? (
          <button
            type="button"
            className={primaryBtnClassName}
            disabled={continueDisabled}
            onClick={onContinue}
          >
            {continueLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function LogisticsSetupWizard({ onOpenLogistics }: LogisticsSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [path, setPath] = useState<SetupPath>(null);
  const [region, setRegion] = useState<ShippingRegionCode | null>(null);
  const [providerCode, setProviderCode] = useState<string | null>(null);
  const [businessAccount, setBusinessAccount] = useState<TriState>(null);
  const [apiCredentials, setApiCredentials] = useState<TriState>(null);
  /** Providers marked deferred (configure later / not now mid-flow). No live connect in this phase. */
  const [deferredProviderCodes, setDeferredProviderCodes] = useState<string[]>([]);
  const [leftEarly, setLeftEarly] = useState(false);

  const providers = useMemo(
    () => (region ? listRecommendedProvidersForRegion(region) : []),
    [region],
  );
  const selectedProvider = providerCode ? getShippingProviderByCode(providerCode) : undefined;
  const regionLabel = SHIPPING_REGIONS.find((entry) => entry.code === region)?.label;

  const deferredProviders = useMemo(
    () =>
      deferredProviderCodes
        .map((code) => getShippingProviderByCode(code))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [deferredProviderCodes],
  );

  /** Connected providers — empty until Integration Framework connect ships. */
  const connectedProviders: { name: string }[] = [];

  function goOpenLogistics() {
    onOpenLogistics();
  }

  function deferCurrentProviderIfAny() {
    if (providerCode && !deferredProviderCodes.includes(providerCode)) {
      setDeferredProviderCodes((current) => [...current, providerCode]);
    }
  }

  function handleNotNow() {
    setLeftEarly(true);
    if (!path) setPath("unit311");
    deferCurrentProviderIfAny();
    setStep("finish");
  }

  function handleConfigureLater() {
    deferCurrentProviderIfAny();
    setStep("finish");
  }

  const nextSteps = [
    "Create shipments and record tracking numbers in Unit311 Logistics",
    connectedProviders.length === 0
      ? "Connect a shipping provider when you are ready"
      : "Add another shipping provider if needed",
    `Manage providers later from ${FUTURE_ACCESS_PATH}`,
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className={panelClassName}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
          Workspace Logistics Setup
        </p>

        {step === "welcome" ? (
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
                <Truck className="h-5 w-5 text-sky-200" aria-hidden />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-white">Welcome to Unit311 Logistics</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  This short setup will help you configure how your organisation manages shipments.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  You can use Unit311 immediately with manual tracking, or connect one or more
                  shipping providers.
                </p>
              </div>
            </div>
            <StepActions onNotNow={handleNotNow} onContinue={() => setStep("choose_path")} />
          </div>
        ) : null}

        {step === "choose_path" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Step 1 – Choose how you want to work</h2>
              <p className="mt-1 text-sm text-white/70">Pick a starting path. You can change later.</p>
            </div>
            <div className="space-y-3">
              <OptionCard
                selected={path === "unit311"}
                title="Use Unit311 Logistics"
                description="Record shipments and tracking numbers manually. No courier account required."
                onSelect={() => setPath("unit311")}
              />
              <OptionCard
                selected={path === "connect"}
                title="Connect a Shipping Provider"
                description="Connect your existing courier account for enhanced tracking and automation."
                onSelect={() => setPath("connect")}
              />
            </div>
            <StepActions
              onNotNow={handleNotNow}
              onBack={() => setStep("welcome")}
              continueDisabled={!path}
              onContinue={() => {
                if (path === "unit311") setStep("unit311_ready");
                if (path === "connect") setStep("region");
              }}
            />
          </div>
        ) : null}

        {step === "unit311_ready" ? (
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-200" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-white">Unit311 Logistics is ready.</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  You can always connect shipping providers later from{" "}
                  <span className="font-medium text-white/90">{FUTURE_ACCESS_PATH}</span>.
                </p>
              </div>
            </div>
            <StepActions
              onNotNow={handleNotNow}
              onBack={() => setStep("choose_path")}
              continueLabel="Open Logistics"
              onContinue={() => {
                setPath("unit311");
                setStep("finish");
              }}
            />
          </div>
        ) : null}

        {step === "region" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Step 2 – Select your shipping region</h2>
              <p className="mt-1 text-sm text-white/70">
                Recommended providers are based on your region (from the Provider Registry).
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHIPPING_REGIONS.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => {
                    setRegion(entry.code);
                    setProviderCode(null);
                  }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                    region === entry.code
                      ? "border-sky-400/50 bg-sky-500/15 text-white"
                      : "border-white/12 bg-[#0b1524]/80 text-white/85 hover:border-white/25",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <StepActions
              onNotNow={handleNotNow}
              onBack={() => setStep("choose_path")}
              continueDisabled={!region}
              onContinue={() => setStep("provider")}
            />
          </div>
        ) : null}

        {step === "provider" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Step 3 – Select a Provider</h2>
              <p className="mt-1 text-sm text-white/70">
                {regionLabel ? `${regionLabel} — ` : null}
                providers from the Provider Registry.
              </p>
            </div>
            {providers.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#0b1524]/80 px-4 py-3 text-sm text-white/75">
                No recommended providers for this region yet. You can continue with Unit311 Logistics.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => {
                  const selected = providerCode === provider.code;
                  return (
                    <button
                      key={provider.code}
                      type="button"
                      onClick={() => setProviderCode(provider.code)}
                      className={cn(
                        "flex flex-col rounded-xl border p-4 text-left transition-colors",
                        selected
                          ? "border-sky-400/50 bg-sky-500/15 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]"
                          : "border-white/12 bg-[#0b1524]/80 hover:border-white/25",
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                        <Package className="h-4 w-4 text-sky-200" aria-hidden />
                      </span>
                      <span className="mt-3 text-sm font-semibold text-white">{provider.name}</span>
                      <span className="mt-1 text-xs leading-relaxed text-white/65">
                        Shipping provider · Registry
                      </span>
                      {selected ? (
                        <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                          <Check className="h-3 w-3" aria-hidden />
                          Selected
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            <StepActions
              onNotNow={handleNotNow}
              onBack={() => setStep("region")}
              continueDisabled={!providerCode}
              onContinue={() => setStep("business_account")}
            />
          </div>
        ) : null}

        {step === "business_account" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Step 4 – Business Account</h2>
              <p className="mt-1 text-sm text-white/70">
                Do you already have a business account
                {selectedProvider ? ` with ${selectedProvider.name}` : " with this provider"}?
              </p>
            </div>
            <div className="space-y-3">
              <OptionCard
                selected={businessAccount === "yes"}
                title="Yes"
                description="I already have a business shipping account."
                onSelect={() => setBusinessAccount("yes")}
              />
              <OptionCard
                selected={businessAccount === "no"}
                title="No"
                description="I do not have a business account yet."
                onSelect={() => setBusinessAccount("no")}
              />
              <OptionCard
                selected={businessAccount === "unsure"}
                title="I'm not sure"
                description="Help me understand what I need."
                onSelect={() => setBusinessAccount("unsure")}
              />
            </div>
            {businessAccount === "no" || businessAccount === "unsure" ? (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50/95">
                <p>
                  A <strong className="font-semibold">business account</strong> with the courier is
                  normally required for API integration. Unit311 will guide you through creating or
                  finding that account when you are ready.
                </p>
                {selectedProvider ? (
                  <p className="mt-2 text-amber-50/90">
                    Example: to connect {selectedProvider.name} for automation, you typically need a{" "}
                    {selectedProvider.name} business account first.
                  </p>
                ) : null}
                <p className="mt-2 text-amber-50/90">
                  You can skip provider setup and keep using Unit311 Logistics at any time.
                </p>
              </div>
            ) : null}
            <StepActions
              onNotNow={handleNotNow}
              onBack={() => setStep("provider")}
              continueDisabled={!businessAccount}
              onContinue={() => setStep("api_credentials")}
            />
          </div>
        ) : null}

        {step === "api_credentials" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Step 5 – API Credentials</h2>
              <p className="mt-1 text-sm text-white/70">Do you already have API credentials?</p>
            </div>
            <div className="space-y-3">
              <OptionCard
                selected={apiCredentials === "yes"}
                title="Yes"
                description="I have API keys or developer credentials ready."
                onSelect={() => setApiCredentials("yes")}
              />
              <OptionCard
                selected={apiCredentials === "no"}
                title="No"
                description="I do not have API credentials yet."
                onSelect={() => setApiCredentials("no")}
              />
              <OptionCard
                selected={apiCredentials === "unsure"}
                title="I'm not sure"
                description="I am not sure what API credentials are."
                onSelect={() => setApiCredentials("unsure")}
              />
            </div>
            {apiCredentials === "no" || apiCredentials === "unsure" ? (
              <div className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm leading-relaxed text-sky-50/95">
                <p>
                  Unit311 will guide you through obtaining the required credentials from the
                  provider&apos;s developer portal when you configure the connection.
                </p>
                <p className="mt-2">
                  You do not need to enter API keys in this setup step. Use{" "}
                  <strong className="font-semibold">Configure Later</strong> or{" "}
                  <strong className="font-semibold">Not now</strong> to open Logistics and finish
                  provider connection when you are ready.
                </p>
              </div>
            ) : null}
            {apiCredentials === "yes" ? (
              <div className="rounded-xl border border-white/12 bg-[#0b1524]/80 px-4 py-3 text-sm leading-relaxed text-white/75">
                Credential entry uses the standard Integration Framework connection flow. For this
                development phase, continue to the summary — live credential capture comes later.
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <button type="button" className={notNowBtnClassName} onClick={handleNotNow}>
                Not now
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryBtnClassName} onClick={handleConfigureLater}>
                  Configure Later
                </button>
                <button
                  type="button"
                  className={secondaryBtnClassName}
                  onClick={() => setStep("business_account")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={primaryBtnClassName}
                  disabled={!apiCredentials}
                  onClick={() => {
                    // No live API connect yet — treat selected provider as deferred for summary.
                    deferCurrentProviderIfAny();
                    setStep("finish");
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "finish" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Configuration summary</h2>
              <p className="mt-2 text-sm text-white/75">
                {leftEarly
                  ? "Setup paused. Unit311 Logistics is available now."
                  : "Your Logistics workspace is ready."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/90">
                  Unit311 Logistics
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Enabled</p>
                <p className="mt-1 text-xs text-white/70">
                  Record shipments and tracking numbers without a courier API.
                </p>
              </div>

              <div className="rounded-xl border border-white/12 bg-[#0b1524]/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Connected providers
                </p>
                {connectedProviders.length === 0 ? (
                  <p className="mt-1 text-sm text-white/80">None yet</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-white/85">
                    {connectedProviders.map((provider) => (
                      <li key={provider.name}>• {provider.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-white/12 bg-[#0b1524]/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Deferred providers
                </p>
                {deferredProviders.length === 0 ? (
                  <p className="mt-1 text-sm text-white/80">None</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-white/85">
                    {deferredProviders.map((provider) => (
                      <li key={provider.code}>
                        • {provider.name}
                        {regionLabel ? ` (${regionLabel})` : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/90">
                  Next steps
                </p>
                <ul className="mt-2 space-y-2 text-sm text-white/85">
                  {nextSteps.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <p className="max-w-[14rem] text-[11px] leading-relaxed text-white/55">
                Later: reopen setup from {FUTURE_ACCESS_PATH}.
              </p>
              <button type="button" className={primaryBtnClassName} onClick={goOpenLogistics}>
                Open Logistics Dashboard
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <p className="text-center text-[11px] leading-relaxed text-white/55">
        Development: wizard opens every time Logistics is opened. First-run persistence comes later.
        Future access: <span className="text-white/70">{FUTURE_ACCESS_PATH}</span>.
      </p>
    </div>
  );
}
