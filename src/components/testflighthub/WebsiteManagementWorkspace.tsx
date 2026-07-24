"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Shield,
} from "lucide-react";

import {
  WEBSITE_CMS_TYPES,
  WEBSITE_ENVIRONMENTS,
  websiteStatusClass,
  type ManagedWebsite,
  type WebsiteCmsType,
  type WebsiteContentItem,
  type WebsiteEnvironment,
} from "@/lib/website-management-data";
import {
  addManagedWebsite,
  deleteContentItem,
  recordDeployment,
  updateContentStatus,
} from "@/lib/website-management-mock-store";
import { cn } from "@/lib/utils";
import { useWebsiteMockStore } from "./useWebsiteMockStore";
import {
  WsEmpty,
  WsInputClass,
  WsKpiTile,
  WsLabelClass,
  WsPrimaryButtonClass,
  WsSecondaryButtonClass,
  WsSection,
  WsSlideOver,
  WsStatusPill,
} from "./domain-workspace-ui";

const CONTENT_TABS = [
  "Pages",
  "Posts",
  "Media",
  "Menus",
  "Categories",
  "Tags",
  "Users",
  "Plugins",
  "Themes",
  "SEO",
  "Analytics",
  "Deployments",
  "Backups",
] as const;

type ContentTab = (typeof CONTENT_TABS)[number];

type DemoRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  author: string;
  meta?: string;
};

type Notice = {
  tone: "success" | "warning" | "info";
  message: string;
};

type WizardForm = {
  cms: WebsiteCmsType;
  websiteUrl: string;
  restApiUrl: string;
  username: string;
  secret: string;
  environment: WebsiteEnvironment;
  name: string;
  clientName: string;
};

const emptyWizardForm = (): WizardForm => ({
  cms: "WordPress",
  websiteUrl: "",
  restApiUrl: "",
  username: "",
  secret: "",
  environment: "Production",
  name: "",
  clientName: "",
});

