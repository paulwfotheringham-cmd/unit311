"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";

import {
  CLIENT_ONBOARDING_STAGE_ORDER,
  CLIENT_ONBOARDING_STAGES,
  formatOnboardingDate,
  getOnboardingStageLabel,
  getStageCompletion,
  type ClientOnboardingAdvanceAction,
  type ClientOnboardingRecord,
  type ClientOnboardingStageDefinition,
} from "@/lib/client-onboarding-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, FileText, Loader2, Search, Trash2 } from "lucide-react";

type QuestionnaireSummary = {
  organisationName: string | null;
  logoPath: string | null;
  completedAt: string | null;
  moduleSelectionMode: "all" | "choose";
  selectedModuleLabels: string[];
  importClientsCsv: boolean;
};

type PaymentReceipt = {
  url: string;
  name: string;
};

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      throw new Error(
        response.ok
          ? "Invalid server response."
          : `Request failed (${response.status}). The onboarding API is unavailable.`,
      );
    }
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5";
}

function statusBadgeClass(status: ClientOnboardingRecord["currentStatus"]) {
  return status === "Platform Live"
    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
    : "border-sky-400/30 bg-sky-500/15 text-sky-200";
}

function stageBadgeClass(stage: ClientOnboardingRecord["currentStage"]) {
  if (stage === "platform_live") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }
  return "border-white/15 bg-white/5 text-white/75";
}

function canShowStageAction(
  record: ClientOnboardingRecord,
  definition: ClientOnboardingStageDefinition,
) {
  if (!definition.action || definition.automatic) {
    return false;
  }

  const stageIndex = CLIENT_ONBOARDING_STAGE_ORDER.indexOf(definition.stage);
  if (stageIndex <= 0) {
    return false;
  }

  const previousStage = CLIENT_ONBOARDING_STAGE_ORDER[stageIndex - 1]!;
  return record.currentStage === previousStage;
}

function isCloneReady(record: ClientOnboardingRecord) {
  return Boolean(record.platformCloneCompleteAt);
}

