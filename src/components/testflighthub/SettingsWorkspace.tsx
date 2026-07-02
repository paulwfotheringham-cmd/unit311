"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { internalSurveyNavSections } from "@/lib/internal-operations-data";
import { createInitialUsers } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Link2,
  Menu,
  Plus,
  Settings,
  Share2,
} from "lucide-react";

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

type AccountancyPackage = "xero" | "quickbooks" | "sage";

type AccountancyIntegration = {
  package: AccountancyPackage;
  apiKey: string;
  tenantId: string;
  syncEnabled: boolean;
};

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

const ACCOUNTANCY_PACKAGES: { id: AccountancyPackage; name: string; accent: string }[] = [
  { id: "xero", name: "Xero", accent: "border-[#13B5EA]/35 from-[#13B5EA]/15 to-[#13B5EA]/5" },
  { id: "quickbooks", name: "QuickBooks", accent: "border-[#2CA01C]/35 from-[#2CA01C]/15 to-[#2CA01C]/5" },
  { id: "sage", name: "Sage", accent: "border-emerald-400/35 from-emerald-500/15 to-emerald-500/5" },
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

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#60a5fa]">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
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
        "overflow-hidden rounded-2xl border bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl",
        platform.accentBorder,
      )}
    >
      <div
        className={cn(
          "border-b border-white/10 bg-gradient-to-r px-4 py-4 sm:px-5",
          platform.accent,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white">
            {platform.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white sm:text-lg">{platform.name}</h3>
            <p className="text-xs text-white/50">Account credentials</p>
          </div>
        </div>
      </div>

      <form
        className="space-y-4 p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div>
          <FieldLabel>{platform.name} URL</FieldLabel>
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
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-sky-400/40 hover:text-white"
        >
          Save credentials
        </button>

        <p className="text-center text-[11px] text-white/35">
          Mockup only — credentials will connect to the Social page in a future release.
        </p>
      </form>
    </article>
  );
}

function AccountancyCard({
  pkg,
  integration,
  onChange,
}: {
  pkg: (typeof ACCOUNTANCY_PACKAGES)[number];
  integration: AccountancyIntegration;
  onChange: (next: AccountancyIntegration) => void;
}) {
  return (
    <article className={cn("rounded-xl border bg-gradient-to-br p-4", pkg.accent)}>
      <h3 className="text-sm font-semibold text-white">{pkg.name}</h3>
      <div className="mt-3 space-y-3">
        <div>
          <FieldLabel>API key</FieldLabel>
          <input
            type="password"
            value={integration.apiKey}
            onChange={(event) => onChange({ ...integration, apiKey: event.target.value })}
            placeholder={`${pkg.name} API key`}
            className={inputClassName()}
          />
        </div>
        <div>
          <FieldLabel>Tenant ID</FieldLabel>
          <input
            type="text"
            value={integration.tenantId}
            onChange={(event) => onChange({ ...integration, tenantId: event.target.value })}
            placeholder="Tenant or organisation ID"
            className={inputClassName()}
          />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1524]/60 px-3 py-2.5">
          <input
            type="checkbox"
            checked={integration.syncEnabled}
            onChange={(event) => onChange({ ...integration, syncEnabled: event.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-500"
          />
          <span className="text-sm text-white/75">Enable automatic sync</span>
        </label>
      </div>
    </article>
  );
}

export default function SettingsWorkspace() {
  const defaultNavItems = useMemo(() => buildDefaultNavItems(), []);
  const [navCustom, setNavCustom] = useState<NavCustomStorage>(() => loadNavCustomState());
  const [customNavLabel, setCustomNavLabel] = useState("");

  const [integrations, setIntegrations] = useState<Record<AccountancyPackage, AccountancyIntegration>>({
    xero: { package: "xero", apiKey: "", tenantId: "", syncEnabled: false },
    quickbooks: { package: "quickbooks", apiKey: "", tenantId: "", syncEnabled: false },
    sage: { package: "sage", apiKey: "", tenantId: "", syncEnabled: false },
  });

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
      persistNavCustom({
        ...navCustom,
        order: defaultNavItems.map((item) => item.id),
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#60a5fa]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Workspace settings</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
              Configure integrations, navigation, notifications, and social account credentials for
              the internal operations workspace.
            </p>
          </div>
        </div>
      </section>

      <SectionCard
        title="External integrations"
        description="Connect accountancy packages for finance sync. Credentials are stored in local state only for this preview."
        icon={<Link2 className="h-5 w-5" />}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {ACCOUNTANCY_PACKAGES.map((pkg) => (
            <AccountancyCard
              key={pkg.id}
              pkg={pkg}
              integration={integrations[pkg.id]}
              onChange={(next) =>
                setIntegrations((current) => ({ ...current, [pkg.id]: next }))
              }
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Sidebar menu editor"
        description="Reorder, hide, or add custom navigation items. Custom entries are saved to localStorage."
        icon={<Menu className="h-5 w-5" />}
      >
        <ul className="space-y-2">
          {allNavItems.map((item, index) => {
            const hidden = navCustom.hidden[item.id] ?? false;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1524]/60 px-3 py-2",
                  hidden && "opacity-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/90">
                    {item.parentLabel ? `${item.parentLabel} › ${item.label}` : item.label}
                    {item.custom && (
                      <span className="ml-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-200">
                        Custom
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/40">{item.sectionLabel ?? "General"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveNavItem(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-white/10 p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveNavItem(index, 1)}
                    disabled={index === allNavItems.length - 1}
                    className="rounded-lg border border-white/10 p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleNavHidden(item.id)}
                    className="rounded-lg border border-white/10 p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                    aria-label={hidden ? "Show item" : "Hide item"}
                  >
                    {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={customNavLabel}
            onChange={(event) => setCustomNavLabel(event.target.value)}
            placeholder="Custom menu label"
            className={cn(inputClassName(), "mt-0 max-w-xs flex-1")}
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add custom item
          </button>
        </div>
        <p className="mt-2 text-[11px] text-white/35">
          Stored under <code className="text-white/50">{NAV_CUSTOM_STORAGE_KEY}</code> in localStorage.
        </p>
      </SectionCard>

      <SectionCard
        title="Notifications"
        description="Preview notification preferences. No messages are sent from this mockup."
        icon={<Bell className="h-5 w-5" />}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1524]/60 px-4 py-3">
              <span className="text-sm text-white/80">Phone notifications</span>
              <input
                type="checkbox"
                checked={phoneNotifications}
                onChange={(event) => setPhoneNotifications(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1524]/60 px-4 py-3">
              <span className="text-sm text-white/80">Email notifications</span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(event) => setEmailNotifications(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
              />
            </label>

            <div>
              <FieldLabel>Functions</FieldLabel>
              <div className="mt-2 space-y-2">
                {NOTIFICATION_FUNCTIONS.map((fn) => (
                  <label
                    key={fn}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1524]/60 px-3 py-2.5"
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
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
                    />
                    <span className="text-sm text-white/75">{fn}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel>User alert targets</FieldLabel>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0b1524] p-2">
                {MOCK_USERS.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={alertUserIds.includes(user.id)}
                      onChange={() => toggleAlertUser(user.id)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
                    />
                    <span className="text-white/85">{user.fullName}</span>
                    <span className="text-xs text-white/40">{user.email}</span>
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
        </div>
      </SectionCard>

      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#60a5fa]">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Social account settings</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
              Enter LinkedIn and Instagram account details here. These fields are placeholders for
              now — they will power publishing on the Social page when integrations are enabled.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {PLATFORMS.map((platform) => (
          <PlatformCredentialsCard key={platform.id} platform={platform} />
        ))}
      </div>
    </div>
  );
}
