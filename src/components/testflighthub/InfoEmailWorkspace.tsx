"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  formatEmailDate,
  formatEmailDateLong,
  threadStatusClass,
  threadStatusLabel,
  type InfoEmailThreadStatus,
} from "@/lib/info-email-data";
import type { EmailAccount, EmailAccountId, EmailMessage } from "@/lib/email/types";
import { groupMessagesIntoThreads, type EmailThread } from "@/lib/email/threading";
import { createInitialUsers } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import { ChevronDown, Inbox, Loader2, Mail, MessageCircle, Paperclip, PenSquare, RefreshCw, Reply, Send, X } from "lucide-react";

const operators = createInitialUsers();
const REFRESH_INTERVAL_MS = 30_000;

const DEFAULT_MAILBOXES: EmailAccountOption[] = [
  { id: "info", email: "info@dronecatalyst.com", name: "Shared Inbox", configured: false },
  { id: "paul", email: "paul@dronecatalyst.com", name: "Paul", configured: false },
];

type EmailAccountOption = EmailAccount & { configured?: boolean };

type WhatsAppStatus = {
  configured: boolean;
  enabled: boolean;
  phone: string;
  lastNotifiedAt: string | null;
};

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function inputClassName() {
  return "w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50";
}

function attachmentUrl(account: EmailAccountId, messageId: string, partId: string) {
  const params = new URLSearchParams({ account, messageId, partId });
  return `/api/email/attachments?${params.toString()}`;
}

function MessageBody({ message }: { message: EmailMessage }) {
  if (message.html) {
    return (
      <div
        className="prose prose-invert mt-3 max-w-none text-sm leading-relaxed text-white/80 prose-a:text-sky-300 prose-p:my-2"
        dangerouslySetInnerHTML={{ __html: message.html }}
      />
    );
  }

  return (
    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
      {message.body || message.snippet}
    </p>
  );
}