export default function ClientOnboardingWorkspace() {
  const [records, setRecords] = useState<ClientOnboardingRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<ClientOnboardingAdvanceAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "platform_live">("all");
  const [questionnaireSummary, setQuestionnaireSummary] = useState<QuestionnaireSummary | null>(
    null,
  );
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);
  const [loadingPaymentReceipt, setLoadingPaymentReceipt] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter === "in_progress" && record.currentStatus !== "In Progress") return false;
      if (statusFilter === "platform_live" && record.currentStatus !== "Platform Live") return false;
      if (!query) return true;

      return (
        record.companyName.toLowerCase().includes(query) ||
        record.contactName.toLowerCase().includes(query) ||
        record.contactEmail.toLowerCase().includes(query)
      );
    });
  }, [records, search, statusFilter]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/client-onboarding?status=all", { cache: "no-store" });
      const data = await readApiJson<{ records?: ClientOnboardingRecord[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load onboarding records.");
      }
      setRecords(data.records ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load onboarding records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadRecords();
    });
  }, [loadRecords]);

  const loadQuestionnaire = useCallback(async (recordId: string) => {
    setLoadingQuestionnaire(true);
    setError(null);
    try {
      const response = await fetch(`/api/client-onboarding/${recordId}/questionnaire`, {
        cache: "no-store",
      });
      const data = await readApiJson<{ summary?: QuestionnaireSummary; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load questionnaire details.");
      }
      setQuestionnaireSummary(data.summary ?? null);
    } catch (loadError) {
      setQuestionnaireSummary(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load questionnaire details.",
      );
    } finally {
      setLoadingQuestionnaire(false);
    }
  }, []);

  const loadPaymentReceipt = useCallback(async (recordId: string) => {
    setLoadingPaymentReceipt(true);
    try {
      const response = await fetch(`/api/client-onboarding/${recordId}/payment-receipt`, {
        cache: "no-store",
      });
      const data = await readApiJson<{ receipt?: PaymentReceipt; error?: string }>(response);
      if (!response.ok) {
        setPaymentReceipt(null);
        return;
      }
      setPaymentReceipt(data.receipt ?? null);
    } catch {
      setPaymentReceipt(null);
    } finally {
      setLoadingPaymentReceipt(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      setQuestionnaireSummary(null);
      setPaymentReceipt(null);
      if (selectedRecord?.questionnaireCompleteAt) {
        void loadQuestionnaire(selectedRecord.id);
      }
      if (selectedRecord) {
        void loadPaymentReceipt(selectedRecord.id);
      }
    });
  }, [
    selectedRecord?.id,
    selectedRecord?.questionnaireCompleteAt,
    loadQuestionnaire,
    loadPaymentReceipt,
  ]);

  const handleAdvance = useCallback(
    async (recordId: string, action: ClientOnboardingAdvanceAction) => {
      setBusyAction(action);
      setError(null);

      try {
        const response = await fetch(`/api/client-onboarding/${recordId}/advance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await readApiJson<{ record?: ClientOnboardingRecord; error?: string }>(response);
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to advance onboarding stage.");
        }

        if (data.record) {
          setRecords((current) =>
            current.map((record) => (record.id === data.record!.id ? data.record! : record)),
          );
        }
      } catch (advanceError) {
        setError(
          advanceError instanceof Error ? advanceError.message : "Failed to advance onboarding stage.",
        );
      } finally {
        setBusyAction(null);
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (record: ClientOnboardingRecord) => {
      if (
        !window.confirm(
          `Delete onboarding record for "${record.companyName}"? This cannot be undone.`,
        )
      ) {
        return;
      }

      setDeletingRecordId(record.id);
      setError(null);

      try {
        const response = await fetch(`/api/client-onboarding/${record.id}`, {
          method: "DELETE",
        });
        const data = await readApiJson<{ ok?: boolean; error?: string }>(response);
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to delete onboarding record.");
        }

        setRecords((current) => current.filter((item) => item.id !== record.id));
        if (selectedRecordId === record.id) {
          setSelectedRecordId(null);
        }
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : "Failed to delete onboarding record.",
        );
      } finally {
        setDeletingRecordId(null);
      }
    },
    [selectedRecordId],
  );

  if (selectedRecord) {
    const cloneReady = isCloneReady(selectedRecord);
    const progressTone = cloneReady ? "from-emerald-400 to-emerald-500" : "from-sky-400 to-sky-500";

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedRecordId(null)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <section className={panelClassName()}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">{selectedRecord.companyName}</h2>
              <p className="mt-1 text-sm text-white/60">
                {selectedRecord.contactName} · {selectedRecord.contactEmail}
              </p>
              <p className="mt-1 text-xs text-white/45">
                Signed up {formatOnboardingDate(selectedRecord.signupDate)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  statusBadgeClass(selectedRecord.currentStatus),
                )}
              >
                {selectedRecord.currentStatus}
              </span>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  cloneReady
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                    : "border-white/15 bg-white/5 text-white/70",
                )}
              >
                {selectedRecord.progressPercent}% complete
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all", progressTone)}
                style={{ width: `${selectedRecord.progressPercent}%` }}
              />
            </div>
            {cloneReady ? (
              <p className="mt-2 text-xs font-medium text-emerald-300">Platform clone ready for review</p>
            ) : null}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className={panelClassName()}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/55">
            Onboarding stages
          </h3>

          <div className="mt-5 space-y-4">
            {CLIENT_ONBOARDING_STAGES.map((definition, index) => {
              const completion = getStageCompletion(selectedRecord, definition.stage);
              const isCompleted = Boolean(completion.completedAt);
              const isCurrent = selectedRecord.currentStage === definition.stage;
              const showAction = canShowStageAction(selectedRecord, definition);
              const awaitingQuestionnaire =
                definition.stage === "questionnaire_complete" &&
                !isCompleted &&
                selectedRecord.currentStage === "payment_received";
              const cloneStageReady =
                definition.stage === "platform_clone_complete" && isCompleted;

              return (
                <div key={definition.stage} className="relative flex gap-4">
                  {index < CLIENT_ONBOARDING_STAGES.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-[11px] top-7 h-[calc(100%+0.5rem)] w-px",
                        isCompleted ? "bg-emerald-400/50" : "bg-white/15",
                      )}
                    />
                  )}

                  <div className="relative z-10 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <Circle
                        className={cn(
                          "h-6 w-6",
                          isCurrent ? "text-sky-300" : "text-white/30",
                        )}
                      />
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex-1 rounded-xl border px-4 py-3",
                      cloneStageReady
                        ? "border-emerald-400/35 bg-emerald-500/15"
                        : isCompleted
                          ? "border-emerald-400/25 bg-emerald-500/10"
                          : isCurrent
                            ? "border-sky-400/25 bg-sky-500/10"
                            : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{definition.label}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        {showAction && definition.action && definition.buttonLabel ? (
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleAdvance(selectedRecord.id, definition.action!)}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyAction === definition.action ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {definition.buttonLabel}
                          </button>
                        ) : null}

                        {definition.stage === "payment_received" && paymentReceipt ? (
                          <a
                            href={paymentReceipt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/20"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View transfer receipt
                          </a>
                        ) : null}

                        {definition.stage === "payment_received" && loadingPaymentReceipt ? (
                          <span className="inline-flex items-center gap-2 text-xs text-white/45">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading receipt…
                          </span>
                        ) : null}

                        {definition.stage === "questionnaire_complete" && isCompleted ? (
                          <button
                            type="button"
                            disabled={loadingQuestionnaire}
                            onClick={() => void loadQuestionnaire(selectedRecord.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingQuestionnaire ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            View setup details
                          </button>
                        ) : null}

                        {definition.stage === "platform_clone_complete" &&
                        selectedRecord.questionnaireCompleteAt &&
                        !questionnaireSummary ? (
                          <button
                            type="button"
                            disabled={loadingQuestionnaire}
                            onClick={() => void loadQuestionnaire(selectedRecord.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingQuestionnaire ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            Load setup details
                          </button>
                        ) : null}

                        {awaitingQuestionnaire ? (
                          <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-200">
                            Awaiting client
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                              cloneStageReady
                                ? "border-emerald-400/40 text-emerald-200"
                                : isCompleted
                                  ? "border-emerald-400/30 text-emerald-200"
                                  : definition.automatic
                                    ? "border-white/15 text-white/45"
                                    : "border-white/15 text-white/45",
                            )}
                          >
                            {cloneStageReady
                              ? "Ready"
                              : isCompleted
                                ? "Completed"
                                : definition.automatic
                                  ? "Automatic"
                                  : "Pending"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1 text-xs text-white/55 sm:grid-cols-2">
                      <p>
                        Date completed:{" "}
                        <span className="text-white/80">
                          {formatOnboardingDate(completion.completedAt)}
                        </span>
                      </p>
                      <p>
                        Completed by:{" "}
                        <span className="text-white/80">{completion.completedBy ?? "—"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {questionnaireSummary ? (
          <section className={panelClassName()}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/55">
              Client setup responses
            </h3>
            <div className="mt-4 space-y-4 text-sm text-white/75">
              <p>
                <span className="text-white/50">Organisation:</span>{" "}
                {questionnaireSummary.organisationName ?? selectedRecord.companyName}
              </p>
              <p>
                <span className="text-white/50">Modules:</span>{" "}
                {questionnaireSummary.moduleSelectionMode === "all"
                  ? "All modules"
                  : "Selected modules"}
              </p>
              {questionnaireSummary.selectedModuleLabels.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-white/70">
                  {questionnaireSummary.selectedModuleLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : null}
              <p>
                <span className="text-white/50">Import clients from CSV:</span>{" "}
                {questionnaireSummary.importClientsCsv ? "Yes" : "No"}
              </p>
              {questionnaireSummary.logoPath ? (
                <p>
                  <span className="text-white/50">Logo uploaded:</span>{" "}
                  <a
                    href={questionnaireSummary.logoPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 hover:underline"
                  >
                    View logo
                  </a>
                </p>
              ) : (
                <p>
                  <span className="text-white/50">Logo uploaded:</span> No
                </p>
              )}
              <p>
                <span className="text-white/50">Submitted:</span>{" "}
                {formatOnboardingDate(questionnaireSummary.completedAt)}
              </p>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className={panelClassName()}>
        <div className="flex flex-wrap items-end justify-end gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "in_progress" | "platform_live")
              }
              className="rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
            >
              <option value="all">All statuses</option>
              <option value="in_progress">In progress</option>
              <option value="platform_live">Platform live</option>
            </select>

            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, contact, email…"
                className="w-full rounded-xl border border-white/10 bg-[#0b1524] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-sky-400/50"
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <section className={panelClassName()}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading onboarding records…
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/55">
            No onboarding records match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/45">
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Signup date</th>
                  <th className="px-3 py-2 font-medium">Stage</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <td className="px-3 py-3 font-medium text-white">{record.companyName}</td>
                    <td className="px-3 py-3 text-white/75">{record.contactName}</td>
                    <td className="px-3 py-3 text-white/75">{record.contactEmail}</td>
                    <td className="px-3 py-3 text-white/65">
                      {formatOnboardingDate(record.signupDate)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs",
                          stageBadgeClass(record.currentStage),
                        )}
                      >
                        {getOnboardingStageLabel(record.currentStage)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/75">{record.progressPercent}%</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs",
                          statusBadgeClass(record.currentStatus),
                        )}
                      >
                        {record.currentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Delete ${record.companyName}`}
                        disabled={deletingRecordId === record.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(record);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingRecordId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
