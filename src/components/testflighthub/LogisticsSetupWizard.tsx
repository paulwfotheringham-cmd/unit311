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
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe2,
  Package,
  Truck,
} from "lucide-react";

import {
  SHIPPING_REGIONS,
  WIZARD_SHIPPING_REGIONS,
  getProviderBrandName,
  getShippingProviderByCode,
  listRecommendedProvidersForRegion,
  type ShippingProviderRegistryEntry,
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

function TriStateQuestion({
  name,
  question,
  value,
  onChange,
}: {
  name: string;
  question: string;
  value: TriState;
  onChange: (next: TriState) => void;
}) {
  const options: { value: Exclude<TriState, null>; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "I'm Not Sure" },
  ];

  return (
    <fieldset className="rounded-xl border border-white/12 bg-[#0b1524]/70 px-4 py-3.5">
      <legend className="px-1 text-sm font-semibold text-white">{question}</legend>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                selected
                  ? "border-sky-400/45 bg-sky-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20",
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-sky-300 bg-sky-400" : "border-white/35",
                )}
                aria-hidden
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-[#0b1524]" /> : null}
              </span>
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function businessAccountGuidance({
  brand,
  businessAccount,
  onlineAccess,
  apiCredentials,
}: {
  brand: string;
  businessAccount: TriState;
  onlineAccess: TriState;
  apiCredentials: TriState;
}): { tone: "amber" | "sky" | "emerald" | "neutral"; message: string; showVisit: boolean } | null {
  if (!businessAccount && !onlineAccess && !apiCredentials) return null;

  if (businessAccount === "no") {
    return {
      tone: "amber",
      message: `You'll first need to create a business account with ${brand} before your workspace can connect.`,
      showVisit: true,
    };
  }

  if (businessAccount === "unsure") {
    return {
      tone: "amber",
      message: `A ${brand} business account is normally required before Unit311 can connect. If you are unsure whether you have one, check with your shipping team or visit ${brand} to confirm.`,
      showVisit: true,
    };
  }

  if (businessAccount === "yes" && onlineAccess === "no") {
    return {
      tone: "sky",
      message: `You will need online access to your ${brand} account so you can reach the developer portal and prepare a connection later.`,
      showVisit: true,
    };
  }

  if (businessAccount === "yes" && onlineAccess === "unsure") {
    return {
      tone: "sky",
      message: `Online account access is needed to reach the ${brand} Developer Portal. If you are unsure, try signing in to your ${brand} business account first.`,
      showVisit: true,
    };
  }

  if (
    businessAccount === "yes" &&
    (onlineAccess === "yes" || onlineAccess === null) &&
    apiCredentials === "no"
  ) {
    return {
      tone: "sky",
      message: "Great. The next step will help you create API credentials.",
      showVisit: false,
    };
  }

  if (
    businessAccount === "yes" &&
    (onlineAccess === "yes" || onlineAccess === null) &&
    apiCredentials === "unsure"
  ) {
    return {
      tone: "sky",
      message: `API credentials are issued from the ${brand} Developer Portal. You do not need to enter them on this screen — Unit311 will guide you when you are ready to connect.`,
      showVisit: false,
    };
  }

  if (businessAccount === "yes" && onlineAccess === "yes" && apiCredentials === "yes") {
    return {
      tone: "emerald",
      message: `You're ready to connect your ${brand} account.`,
      showVisit: false,
    };
  }

  if (businessAccount === "yes") {
    return {
      tone: "neutral",
      message: `Answer the questions above so we can guide you. You can skip setup at any time and keep using Unit311 Logistics.`,
      showVisit: false,
    };
  }

  return null;
}

function ProviderLogoPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-sky-500/20 via-white/[0.06] to-indigo-500/10 text-sm font-bold tracking-wide text-sky-100"
      aria-hidden
    >
      {initials || <Package className="h-5 w-5 text-sky-200" />}
    </span>
  );
}