export default function InfoEmailWorkspace() {
  const [accounts, setAccounts] = useState<EmailAccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<EmailAccountId>("info");
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAsUserId, setReplyAsUserId] = useState(operators[0]?.id ?? "");
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [threads, selectedThreadId],
  );

  const replyAsUser = operators.find((operator) => operator.id === replyAsUserId);

  const selectedAccountConfigured = selectedAccount?.configured ?? false;

  const loadWhatsAppStatus = useCallback(async () => {
    if (selectedAccountId !== "info") {
      setWhatsappStatus(null);
      return;
    }

    try {
      const response = await fetch("/api/email/notifications/whatsapp", { cache: "no-store" });
      const data = await readApiJson<WhatsAppStatus>(response);
      if (!response.ok) throw new Error("Failed to load WhatsApp status");
      setWhatsappStatus(data);
    } catch {
      setWhatsappStatus(null);
    }
  }, [selectedAccountId]);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const [accountsResponse, statusResponse] = await Promise.all([
        fetch("/api/email/accounts", { cache: "no-store" }),
        fetch("/api/email/credentials", { cache: "no-store" }),
      ]);

      const data = await readApiJson<EmailAccountOption[]>(accountsResponse);
      if (!accountsResponse.ok) throw new Error("Failed to load mailboxes");

      const status = statusResponse.ok
        ? await readApiJson<{ info?: boolean; paul?: boolean }>(statusResponse)
        : null;

      const merged = data.map((account) => ({
        ...account,
        configured:
          account.configured ||
          (account.id === "info" ? Boolean(status?.info) : Boolean(status?.paul)),
      }));

      setAccounts(merged);
      if (merged.length > 0 && !merged.some((account) => account.id === selectedAccountId)) {
        setSelectedAccountId(merged[0].id);
      }
    } catch (loadError) {
      setAccounts(DEFAULT_MAILBOXES);
      setError(loadError instanceof Error ? loadError.message : "Failed to load mailboxes");
    } finally {
      setAccountsLoading(false);
    }
  }, [selectedAccountId]);

  const loadInbox = useCallback(
    async (options?: { background?: boolean }) => {
      if (accountsLoading) return;

      if (!selectedAccountConfigured && !options?.background) {
        setLoading(false);
        setThreads([]);
        setSelectedThreadId(null);
        return;
      }

      const background = options?.background ?? false;
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/email/messages?account=${encodeURIComponent(selectedAccountId)}`,
          { cache: "no-store" },
        );
        const data = await readApiJson<EmailMessage[] | { error?: string; code?: string }>(
          response,
        );

        if (!response.ok) {
          const message =
            "error" in data && data.error
              ? data.error
              : "Failed to load inbox";
          throw new Error(message);
        }

        const messages = data as EmailMessage[];
        const nextThreads = groupMessagesIntoThreads(messages);
        setThreads(nextThreads);
        setSelectedThreadId((current) => {
          if (current && nextThreads.some((thread) => thread.id === current)) return current;
          return nextThreads[0]?.id ?? null;
        });
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load inbox";
        setError(message);
        if (!background) {
          setThreads([]);
          setSelectedThreadId(null);
        }
      } finally {
        if (background) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [accountsLoading, selectedAccountId, selectedAccountConfigured],
  );

  useEffect(() => {
    void loadWhatsAppStatus();
  }, [loadWhatsAppStatus]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadInbox({ background: true });
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [loadInbox]);

  useEffect(() => {
    setSelectedThreadId(null);
    setReplyBody("");
    closeDetail();
  }, [selectedAccountId, closeDetail]);

  useEffect(() => {
    setSetupPassword("");
    setComposeOpen(false);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setSuccessMessage(null);
  }, [selectedAccountId]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function saveMailboxCredentials() {
    if (!setupPassword.trim() || savingCredentials) return;

    setSavingCredentials(true);
    setError(null);

    try {
      const response = await fetch("/api/email/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: selectedAccountId,
          password: setupPassword.trim(),
        }),
      });
      const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to save credentials");

      setSetupPassword("");
      await loadAccounts();
      await loadInbox();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save credentials");
    } finally {
      setSavingCredentials(false);
    }
  }

  async function toggleWhatsAppAlerts() {
    if (selectedAccountId !== "info" || whatsappLoading) return;

    setWhatsappLoading(true);
    setError(null);

    try {
      const nextEnabled = !(whatsappStatus?.enabled ?? false);
      const response = await fetch("/api/email/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextEnabled ? "enable" : "disable" }),
      });
      const data = await readApiJson<WhatsAppStatus & { ok?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to update WhatsApp alerts");
      setWhatsappStatus(data);
      if (nextEnabled) {
        setSuccessMessage("WhatsApp alerts enabled for new info@ emails");
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update WhatsApp alerts");
    } finally {
      setWhatsappLoading(false);
    }
  }

  async function sendWhatsAppTestAlert() {
    if (selectedAccountId !== "info" || whatsappLoading || !whatsappStatus?.configured) return;

    setWhatsappLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/email/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await readApiJson<{ ok?: boolean; error?: string; response?: string }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error ?? "WhatsApp test failed");
      setSuccessMessage("Test WhatsApp alert sent to +34 657 106 176");
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "WhatsApp test failed");
    } finally {
      setWhatsappLoading(false);
    }
  }

  async function sendReply() {
    if (!selectedThread || !replyBody.trim() || !replyAsUser) return;

    const replyTarget =
      [...selectedThread.messages].reverse().find((message) => message.direction === "inbound") ??
      selectedThread.messages[selectedThread.messages.length - 1];

    if (!replyTarget) return;

    const replyTo =
      replyTarget.direction === "inbound"
        ? replyTarget.fromEmail || replyTarget.from
        : selectedThread.fromEmail;

    if (!replyTo) {
      setError("Cannot determine reply recipient for this thread.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccessMessage(null);

    const signature = `\n\n— ${replyAsUser.fullName}\nUnit311`;
    const html = `<p>${replyBody.trim().replace(/\n/g, "<br/>")}</p><p>${signature.replace(/\n/g, "<br/>")}</p>`;

    try {
      const response = await fetch("/api/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: selectedAccountId,
          messageId: replyTarget.id,
          html,
          text: `${replyBody.trim()}${signature}`,
          context: {
            to: replyTo,
            subject: selectedThread.subject,
            messageId: replyTarget.messageId,
            references: replyTarget.references,
          },
        }),
      });

      const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to send reply");

      setReplyBody("");
      setSuccessMessage(`Reply sent from ${mailboxEmail}`);
      await loadInbox({ background: true });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  function openCompose() {
    setComposeOpen(true);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setError(null);
    setSuccessMessage(null);
  }

  async function sendNewEmail() {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim() || !replyAsUser) return;

    setSending(true);
    setError(null);
    setSuccessMessage(null);

    const signature = `\n\n— ${replyAsUser.fullName}\nUnit311`;
    const html = `<p>${composeBody.trim().replace(/\n/g, "<br/>")}</p><p>${signature.replace(/\n/g, "<br/>")}</p>`;

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: selectedAccountId,
          to: composeTo.trim(),
          cc: composeCc.trim() || undefined,
          subject: composeSubject.trim(),
          html,
          text: `${composeBody.trim()}${signature}`,
        }),
      });

      const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to send email");

      setComposeOpen(false);
      setComposeTo("");
      setComposeCc("");
      setComposeSubject("");
      setComposeBody("");
      setSuccessMessage(`Email sent from ${mailboxEmail}`);
      await loadInbox({ background: true });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const mailboxEmail = selectedAccount?.email ?? "Loading…";
  const mailboxName = selectedAccount?.name ?? "Mailbox";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0a1422]/80 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
              <Inbox className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Mailbox
              </label>
              <div className="relative mt-1">
                <select
                  value={selectedAccountId}
                  onChange={(event) =>
                    setSelectedAccountId(event.target.value as EmailAccountId)
                  }
                  disabled={loading && accounts.length === 0}
                  className={cn(
                    inputClassName(),
                    "min-w-[16rem] appearance-none pr-9 font-medium",
                  )}
                >
                  {accounts.length === 0 ? (
                    <>
                      <option value="info">info@dronecatalyst.com</option>
                      <option value="paul">paul@dronecatalyst.com</option>
                    </>
                  ) : (
                    accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.email}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              </div>
              <p className="mt-1 text-xs text-white/45">
                {mailboxName} · shared Drone Catalyst mailbox · Zoho Mail · visible to all operators
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedAccountId === "info" && (
              <>
                <button
                  type="button"
                  onClick={() => void toggleWhatsAppAlerts()}
                  disabled={whatsappLoading || !whatsappStatus?.configured}
                  title={
                    whatsappStatus?.configured
                      ? whatsappStatus.enabled
                        ? `WhatsApp alerts on · ${whatsappStatus.phone}`
                        : "WhatsApp alerts off"
                      : "Set CALLMEBOT_API_KEY on Vercel to enable WhatsApp alerts"
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-60",
                    whatsappStatus?.enabled
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                      : "border-white/10 text-white/70 hover:bg-white/[0.04]",
                  )}
                >
                  {whatsappLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5" />
                  )}
                  WhatsApp
                  {whatsappStatus?.enabled && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  )}
                </button>
                {whatsappStatus?.configured && (
                  <button
                    type="button"
                    onClick={() => void sendWhatsAppTestAlert()}
                    disabled={whatsappLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.04] disabled:opacity-60"
                  >
                    Test alert
                  </button>
                )}
              </>
            )}
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing…
              </span>
            )}
            <button
              type="button"
              onClick={openCompose}
              disabled={!selectedAccountConfigured || sending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/15 disabled:opacity-60"
            >
              <PenSquare className="h-3.5 w-3.5" />
              New email
            </button>
            <button
              type="button"
              onClick={() => void loadInbox()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.04] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <p className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-100">
        Uses the same Zoho credentials as Drone Catalyst production.
      </p>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {successMessage}
        </p>
      )}

      {composeOpen && selectedAccountConfigured && (
        <section className="rounded-2xl border border-sky-400/25 bg-sky-500/5 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">New email from {mailboxEmail}</h3>
              <p className="mt-0.5 text-xs text-white/50">
                Compose and send without opening a thread first.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComposeOpen(false)}
              className="rounded-lg border border-white/10 p-1.5 text-white/60 transition-colors hover:bg-white/[0.04]"
              aria-label="Close compose"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                To
              </label>
              <input
                type="email"
                value={composeTo}
                onChange={(event) => setComposeTo(event.target.value)}
                placeholder="recipient@example.com"
                className={cn(inputClassName(), "mt-1.5")}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                CC (optional)
              </label>
              <input
                type="text"
                value={composeCc}
                onChange={(event) => setComposeCc(event.target.value)}
                placeholder="cc@example.com"
                className={cn(inputClassName(), "mt-1.5")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Subject
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                placeholder="Subject line"
                className={cn(inputClassName(), "mt-1.5")}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Send as
              </label>
              <select
                value={replyAsUserId}
                onChange={(event) => setReplyAsUserId(event.target.value)}
                className={cn(inputClassName(), "mt-1.5")}
              >
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Message
              </label>
              <textarea
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
                rows={5}
                placeholder="Write your message…"
                className={cn(inputClassName(), "mt-1.5 resize-y")}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={
              sending || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()
            }
            onClick={() => void sendNewEmail()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send email
          </button>
        </section>
      )}

      {accountsLoading && (
        <section className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking mailbox configuration…
        </section>
      )}

      {!accountsLoading && !selectedAccountConfigured && (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-4 sm:px-5">
          <h3 className="text-sm font-semibold text-amber-100">Connect {mailboxEmail}</h3>
          <p className="mt-1 text-sm text-amber-100/80">
            Enter the Zoho app-specific password for {mailboxEmail}. Credentials are stored on
            the server (Supabase when available, otherwise secure session memory) and never sent
            back to the browser.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-amber-100/70">
                Zoho app password
              </label>
              <input
                type="password"
                value={setupPassword}
                onChange={(event) => setSetupPassword(event.target.value)}
                placeholder="Paste app-specific password"
                className={cn(inputClassName(), "mt-1.5 border-amber-400/20")}
              />
            </div>
            <button
              type="button"
              disabled={savingCredentials || !setupPassword.trim()}
              onClick={() => void saveMailboxCredentials()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-[#0a1422] transition-colors hover:bg-amber-400 disabled:opacity-60"
            >
              {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save & connect
            </button>
          </div>
        </section>
      )}

      <ResponsiveMasterDetail
        showDetail={showDetail && !!selectedThread}
        onBack={closeDetail}
        backLabel="Back to inbox"
        columnsClassName="xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
        className="min-h-[32rem]"
        master={
          <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0a1422]/80">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                Inbox
              </p>
              <p className="mt-0.5 text-sm text-white/70">
                {loading ? "Loading…" : `${threads.length} threads`}
              </p>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center py-12 text-white/50">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <p className="px-4 py-8 text-sm text-white/45">No messages yet.</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {threads.map((thread) => {
                  const active = selectedThread?.id === thread.id;
                  const preview =
                    thread.messages[thread.messages.length - 1]?.snippet ??
                    thread.messages[thread.messages.length - 1]?.body ??
                    "";
                  const status = thread.status as InfoEmailThreadStatus;

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        openDetail();
                      }}
                      className={cn(
                        "w-full border-b border-white/5 px-4 py-3 text-left transition-colors",
                        active ? "bg-sky-500/10" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-white">
                          {thread.fromName}
                        </p>
                        <span className="shrink-0 text-[11px] text-white/40">
                          {formatEmailDate(thread.lastActivityAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs font-medium text-white/70">
                        {thread.subject}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-white/45">{preview}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 text-[10px]",
                            threadStatusClass(status),
                          )}
                        >
                          {threadStatusLabel(status)}
                        </span>
                        {thread.replyCount > 0 && (
                          <span className="text-[10px] text-white/40">
                            {thread.replyCount} team{" "}
                            {thread.replyCount === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        }
        detail={
          <section className="flex min-h-[24rem] min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0a1422]/80 xl:min-h-0">
            {!selectedThread ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-white/45">
                <Mail className="h-8 w-8 text-white/25" />
                <p className="text-sm">Select a thread to read the conversation.</p>
              </div>
            ) : (
              <>
                <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                  <h3 className="text-lg font-semibold text-white">{selectedThread.subject}</h3>
                  <p className="mt-1 text-sm text-white/50">
                    From {selectedThread.fromName} &lt;{selectedThread.fromEmail}&gt;
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">
                    Received {formatEmailDateLong(selectedThread.receivedAt)}
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                  {selectedThread.messages.map((message) => {
                    const isOutbound = message.direction === "outbound";

                    return (
                      <article
                        key={message.id}
                        className={cn(
                          "rounded-xl border px-4 py-3",
                          isOutbound
                            ? "border-sky-400/20 bg-sky-500/5"
                            : "border-white/10 bg-[#0b1524]/70",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {message.fromName}
                              {isOutbound && (
                                <span className="ml-2 text-xs font-normal text-sky-300">
                                  team reply
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-white/45">
                              {isOutbound ? mailboxEmail : message.fromEmail}
                            </p>
                          </div>
                          <time className="text-xs text-white/40" dateTime={message.date}>
                            {formatEmailDateLong(message.date)}
                          </time>
                        </div>
                        <MessageBody message={message} />
                        {message.attachments.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {message.attachments.map((attachment) => (
                              <li key={`${message.id}-${attachment.partId}`}>
                                <a
                                  href={attachmentUrl(
                                    selectedAccountId,
                                    message.id,
                                    attachment.partId,
                                  )}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-sky-300 transition-colors hover:bg-white/[0.06]"
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {attachment.filename}
                                  {attachment.size > 0 && (
                                    <span className="text-white/40">
                                      ({Math.max(1, Math.round(attachment.size / 1024))} KB)
                                    </span>
                                  )}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 px-4 py-4 sm:px-5">
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/60">
                    <Reply className="h-4 w-4" />
                    Reply from {mailboxEmail}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                        Reply as
                      </label>
                      <select
                        value={replyAsUserId}
                        onChange={(event) => setReplyAsUserId(event.target.value)}
                        className={cn(inputClassName(), "mt-1.5")}
                      >
                        {operators.map((operator) => (
                          <option key={operator.id} value={operator.id}>
                            {operator.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                        Message
                      </label>
                      <textarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        rows={4}
                        placeholder="Write a reply visible to the whole team…"
                        className={cn(inputClassName(), "mt-1.5 resize-y")}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={sending || !replyBody.trim()}
                    onClick={() => void sendReply()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-60"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send reply
                  </button>
                </div>
              </>
            )}
          </section>
        }
      />
    </div>
  );
}
