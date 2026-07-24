"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { internalSurveyNavSections } from "@/lib/internal-operations-data";
import { createInitialUsers } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import {
  fetchCachedJson,
  PLATFORM_CACHE_KEYS,
} from "@/lib/platform-fetch-cache";
import {
  isPerformanceModeEnabled,
  setPerformanceModeEnabled,
} from "@/lib/platform-performance";
import {
  Activity,
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Globe,
  Link2,
  Mail,
  Menu,
  Plus,
  Share2,
  Truck,
  Wallet,
} from "lucide-react";

import type { IntegrationConnectionPublic } from "@/lib/integration-framework-data";
import { useWebsiteMockStore } from "./useWebsiteMockStore";

const NAV_CUSTOM_STORAGE_KEY = "unit311-nav-custom";
const MOCK_USERS = createInitialUsers();

type PlatformCredentials = {
  id: "linkedin" | "instagram";
  name: string;
  accent: string;
  accentBorder: string;
  icon: React.ReactNode;
  urlPlaceholder: string;
};

type IntegrationCredentials = {
  apiKey: string;
  tenantId: string;
  syncEnabled: boolean;
};

type FinanceProvider = "xero" | "sage" | "oracle" | "sage-payroll" | "zoho-payroll";
type LogisticsProvider = "fedex" | "ups" | "dhl";
type EmailProvider = "office365" | "google-suite";

type ProviderOption<T extends string> = {
  id: T;
  name: string;
};

const FINANCE_PROVIDERS: ProviderOption<FinanceProvider>[] = [
  { id: "xero", name: "Xero" },
  { id: "sage", name: "Sage" },
  { id: "oracle", name: "Oracle" },
  { id: "sage-payroll", name: "Sage Payroll" },
  { id: "zoho-payroll", name: "Zoho Payroll" },
];

const LOGISTICS_PROVIDERS: ProviderOption<LogisticsProvider>[] = [
  { id: "fedex", name: "FedEx" },
  { id: "ups", name: "UPS" },
  { id: "dhl", name: "DHL" },
];

const EMAIL_PROVIDERS: ProviderOption<EmailProvider>[] = [
  { id: "office365", name: "Office 365" },
  { id: "google-suite", name: "Google Suite" },
];

function createEmptyIntegrationCredentials(): IntegrationCredentials {
  return { apiKey: "", tenantId: "", syncEnabled: false };
}

function createIntegrationCredentialsMap<T extends string>(
  providers: ProviderOption<T>[],
): Record<T, IntegrationCredentials> {
  return Object.fromEntries(
    providers.map((provider) => [provider.id, createEmptyIntegrationCredentials()]),
  ) as Record<T, IntegrationCredentials>;
}

type NavEditorItem = {
  id: string;
  label: string;
  sectionLabel: string | null;
  parentLabel?: string;
  custom?: boolean;
};

type NavCustomStorage = {
  order: string[];
  hidden: Record<string, boolean>;
  customItems: NavEditorItem[];
};

const PLATFORMS: PlatformCredentials[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    accent: "from-[#0A66C2]/20 to-[#0A66C2]/5",
    accentBorder: "border-[#0A66C2]/35",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0A66C2] text-[10px] font-bold text-white">
        in
      </span>
    ),
    urlPlaceholder: "https://www.linkedin.com/company/bcndrone",
  },
  {
    id: "instagram",
    name: "Instagram",
    accent: "from-fuchsia-500/20 via-pink-500/15 to-amber-500/10",
    accentBorder: "border-pink-400/35",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-[10px] font-bold text-white">
        IG
      </span>
    ),
    urlPlaceholder: "https://www.instagram.com/bcndrone",
  },
];

const NOTIFICATION_FUNCTIONS = ["Projects", "Support", "Finance"] as const;
const NOTIFICATION_FREQUENCIES = ["Immediate", "Hourly digest", "Daily digest", "Weekly summary"] as const;

function buildDefaultNavItems(): NavEditorItem[] {
  const items: NavEditorItem[] = [];
  internalSurveyNavSections.forEach((section) => {
    section.items.forEach((item) => {
      items.push({
        id: `nav-${section.label ?? "root"}-${item.label}`,
        label: item.label,
        sectionLabel: section.label,
      });
      if (item.children) {
        item.children.forEach((child) => {
          items.push({
            id: `nav-${section.label ?? "root"}-${item.label}-${child.label}`,
            label: child.label,
            sectionLabel: section.label,
            parentLabel: item.label,
          });
        });
      }
    });
  });
  return items;
}