function formatDateTime(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatShortDate(dateKey: string) {
  if (!dateKey) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey.includes("T") ? dateKey : `${dateKey}T12:00:00`}`));
}

function tabToStoreKind(tab: ContentTab): WebsiteContentItem["kind"] | null {
  switch (tab) {
    case "Pages":
      return "Page";
    case "Posts":
      return "Post";
    case "Media":
      return "Media";
    case "Menus":
      return "Menu";
    case "Plugins":
      return "Plugin";
    case "Themes":
      return "Theme";
    default:
      return null;
  }
}

function demoRowsForTab(tab: ContentTab, website: ManagedWebsite): DemoRow[] {
  const prefix = website.id;
  switch (tab) {
    case "Menus":
      return [
        {
          id: `${prefix}-menu-main`,
          title: "Primary navigation",
          status: "Published",
          updatedAt: "2026-07-14",
          author: "Marketing",
          meta: "6 items",
        },
        {
          id: `${prefix}-menu-footer`,
          title: "Footer links",
          status: "Published",
          updatedAt: "2026-06-28",
          author: "Marketing",
          meta: "4 items",
        },
      ];
    case "Categories":
      return [
        {
          id: `${prefix}-cat-news`,
          title: "News & updates",
          status: "Published",
          updatedAt: "2026-07-08",
          author: "Editorial",
          meta: "18 posts",
        },
        {
          id: `${prefix}-cat-product`,
          title: "Product",
          status: "Published",
          updatedAt: "2026-07-02",
          author: "Product",
          meta: "9 posts",
        },
        {
          id: `${prefix}-cat-case`,
          title: "Case studies",
          status: "Draft",
          updatedAt: "2026-07-19",
          author: "Marketing",
          meta: "4 posts",
        },
      ];
    case "Tags":
      return [
        {
          id: `${prefix}-tag-drone`,
          title: "drone-operations",
          status: "Published",
          updatedAt: "2026-07-12",
          author: "SEO",
          meta: "11 uses",
        },
        {
          id: `${prefix}-tag-survey`,
          title: "survey-mapping",
          status: "Published",
          updatedAt: "2026-07-05",
          author: "SEO",
          meta: "7 uses",
        },
      ];
    case "Users":
      return [
        {
          id: `${prefix}-user-editor`,
          title: "editor@client.example",
          status: "Published",
          updatedAt: "2026-07-20",
          author: "Administrator",
          meta: "Editor role",
        },
        {
          id: `${prefix}-user-author`,
          title: "author@client.example",
          status: "Published",
          updatedAt: "2026-07-16",
          author: "Administrator",
          meta: "Author role",
        },
      ];
    case "SEO":
      return [
        {
          id: `${prefix}-seo-home`,
          title: "Home — meta title & description",
          status: "Published",
          updatedAt: "2026-07-18",
          author: "SEO",
          meta: "Score 92",
        },
        {
          id: `${prefix}-seo-sitemap`,
          title: "XML sitemap",
          status: "Published",
          updatedAt: "2026-07-17",
          author: "Ops",
          meta: `${website.pages + website.posts} URLs`,
        },
      ];
    case "Analytics":
      return [
        {
          id: `${prefix}-an-visitors`,
          title: "Unique visitors (30 days)",
          status: "Published",
          updatedAt: "2026-07-20",
          author: "Analytics",
          meta: website.analyticsVisitors.toLocaleString(),
        },
        {
          id: `${prefix}-an-sources`,
          title: "Top traffic sources",
          status: "Published",
          updatedAt: "2026-07-20",
          author: "Analytics",
          meta: "Organic, Direct, Referral",
        },
      ];
    case "Backups":
      return Array.from({ length: Math.min(website.backups, 5) }, (_, index) => ({
        id: `${prefix}-backup-${index}`,
        title: `Snapshot ${index === 0 ? "(latest)" : `#${website.backups - index}`}`,
        status: index === 0 ? "Published" : "Archived",
        updatedAt: formatShortDate(
          new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
        ),
        author: "Backup service",
        meta: index === 0 ? "Verified" : "Restorable",
      }));
    default:
      return [];
  }
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss?: () => void }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : notice.tone === "warning"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : "border-sky-400/30 bg-sky-500/10 text-sky-100";

  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm", toneClass)}>
      <p>{notice.message}</p>
      {onDismiss ? (
        <button type="button" className="shrink-0 text-xs underline opacity-80" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={WsLabelClass()}>{label}</label>
      {children}
    </div>
  );
}

function actionButtonClass(tone: "sky" | "amber" | "rose" | "emerald" | "neutral") {
  const map = {
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    amber: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
    emerald: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    neutral: "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
  } as const;
  return cn(
    "inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition-colors",
    map[tone],
  );
}

export default function WebsiteManagementWorkspace() {
  const store = useWebsiteMockStore();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(
    store.websites[0]?.id ?? null,
  );
  const [activeTab, setActiveTab] = useState<ContentTab>("Pages");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState<WizardForm>(emptyWizardForm);
  const [connectionTested, setConnectionTested] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [finishingWizard, setFinishingWizard] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<WebsiteContentItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actionNotice, setActionNotice] = useState<Notice | null>(null);

  const selectedWebsite = useMemo(
    () => store.websites.find((site) => site.id === selectedWebsiteId) ?? null,
    [store.websites, selectedWebsiteId],
  );

  const dashboardKpis = useMemo(() => {
    const connected = store.websites.filter((site) => site.connectionStatus === "connected").length;
    const lastDeploy = store.websites.reduce<string | null>((latest, site) => {
      if (!site.lastDeployment) return latest;
      if (!latest || site.lastDeployment > latest) return site.lastDeployment;
      return latest;
    }, null);
    return {
      connected,
      lastDeploy,
      pages: store.websites.reduce((sum, site) => sum + site.pages, 0),
      posts: store.websites.reduce((sum, site) => sum + site.posts, 0),
      media: store.websites.reduce((sum, site) => sum + site.media, 0),
      pluginUpdates: store.websites.reduce((sum, site) => sum + site.pluginUpdates, 0),
      themeUpdates: store.websites.reduce((sum, site) => sum + site.themeUpdates, 0),
      sslValid: store.websites.filter((site) => site.sslStatus === "Valid").length,
      backups: store.websites.reduce((sum, site) => sum + site.backups, 0),
      analytics: store.websites.reduce((sum, site) => sum + site.analyticsVisitors, 0),
    };
  }, [store.websites]);

  const storeKind = tabToStoreKind(activeTab);

  const tabRows = useMemo(() => {
    if (!selectedWebsite) return { storeItems: [] as WebsiteContentItem[], demoItems: [] as DemoRow[] };
    if (activeTab === "Deployments") {
      return { storeItems: [], demoItems: [] as DemoRow[] };
    }
    if (storeKind) {
      const storeItems = [
        ...store.content.filter(
          (item) => item.websiteId === selectedWebsite.id && item.kind === storeKind,
        ),
        ...localDrafts.filter(
          (item) => item.websiteId === selectedWebsite.id && item.kind === storeKind,
        ),
      ];
      if (storeItems.length > 0) {
        return { storeItems, demoItems: [] as DemoRow[] };
      }
      return { storeItems: [], demoItems: demoRowsForTab(activeTab, selectedWebsite) };
    }
    return { storeItems: [], demoItems: demoRowsForTab(activeTab, selectedWebsite) };
  }, [activeTab, localDrafts, selectedWebsite, store.content, storeKind]);

  const websiteDeployments = useMemo(() => {
    if (!selectedWebsite) return [];
    return store.deployments
      .filter((row) => row.websiteId === selectedWebsite.id)
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [selectedWebsite, store.deployments]);

  const resetWizard = useCallback(() => {
    setWizardStep(1);
    setWizardForm(emptyWizardForm());
    setConnectionTested(false);
    setTestingConnection(false);
    setFinishingWizard(false);
  }, []);

  const openWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    resetWizard();
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    window.setTimeout(() => {
      setTestingConnection(false);
      setConnectionTested(true);
      setNotice({
        tone: "success",
        message: "Connection test succeeded. REST API credentials accepted for the selected CMS.",
      });
    }, 900);
  };

  const handleFinishWizard = async () => {
    if (!wizardForm.websiteUrl.trim()) return;
    setFinishingWizard(true);
    setNotice(null);

    const providerCode = wizardForm.cms === "WordPress" ? "cms.wordpress" : "cms.other";
    const name =
      wizardForm.name.trim() ||
      (() => {
        try {
          return new URL(wizardForm.websiteUrl).hostname;
        } catch {
          return wizardForm.websiteUrl;
        }
      })();
    const clientName = wizardForm.clientName.trim() || name;

    const website = addManagedWebsite({
      name,
      cms: wizardForm.cms,
      url: wizardForm.websiteUrl.trim(),
      restApiUrl: wizardForm.restApiUrl.trim() || `${wizardForm.websiteUrl.replace(/\/$/, "")}/wp-json`,
      environment: wizardForm.environment,
      clientName,
      providerCode,
    });

    setSelectedWebsiteId(website.id);
    setActiveTab("Pages");

    try {
      const response = await fetch(`/api/integrations/connections/${encodeURIComponent(providerCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          status: "connected",
          authMethod: wizardForm.cms === "WordPress" ? "application_password" : "api_key",
          displayLabel: name,
          config: {
            websiteUrl: wizardForm.websiteUrl.trim(),
            restApiUrl: wizardForm.restApiUrl.trim(),
            environment: wizardForm.environment,
            cms: wizardForm.cms,
          },
          credentials: {
            username: wizardForm.username.trim(),
            secret: wizardForm.secret,
          },
          notes: "Created from Website Management wizard",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Integration save failed (${response.status})`);
      }

      setNotice({
        tone: "success",
        message:
          "Website connected. Integration Framework record saved — it now appears in Settings → Integrations.",
      });
    } catch (error) {
      setNotice({
        tone: "warning",
        message: `Website added locally, but the Integration Framework record could not be saved (${
          error instanceof Error ? error.message : "schema or provider unavailable"
        }).`,
      });
    } finally {
      setFinishingWizard(false);
      setWizardStep(4);
    }
  };

  const appendDraft = () => {
    if (!selectedWebsite || !storeKind) return;
    const draft: WebsiteContentItem = {
      id: `local-${Date.now()}`,
      websiteId: selectedWebsite.id,
      kind: storeKind,
      title: `New ${activeTab.slice(0, -1)} draft`,
      status: "Draft",
      updatedAt: new Date().toISOString().slice(0, 10),
      author: "You",
    };
    setLocalDrafts((rows) => [draft, ...rows]);
    setActionNotice({
      tone: "info",
      message: `${draft.title} created as a local draft. Publish when content is ready.`,
    });
  };

  const handlePublishToggle = (item: WebsiteContentItem) => {
    const nextStatus = item.status === "Published" ? "Draft" : "Published";
    if (item.id.startsWith("local-")) {
      setLocalDrafts((rows) =>
        rows.map((row) =>
          row.id === item.id
            ? { ...row, status: nextStatus, updatedAt: new Date().toISOString().slice(0, 10) }
            : row,
        ),
      );
    } else {
      updateContentStatus(item.id, nextStatus);
    }
    setActionNotice({
      tone: "success",
      message: `"${item.title}" marked as ${nextStatus.toLowerCase()}.`,
    });
  };

  const handleDelete = (item: WebsiteContentItem) => {
    if (item.id.startsWith("local-")) {
      setLocalDrafts((rows) => rows.filter((row) => row.id !== item.id));
    } else {
      deleteContentItem(item.id);
    }
    setActionNotice({ tone: "info", message: `"${item.title}" removed from ${activeTab.toLowerCase()}.` });
  };

  const handleDeploy = () => {
    if (!selectedWebsite) return;
    const deployment = recordDeployment(
      selectedWebsite.id,
      selectedWebsite.environment,
      `${activeTab} publish via Website Management`,
    );
    setActionNotice({
      tone: "success",
      message: `Deployment recorded (${deployment.status.toLowerCase()}) to ${selectedWebsite.environment}.`,
    });
    setActiveTab("Deployments");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-end gap-4">
        <button type="button" className={WsPrimaryButtonClass()} onClick={openWizard}>
          <Plus className="h-4 w-4" />
          Connect website
        </button>
      </div>

      {notice ? <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} /> : null}
      {actionNotice ? (
        <NoticeBanner notice={actionNotice} onDismiss={() => setActionNotice(null)} />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10">
        <WsKpiTile label="Connected" value={dashboardKpis.connected} hint="Active CMS links" />
        <WsKpiTile
          label="Last deploy"
          value={dashboardKpis.lastDeploy ? formatDateTime(dashboardKpis.lastDeploy) : "—"}
          hint="Most recent release"
        />
        <WsKpiTile label="Pages" value={dashboardKpis.pages} />
        <WsKpiTile label="Posts" value={dashboardKpis.posts} />
        <WsKpiTile label="Media" value={dashboardKpis.media} />
        <WsKpiTile label="Plugin updates" value={dashboardKpis.pluginUpdates} />
        <WsKpiTile label="Theme updates" value={dashboardKpis.themeUpdates} />
        <WsKpiTile label="SSL valid" value={dashboardKpis.sslValid} hint="Certificates OK" />
        <WsKpiTile label="Backups" value={dashboardKpis.backups} />
        <WsKpiTile
          label="Analytics"
          value={dashboardKpis.analytics.toLocaleString()}
          hint="30-day visitors"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <WsSection
          title="Connected websites"
          subtitle="Select a site to manage content, SEO, and deployments."
        >
          <div className="space-y-2">
            {store.websites.map((site) => {
              const selected = site.id === selectedWebsiteId;
              return (
                <div
                  key={site.id}
                  className={cn(
                    "rounded-xl border px-3 py-3 transition-colors",
                    selected
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedWebsiteId(site.id)}
                    >
                      <p className="truncate text-sm font-semibold text-white">{site.name}</p>
                      <p className="truncate text-xs text-white/45">{site.domain}</p>
                    </button>
                    <WsStatusPill className={websiteStatusClass(site.connectionStatus)}>
                      {site.connectionStatus}
                    </WsStatusPill>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
                    <span>{site.cms}</span>
                    <span>·</span>
                    <span>{site.environment}</span>
                    <span>·</span>
                    <span>{site.clientName}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={WsSecondaryButtonClass()}
                      onClick={() => setSelectedWebsiteId(site.id)}
                    >
                      Open
                    </button>
                    <Link
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={WsSecondaryButtonClass()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </WsSection>

        <WsSection
          title={selectedWebsite ? selectedWebsite.name : "Website content"}
          subtitle={
            selectedWebsite
              ? `${selectedWebsite.url} · Last sync ${formatDateTime(selectedWebsite.lastSync)}`
              : "Choose a connected website from the list."
          }
          actions={
            selectedWebsite ? (
              <>
                {storeKind ? (
                  <button type="button" className={WsSecondaryButtonClass()} onClick={appendDraft}>
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </button>
                ) : null}
                <button type="button" className={WsPrimaryButtonClass()} onClick={handleDeploy}>
                  <Rocket className="h-3.5 w-3.5" />
                  Deploy
                </button>
              </>
            ) : null
          }
        >
          {!selectedWebsite ? (
            <WsEmpty message="Select a connected website to manage pages, media, plugins, and deployments." />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {CONTENT_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                      activeTab === tab
                        ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                        : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Deployments" ? (
                websiteDeployments.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/40">
                          <th className="px-2 py-2 font-medium">When</th>
                          <th className="px-2 py-2 font-medium">Environment</th>
                          <th className="px-2 py-2 font-medium">By</th>
                          <th className="px-2 py-2 font-medium">Note</th>
                          <th className="px-2 py-2 font-medium">Status</th>
                          <th className="px-2 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {websiteDeployments.map((row) => (
                          <tr key={row.id} className="border-b border-white/5">
                            <td className="px-2 py-2.5 text-white/75">{formatDateTime(row.at)}</td>
                            <td className="px-2 py-2.5 text-white/75">{row.environment}</td>
                            <td className="px-2 py-2.5 text-white/75">{row.by}</td>
                            <td className="px-2 py-2.5 text-white/75">{row.note}</td>
                            <td className="px-2 py-2.5">
                              <WsStatusPill className={websiteStatusClass(row.status)}>
                                {row.status}
                              </WsStatusPill>
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  className={actionButtonClass("neutral")}
                                  onClick={() =>
                                    setActionNotice({
                                      tone: "info",
                                      message: `Preview opened for deployment ${row.id}.`,
                                    })
                                  }
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  className={actionButtonClass("amber")}
                                  onClick={() =>
                                    setActionNotice({
                                      tone: "info",
                                      message: `Rollback initiated for ${formatDateTime(row.at)} — confirm in change window.`,
                                    })
                                  }
                                >
                                  Rollback
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <WsEmpty message="No deployment history recorded for this website yet." />
                )
              ) : tabRows.storeItems.length || tabRows.demoItems.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/40">
                        <th className="px-2 py-2 font-medium">Title</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Updated</th>
                        <th className="px-2 py-2 font-medium">Author</th>
                        <th className="px-2 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabRows.storeItems.map((item) => (
                        <tr key={item.id} className="border-b border-white/5">
                          <td className="px-2 py-2.5 font-medium text-white">{item.title}</td>
                          <td className="px-2 py-2.5">
                            <WsStatusPill className={websiteStatusClass(item.status)}>
                              {item.status}
                            </WsStatusPill>
                          </td>
                          <td className="px-2 py-2.5 text-white/75">{formatShortDate(item.updatedAt)}</td>
                          <td className="px-2 py-2.5 text-white/75">{item.author}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                className={actionButtonClass("sky")}
                                onClick={() =>
                                  setActionNotice({
                                    tone: "info",
                                    message: `Editor opened for "${item.title}".`,
                                  })
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={actionButtonClass("emerald")}
                                onClick={() => handlePublishToggle(item)}
                              >
                                {item.status === "Published" ? "Unpublish" : "Publish"}
                              </button>
                              <button
                                type="button"
                                className={actionButtonClass("neutral")}
                                onClick={() =>
                                  setActionNotice({
                                    tone: "info",
                                    message: `Live preview opened for "${item.title}".`,
                                  })
                                }
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className={actionButtonClass("rose")}
                                onClick={() => handleDelete(item)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tabRows.demoItems.map((item) => (
                        <tr key={item.id} className="border-b border-white/5">
                          <td className="px-2 py-2.5">
                            <p className="font-medium text-white">{item.title}</p>
                            {item.meta ? <p className="text-xs text-white/40">{item.meta}</p> : null}
                          </td>
                          <td className="px-2 py-2.5">
                            <WsStatusPill className={websiteStatusClass(item.status)}>
                              {item.status}
                            </WsStatusPill>
                          </td>
                          <td className="px-2 py-2.5 text-white/75">{formatShortDate(item.updatedAt)}</td>
                          <td className="px-2 py-2.5 text-white/75">{item.author}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                className={actionButtonClass("sky")}
                                onClick={() =>
                                  setActionNotice({
                                    tone: "info",
                                    message: `Editor opened for "${item.title}".`,
                                  })
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={actionButtonClass("neutral")}
                                onClick={() =>
                                  setActionNotice({
                                    tone: "info",
                                    message: `Preview opened for "${item.title}".`,
                                  })
                                }
                              >
                                Preview
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <WsEmpty message={`No ${activeTab.toLowerCase()} found for this website.`} />
              )}

              {selectedWebsite ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                    <p className={WsLabelClass()}>SSL</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-300" />
                      <WsStatusPill className={websiteStatusClass(selectedWebsite.sslStatus)}>
                        {selectedWebsite.sslStatus}
                      </WsStatusPill>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                    <p className={WsLabelClass()}>Provider</p>
                    <p className="mt-2 text-sm text-white/80">{selectedWebsite.providerCode}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                    <p className={WsLabelClass()}>Last deployment</p>
                    <p className="mt-2 text-sm text-white/80">
                      {formatDateTime(selectedWebsite.lastDeployment)}
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </WsSection>
      </div>

      {wizardOpen ? (
        <WsSlideOver
          title="Connect website"
          subtitle={`Step ${wizardStep} of 4`}
          onClose={closeWizard}
          footer={
            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                className={WsSecondaryButtonClass(wizardStep === 1)}
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((step) => Math.max(1, step - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="flex flex-wrap gap-2">
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    className={WsPrimaryButtonClass()}
                    onClick={() => setWizardStep((step) => Math.min(4, step + 1))}
                  >
                    Continue
                  </button>
                ) : (
                  <button type="button" className={WsPrimaryButtonClass()} onClick={closeWizard}>
                    Done
                  </button>
                )}
              </div>
            </div>
          }
        >
          {wizardStep === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-white/55">
                Choose the CMS platform for this website connection.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {WEBSITE_CMS_TYPES.map((cms) => (
                  <button
                    key={cms}
                    type="button"
                    onClick={() => {
                      setWizardForm((form) => ({ ...form, cms }));
                      setConnectionTested(false);
                    }}
                    className={cn(
                      "rounded-xl border px-4 py-4 text-left transition-colors",
                      wizardForm.cms === cms
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <p className="text-sm font-semibold text-white">{cms}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {cms === "WordPress"
                        ? "REST API with application password authentication."
                        : "Generic REST API with API key authentication."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {wizardStep === 2 ? (
            <div className="space-y-4">
              <Field label="Website name">
                <input
                  className={WsInputClass()}
                  value={wizardForm.name}
                  onChange={(event) =>
                    setWizardForm((form) => ({ ...form, name: event.target.value }))
                  }
                  placeholder="Client marketing site"
                />
              </Field>
              <Field label="Client name">
                <input
                  className={WsInputClass()}
                  value={wizardForm.clientName}
                  onChange={(event) =>
                    setWizardForm((form) => ({ ...form, clientName: event.target.value }))
                  }
                  placeholder="Client organisation"
                />
              </Field>
              <Field label="Website URL">
                <input
                  className={WsInputClass()}
                  value={wizardForm.websiteUrl}
                  onChange={(event) => {
                    setConnectionTested(false);
                    setWizardForm((form) => ({ ...form, websiteUrl: event.target.value }));
                  }}
                  placeholder="https://www.example.com"
                />
              </Field>
              <Field label="REST API URL">
                <input
                  className={WsInputClass()}
                  value={wizardForm.restApiUrl}
                  onChange={(event) => {
                    setConnectionTested(false);
                    setWizardForm((form) => ({ ...form, restApiUrl: event.target.value }));
                  }}
                  placeholder={
                    wizardForm.cms === "WordPress"
                      ? "https://www.example.com/wp-json"
                      : "https://api.example.com/v1"
                  }
                />
              </Field>
              <Field label="Username">
                <input
                  className={WsInputClass()}
                  value={wizardForm.username}
                  onChange={(event) => {
                    setConnectionTested(false);
                    setWizardForm((form) => ({ ...form, username: event.target.value }));
                  }}
                  placeholder="cms-admin"
                />
              </Field>
              <Field
                label={
                  wizardForm.cms === "WordPress" ? "Application password" : "API key"
                }
              >
                <input
                  type="password"
                  className={WsInputClass()}
                  value={wizardForm.secret}
                  onChange={(event) => {
                    setConnectionTested(false);
                    setWizardForm((form) => ({ ...form, secret: event.target.value }));
                  }}
                  placeholder="••••••••••••"
                />
              </Field>
              <button
                type="button"
                className={WsSecondaryButtonClass(testingConnection)}
                disabled={testingConnection}
                onClick={handleTestConnection}
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Test connection
              </button>
              {connectionTested ? (
                <NoticeBanner
                  notice={{
                    tone: "success",
                    message: "Connection test succeeded. Proceed to environment selection.",
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {wizardStep === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-white/55">
                Select the primary environment for deployments and content sync.
              </p>
              <div className="grid gap-3">
                {WEBSITE_ENVIRONMENTS.map((environment) => (
                  <button
                    key={environment}
                    type="button"
                    onClick={() => setWizardForm((form) => ({ ...form, environment }))}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      wizardForm.environment === environment
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <p className="text-sm font-semibold text-white">{environment}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {environment === "Production"
                        ? "Live public website."
                        : environment === "Staging"
                          ? "Pre-release validation environment."
                          : "Developer sandbox."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {wizardStep === 4 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className={WsLabelClass()}>Summary</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/45">CMS</dt>
                    <dd className="text-white/85">{wizardForm.cms}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/45">URL</dt>
                    <dd className="truncate text-white/85">{wizardForm.websiteUrl || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/45">Environment</dt>
                    <dd className="text-white/85">{wizardForm.environment}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/45">Integration</dt>
                    <dd className="text-white/85">
                      {wizardForm.cms === "WordPress" ? "cms.wordpress" : "cms.other"}
                    </dd>
                  </div>
                </dl>
              </div>
              {!finishingWizard && !notice ? (
                <button
                  type="button"
                  className={WsPrimaryButtonClass()}
                  onClick={() => void handleFinishWizard()}
                >
                  <Plus className="h-4 w-4" />
                  Finish and connect
                </button>
              ) : null}
              {finishingWizard ? (
                <div className="flex items-center gap-2 text-sm text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving website and integration record…
                </div>
              ) : null}
            </div>
          ) : null}
        </WsSlideOver>
      ) : null}
    </div>
  );
}