function ProviderSelectionCard({
  provider,
  selected,
  learnMoreOpen,
  onToggleLearnMore,
  onSelect,
}: {
  provider: ShippingProviderRegistryEntry;
  selected: boolean;
  learnMoreOpen: boolean;
  onToggleLearnMore: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border p-4 transition-colors sm:p-5",
        selected
          ? "border-sky-400/55 bg-sky-500/12 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.22)]"
          : "border-white/12 bg-[#0b1524]/85 hover:border-white/22",
      )}
    >
      <div className="flex items-start gap-3">
        <ProviderLogoPlaceholder name={provider.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{provider.name}</h3>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">
                <Check className="h-3 w-3" aria-hidden />
                Selected
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">{provider.shortDescription}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Best suited for
          </p>
          <ul className="mt-1.5 space-y-1">
            {provider.bestSuitedFor.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-sm text-white/80">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-300/80" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Typical use cases
          </p>
          <ul className="mt-1.5 space-y-1">
            {provider.typicalUseCases.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-sm text-white/80">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {learnMoreOpen ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed text-white/70">
          {provider.learnMore ?? provider.shortDescription}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <button
          type="button"
          className={secondaryBtnClassName}
          onClick={onToggleLearnMore}
          aria-expanded={learnMoreOpen}
        >
          {learnMoreOpen ? (
            <>
              <ChevronUp className="mr-1.5 h-4 w-4" aria-hidden />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-4 w-4" aria-hidden />
              Learn More
            </>
          )}
        </button>
        <button type="button" className={primaryBtnClassName} onClick={onSelect}>
          Select Provider
        </button>
      </div>
    </article>
  );
}

export default function LogisticsSetupWizard({ onOpenLogistics }: LogisticsSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [path, setPath] = useState<SetupPath>(null);
  const [region, setRegion] = useState<ShippingRegionCode | null>(null);
  const [providerCode, setProviderCode] = useState<string | null>(null);
  const [learnMoreCode, setLearnMoreCode] = useState<string | null>(null);
  const [businessAccount, setBusinessAccount] = useState<TriState>(null);
  const [onlineAccess, setOnlineAccess] = useState<TriState>(null);
  const [apiCredentials, setApiCredentials] = useState<TriState>(null);
  /** Providers marked deferred (configure later / not now mid-flow). No live connect in this phase. */
  const [deferredProviderCodes, setDeferredProviderCodes] = useState<string[]>([]);
  const [leftEarly, setLeftEarly] = useState(false);

  const providers = useMemo(
    () => (region ? listRecommendedProvidersForRegion(region) : []),
    [region],
  );
  const selectedProvider = providerCode ? getShippingProviderByCode(providerCode) : undefined;
  const providerBrand = selectedProvider ? getProviderBrandName(selectedProvider) : "this provider";
  const regionLabel = SHIPPING_REGIONS.find((entry) => entry.code === region)?.label;
  const wideLayout = step === "region" || step === "provider";
  const accountGuidance = businessAccountGuidance({
    brand: providerBrand,
    businessAccount,
    onlineAccess,
    apiCredentials,
  });
  const businessAccountReady = Boolean(businessAccount && onlineAccess && apiCredentials);

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

  function selectRegion(code: ShippingRegionCode) {
    setRegion(code);
    setProviderCode(null);
    setLearnMoreCode(null);
    setStep("provider");
  }

  function selectProvider(code: string) {
    setProviderCode(code);
    setLearnMoreCode(null);
    setBusinessAccount(null);
    setOnlineAccess(null);
    setApiCredentials(null);
    setStep("business_account");
  }

  function finishBusinessAccountStep() {
    // No live connect yet — defer selected provider; Connection Wizard handles credentials later.
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
    <div className={cn("mx-auto space-y-4", wideLayout ? "max-w-5xl" : "max-w-2xl")}>
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
                description="Choose a courier that fits your business and prepare your shipping account."
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
              <h2 className="text-lg font-semibold text-white">Select Shipping Region</h2>
              <p className="mt-1 text-sm text-white/70">
                Choose where you ship from. We will show providers that fit that market.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {WIZARD_SHIPPING_REGIONS.map((entry) => {
                const selected = region === entry.code;
                return (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() => selectRegion(entry.code)}
                    className={cn(
                      "min-h-[7.5rem] rounded-2xl border px-5 py-5 text-left transition-colors",
                      selected
                        ? "border-sky-400/55 bg-sky-500/15 text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.22)]"
                        : "border-white/12 bg-[#0b1524]/85 text-white/90 hover:border-white/25",
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04]">
                      <Globe2 className="h-5 w-5 text-sky-200" aria-hidden />
                    </span>
                    <span className="mt-4 block text-lg font-semibold tracking-tight">{entry.label}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-white/65">
                      {entry.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <StepActions onNotNow={handleNotNow} onBack={() => setStep("choose_path")} />
          </div>
        ) : null}

        {step === "provider" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Choose a Shipping Provider</h2>
              <p className="mt-1 text-sm text-white/70">
                {regionLabel ? `${regionLabel} — ` : null}
                compare providers and pick the one that best fits how you ship. You can change this
                later.
              </p>
            </div>
            {providers.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#0b1524]/80 px-4 py-3 text-sm text-white/75">
                No recommended providers for this region yet. You can continue with Unit311 Logistics.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {providers.map((provider) => (
                  <ProviderSelectionCard
                    key={provider.code}
                    provider={provider}
                    selected={providerCode === provider.code}
                    learnMoreOpen={learnMoreCode === provider.code}
                    onToggleLearnMore={() =>
                      setLearnMoreCode((current) =>
                        current === provider.code ? null : provider.code,
                      )
                    }
                    onSelect={() => selectProvider(provider.code)}
                  />
                ))}
              </div>
            )}
            <StepActions onNotNow={handleNotNow} onBack={() => setStep("region")} />
          </div>
        ) : null}

        {step === "business_account" ? (
          <div className="mt-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Business Account</h2>
              <p className="mt-1 text-sm text-white/70">
                Understand what you need to connect {providerBrand}. You will not enter credentials
                on this screen.
              </p>
            </div>

            <div className="rounded-2xl border border-white/12 bg-[#0b1524]/85 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                {selectedProvider ? <ProviderLogoPlaceholder name={selectedProvider.name} /> : null}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Selected provider
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                    {selectedProvider?.name ?? providerBrand}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-sm font-medium text-white/90">
                  To connect {providerBrand} to Unit311 you will normally need:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/80">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    <span>A {providerBrand} Business Account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    <span>Access to the {providerBrand} Developer Portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    <span>API credentials</span>
                  </li>
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  Don&apos;t worry if you don&apos;t have these yet.
                  <br />
                  We&apos;ll guide you through the process.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Current status
              </p>
              <TriStateQuestion
                name="business_account"
                question="Do you already have a Business Account?"
                value={businessAccount}
                onChange={setBusinessAccount}
              />
              <TriStateQuestion
                name="online_access"
                question="Do you already have online access to your account?"
                value={onlineAccess}
                onChange={setOnlineAccess}
              />
              <TriStateQuestion
                name="api_credentials"
                question="Have you already created API credentials?"
                value={apiCredentials}
                onChange={setApiCredentials}
              />
            </div>

            {accountGuidance ? (
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm leading-relaxed",
                  accountGuidance.tone === "amber" &&
                    "border-amber-400/25 bg-amber-500/10 text-amber-50/95",
                  accountGuidance.tone === "sky" && "border-sky-400/25 bg-sky-500/10 text-sky-50/95",
                  accountGuidance.tone === "emerald" &&
                    "border-emerald-400/25 bg-emerald-500/10 text-emerald-50/95",
                  accountGuidance.tone === "neutral" &&
                    "border-white/12 bg-[#0b1524]/80 text-white/80",
                )}
              >
                <p>{accountGuidance.message}</p>
                {accountGuidance.showVisit && selectedProvider?.businessAccountUrl ? (
                  <a
                    href={selectedProvider.businessAccountUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(primaryBtnClassName, "mt-3 inline-flex gap-2")}
                  >
                    Visit {providerBrand}
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
                <p className="mt-3 text-white/70">
                  You can choose Not Now to defer provider setup and keep using Unit311 Logistics
                  immediately. Return later from {FUTURE_ACCESS_PATH}.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                className={secondaryBtnClassName}
                onClick={() => setStep("provider")}
              >
                Back
              </button>
              <button type="button" className={notNowBtnClassName} onClick={handleNotNow}>
                Not Now
              </button>
              <button
                type="button"
                className={cn(primaryBtnClassName, "ml-auto")}
                disabled={!businessAccountReady}
                onClick={finishBusinessAccountStep}
              >
                Continue
              </button>
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