function loadNavCustomState(): NavCustomStorage {
  const defaults = buildDefaultNavItems();
  if (typeof window === "undefined") {
    return { order: defaults.map((item) => item.id), hidden: {}, customItems: [] };
  }

  try {
    const raw = window.localStorage.getItem(NAV_CUSTOM_STORAGE_KEY);
    if (!raw) {
      return { order: defaults.map((item) => item.id), hidden: {}, customItems: [] };
    }
    const parsed = JSON.parse(raw) as Partial<NavCustomStorage>;
    return {
      order: parsed.order ?? defaults.map((item) => item.id),
      hidden: parsed.hidden ?? {},
      customItems: parsed.customItems ?? [],
    };
  } catch {
    return { order: defaults.map((item) => item.id), hidden: {}, customItems: [] };
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50 placeholder:text-white/30";
}

function SettingsColumn({
  title,
  description,
  icon,
  accentClass,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl xl:min-h-[32rem]",
        accentClass,
      )}
    >
      <header className="shrink-0 border-b border-white/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sky-300">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

function PlatformCredentialsCard({ platform }: { platform: PlatformCredentials }) {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-[#0b1524]/40",
        platform.accentBorder,
      )}
    >
      <div className={cn("border-b border-white/10 bg-gradient-to-r px-3 py-3", platform.accent)}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-white">
            {platform.icon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{platform.name}</h3>
            <p className="text-[10px] text-white/45">Account credentials</p>
          </div>
        </div>
      </div>

      <form
        className="space-y-3 p-3"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div>
          <FieldLabel>URL</FieldLabel>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={platform.urlPlaceholder}
            className={inputClassName()}
          />
        </div>

        <div>
          <FieldLabel>Username</FieldLabel>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={`${platform.name} username`}
            autoComplete="username"
            className={inputClassName()}
          />
        </div>

        <div>
          <FieldLabel>Password</FieldLabel>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className={inputClassName()}
          />
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:border-sky-400/40 hover:text-white"
        >
          Save credentials
        </button>
      </form>
    </article>
  );
}

function ProviderIntegrationSection<T extends string>({
  title,
  description,
  icon,
  providers,
  selectedProvider,
  onSelectProvider,
  credentials,
  onChangeCredentials,
  tenantLabel = "Tenant ID",
  tenantPlaceholder = "Tenant or organisation ID",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  providers: ProviderOption<T>[];
  selectedProvider: T | "";
  onSelectProvider: (provider: T | "") => void;
  credentials: IntegrationCredentials;
  onChangeCredentials: (next: IntegrationCredentials) => void;
  tenantLabel?: string;
  tenantPlaceholder?: string;
}) {
  const activeProvider = providers.find((provider) => provider.id === selectedProvider);

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1524]/40">
      <div className="border-b border-white/10 bg-white/[0.03] px-3 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-sky-300">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-[10px] text-white/45">{description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <FieldLabel>Provider</FieldLabel>
          <select
            value={selectedProvider}
            onChange={(event) => onSelectProvider(event.target.value as T | "")}
            className={inputClassName()}
          >
            <option value="">Choose provider…</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProvider && activeProvider ? (
          <div className="space-y-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200/80">
              {activeProvider.name} connection
            </p>
            <div>
              <FieldLabel>API key</FieldLabel>
              <input
                type="password"
                value={credentials.apiKey}
                onChange={(event) =>
                  onChangeCredentials({ ...credentials, apiKey: event.target.value })
                }
                placeholder={`${activeProvider.name} API key`}
                className={inputClassName()}
              />
            </div>
            <div>
              <FieldLabel>{tenantLabel}</FieldLabel>
              <input
                type="text"
                value={credentials.tenantId}
                onChange={(event) =>
                  onChangeCredentials({ ...credentials, tenantId: event.target.value })
                }
                placeholder={tenantPlaceholder}
                className={inputClassName()}
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1524]/60 px-3 py-2.5">
              <input
                type="checkbox"
                checked={credentials.syncEnabled}
                onChange={(event) =>
                  onChangeCredentials({ ...credentials, syncEnabled: event.target.checked })
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-500"
              />
              <span className="text-sm text-white/75">Enable automatic sync</span>
            </label>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function SettingsWorkspace() {
  const defaultNavItems = useMemo(() => buildDefaultNavItems(), []);
  const [navCustom, setNavCustom] = useState<NavCustomStorage>(() => loadNavCustomState());
  const [customNavLabel, setCustomNavLabel] = useState("");

  const [financeProvider, setFinanceProvider] = useState<FinanceProvider | "">("");
  const [logisticsProvider, setLogisticsProvider] = useState<LogisticsProvider | "">("");
  const [emailProvider, setEmailProvider] = useState<EmailProvider | "">("");

  const [financeCredentials, setFinanceCredentials] = useState<
    Record<FinanceProvider, IntegrationCredentials>
  >(() => createIntegrationCredentialsMap(FINANCE_PROVIDERS));
  const [logisticsCredentials, setLogisticsCredentials] = useState<
    Record<LogisticsProvider, IntegrationCredentials>
  >(() => createIntegrationCredentialsMap(LOGISTICS_PROVIDERS));
  const [emailCredentials, setEmailCredentials] = useState<
    Record<EmailProvider, IntegrationCredentials>
  >(() => createIntegrationCredentialsMap(EMAIL_PROVIDERS));

  const [phoneNotifications, setPhoneNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationFunctions, setNotificationFunctions] = useState<Record<string, boolean>>({
    Projects: true,
    Support: true,
    Finance: false,
  });
  const [alertUserIds, setAlertUserIds] = useState<string[]>([MOCK_USERS[0]?.id ?? ""]);
  const [notificationFrequency, setNotificationFrequency] =
    useState<(typeof NOTIFICATION_FREQUENCIES)[number]>("Daily digest");

  const websiteStore = useWebsiteMockStore();
  const [frameworkConnections, setFrameworkConnections] = useState<
    IntegrationConnectionPublic[]
  >([]);
  const [frameworkLoadState, setFrameworkLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [showPerfControls, setShowPerfControls] = useState(false);
  const [perfModeOn, setPerfModeOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCachedJson<{ role?: string | null; username?: string; userType?: string }>(
      PLATFORM_CACHE_KEYS.whoami,
      "/api/auth/whoami",
      { ttlMs: 120_000 },
    )
      .then((data) => {
        if (cancelled) return;
        const role = (data.role ?? "").toLowerCase();
        const admin =
          role === "admin" ||
          role === "administrator" ||
          role === "c-suite" ||
          data.username === "scott.parazynski";
        setShowPerfControls(admin);
        setPerfModeOn(isPerformanceModeEnabled());
      })
      .catch(() => {
        if (!cancelled) setShowPerfControls(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFrameworkLoadState("loading");
    void fetch("/api/integrations/connections")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load connections");
        const payload = (await response.json()) as {
          connections?: IntegrationConnectionPublic[];
        };
        if (cancelled) return;
        setFrameworkConnections(payload.connections ?? []);
        setFrameworkLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setFrameworkLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const websiteConnections = useMemo(
    () => frameworkConnections.filter((row) => row.category === "website"),
    [frameworkConnections],
  );

  const allNavItems = useMemo(() => {
    const byId = new Map<string, NavEditorItem>();
    defaultNavItems.forEach((item) => byId.set(item.id, item));
    navCustom.customItems.forEach((item) => byId.set(item.id, item));
    const ordered = navCustom.order
      .map((id) => byId.get(id))
      .filter((item): item is NavEditorItem => item != null);
    const missing = [...byId.values()].filter((item) => !navCustom.order.includes(item.id));
    return [...ordered, ...missing];
  }, [defaultNavItems, navCustom.customItems, navCustom.order]);

  const persistNavCustom = useCallback((next: NavCustomStorage) => {
    setNavCustom(next);
    window.localStorage.setItem(NAV_CUSTOM_STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (defaultNavItems.length === 0) return;
    if (navCustom.order.length === 0) {
      startTransition(() => {
        persistNavCustom({
          ...navCustom,
          order: defaultNavItems.map((item) => item.id),
        });
      });
    }
  }, [defaultNavItems, navCustom, persistNavCustom]);

  function moveNavItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= allNavItems.length) return;
    const order = allNavItems.map((item) => item.id);
    [order[index], order[target]] = [order[target], order[index]];
    persistNavCustom({ ...navCustom, order });
  }

  function toggleNavHidden(itemId: string) {
    persistNavCustom({
      ...navCustom,
      hidden: { ...navCustom.hidden, [itemId]: !navCustom.hidden[itemId] },
    });
  }

  function addCustomNavItem() {
    const label = customNavLabel.trim();
    if (!label) return;
    const id = `nav-custom-${Date.now()}`;
    const item: NavEditorItem = {
      id,
      label,
      sectionLabel: "Custom",
      custom: true,
    };
    persistNavCustom({
      ...navCustom,
      order: [...navCustom.order, id],
      customItems: [...navCustom.customItems, item],
    });
    setCustomNavLabel("");
  }

  function toggleAlertUser(userId: string) {
    setAlertUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  return (
    <div className="space-y-4">
      {showPerfControls ? (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-200">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Performance Mode</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/50">
                  Admin-only overlay for page load, API timings, cache hit rate, and JS weight.
                  Toggle anytime from the floating control.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !perfModeOn;
                setPerformanceModeEnabled(next);
                setPerfModeOn(next);
              }}
              className={cn(
                "inline-flex h-9 items-center rounded-xl border px-3 text-xs font-semibold transition-colors",
                perfModeOn
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                  : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
              )}
            >
              {perfModeOn ? "Enabled" : "Enable"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
        <SettingsColumn
          title="Integrations"
          description="Finance, logistics, email, and website CMS connections."
          icon={<Link2 className="h-4 w-4" />}
          accentClass="border-emerald-400/20"
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-[#0b1524]/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-sky-300">
                <Globe className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                  Website CMS
                </p>
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-white/45">
                Managed through Website Management and stored in the Integration Framework — not a
                second credential store.
              </p>
              {frameworkLoadState === "loading" ? (
                <p className="text-xs text-white/45">Loading framework connections…</p>
              ) : null}
              {websiteConnections.length > 0 ? (
                <ul className="space-y-2">
                  {websiteConnections.map((connection) => (
                    <li
                      key={connection.id}
                      className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-2"
                    >
                      <p className="text-xs font-medium text-white">
                        {connection.displayLabel || connection.providerDisplayName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/50">
                        {connection.providerCode} · {connection.status}
                        {connection.credentialsSet ? " · credentials set" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {websiteStore.websites.map((site) => (
                    <li
                      key={site.id}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
                    >
                      <p className="text-xs font-medium text-white">{site.name}</p>
                      <p className="mt-0.5 text-[10px] text-white/50">
                        {site.providerCode} · {site.cms} · {site.connectionStatus}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {frameworkLoadState === "error" ? (
                <p className="mt-2 text-[10px] text-amber-200/80">
                  Framework API unavailable — showing Website Management local connections until
                  migration 099 is applied.
                </p>
              ) : null}
            </div>

            <ProviderIntegrationSection
              title="Finance"
              description="Accounting and payroll systems."
              icon={<Wallet className="h-4 w-4" />}
              providers={FINANCE_PROVIDERS}
              selectedProvider={financeProvider}
              onSelectProvider={setFinanceProvider}
              credentials={
                financeProvider
                  ? financeCredentials[financeProvider]
                  : createEmptyIntegrationCredentials()
              }
              onChangeCredentials={(next) => {
                if (!financeProvider) return;
                setFinanceCredentials((current) => ({
                  ...current,
                  [financeProvider]: next,
                }));
              }}
            />

            <ProviderIntegrationSection
              title="Logistics"
              description="Courier and shipping APIs."
              icon={<Truck className="h-4 w-4" />}
              providers={LOGISTICS_PROVIDERS}
              selectedProvider={logisticsProvider}
              onSelectProvider={setLogisticsProvider}
              credentials={
                logisticsProvider
                  ? logisticsCredentials[logisticsProvider]
                  : createEmptyIntegrationCredentials()
              }
              onChangeCredentials={(next) => {
                if (!logisticsProvider) return;
                setLogisticsCredentials((current) => ({
                  ...current,
                  [logisticsProvider]: next,
                }));
              }}
              tenantLabel="Account number"
              tenantPlaceholder="Shipper or account number"
            />

            <ProviderIntegrationSection
              title="Email"
              description="Mailbox and calendar providers."
              icon={<Mail className="h-4 w-4" />}
              providers={EMAIL_PROVIDERS}
              selectedProvider={emailProvider}
              onSelectProvider={setEmailProvider}
              credentials={
                emailProvider
                  ? emailCredentials[emailProvider]
                  : createEmptyIntegrationCredentials()
              }
              onChangeCredentials={(next) => {
                if (!emailProvider) return;
                setEmailCredentials((current) => ({
                  ...current,
                  [emailProvider]: next,
                }));
              }}
            />

            <p className="text-[10px] leading-relaxed text-white/35">
              Finance, logistics, and email credentials remain local until those connectors ship.
              Website CMS connections use the Integration Framework.
            </p>
          </div>
        </SettingsColumn>

        <SettingsColumn
          title="Sidebar"
          description="Reorder, hide, or add custom nav items."
          icon={<Menu className="h-4 w-4" />}
          accentClass="border-violet-400/20"
        >
          <ul className="space-y-1.5">
            {allNavItems.map((item, index) => {
              const hidden = navCustom.hidden[item.id] ?? false;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg border border-white/10 bg-[#0b1524]/60 px-2.5 py-2",
                    hidden && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/90">
                        {item.parentLabel ? `${item.parentLabel} › ${item.label}` : item.label}
                        {item.custom && (
                          <span className="ml-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-1 py-px text-[9px] text-violet-200">
                            Custom
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[10px] text-white/40">
                        {item.sectionLabel ?? "General"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveNavItem(index, -1)}
                        disabled={index === 0}
                        className="rounded border border-white/10 p-0.5 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveNavItem(index, 1)}
                        disabled={index === allNavItems.length - 1}
                        className="rounded border border-white/10 p-0.5 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleNavHidden(item.id)}
                        className="rounded border border-white/10 p-0.5 text-white/50 hover:bg-white/5 hover:text-white"
                        aria-label={hidden ? "Show item" : "Hide item"}
                      >
                        {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <FieldLabel>Add custom item</FieldLabel>
            <div className="flex gap-2">
              <input
                value={customNavLabel}
                onChange={(event) => setCustomNavLabel(event.target.value)}
                placeholder="Menu label"
                className={cn(inputClassName(), "mt-0 min-w-0 flex-1")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomNavItem();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomNavItem}
                disabled={!customNavLabel.trim()}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-400/35 bg-violet-500/15 px-2.5 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <p className="text-[10px] text-white/35">
              Saved to <code className="text-white/50">{NAV_CUSTOM_STORAGE_KEY}</code>
            </p>
          </div>
        </SettingsColumn>

        <SettingsColumn
          title="Notifications"
          description="Phone, email, and digest preferences."
          icon={<Bell className="h-4 w-4" />}
          accentClass="border-amber-400/20"
        >
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b1524]/60 px-3 py-2.5">
              <span className="text-xs text-white/80">Phone notifications</span>
              <input
                type="checkbox"
                checked={phoneNotifications}
                onChange={(event) => setPhoneNotifications(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b1524]/60 px-3 py-2.5">
              <span className="text-xs text-white/80">Email notifications</span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(event) => setEmailNotifications(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
              />
            </label>

            <div>
              <FieldLabel>Functions</FieldLabel>
              <div className="mt-1.5 space-y-1.5">
                {NOTIFICATION_FUNCTIONS.map((fn) => (
                  <label
                    key={fn}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1524]/60 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={notificationFunctions[fn] ?? false}
                      onChange={(event) =>
                        setNotificationFunctions((current) => ({
                          ...current,
                          [fn]: event.target.checked,
                        }))
                      }
                      className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-sky-500"
                    />
                    <span className="text-xs text-white/75">{fn}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Alert users</FieldLabel>
              <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-[#0b1524] p-1.5">
                {MOCK_USERS.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={alertUserIds.includes(user.id)}
                      onChange={() => toggleAlertUser(user.id)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-sky-500"
                    />
                    <span className="truncate text-white/85">{user.fullName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Frequency</FieldLabel>
              <select
                value={notificationFrequency}
                onChange={(event) =>
                  setNotificationFrequency(
                    event.target.value as (typeof NOTIFICATION_FREQUENCIES)[number],
                  )
                }
                className={inputClassName()}
              >
                {NOTIFICATION_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SettingsColumn>

        <SettingsColumn
          title="Social accounts"
          description="LinkedIn and Instagram publishing credentials."
          icon={<Share2 className="h-4 w-4" />}
          accentClass="border-pink-400/20"
        >
          <div className="space-y-3">
            {PLATFORMS.map((platform) => (
              <PlatformCredentialsCard key={platform.id} platform={platform} />
            ))}
            <p className="text-[10px] leading-relaxed text-white/35">
              Mockup only — these credentials will power the Social workspace when integrations go
              live.
            </p>
          </div>
        </SettingsColumn>
      </div>
    </div>
  );
}
