"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileType,
  Loader2,
  Pencil,
  Plus,
  Presentation,
  Save,
  Trash2,
} from "lucide-react";

import type { CrmLead } from "@/lib/crm-data";

import {
  DISCOVERY_QUESTION_SECTIONS,
  DISCOVERY_QUESTION_TEMPLATES,
  createEmptyDiscoveryQuestionnaire,
  discoveryQuestionTextareaRows,
  normalizeDiscoveryQuestionnaire,
  type DiscoveryCustomQuestionRow,
  type DiscoveryQuestionnaireData,
  type DiscoveryQuestionRowSize,
} from "@/lib/discovery-questions-data";
import { cn } from "@/lib/utils";

type CrmLeadQuestionsPanelProps = {
  leadId: string;
  companyName: string;
  lead?: CrmLead | null;
  onBack?: () => void;
  busy?: boolean;
  onLeadUpdated?: (lead: CrmLead) => void;
  onReviewPowerPoint?: () => void | Promise<void>;
  onGeneratePdf?: () => void | Promise<void>;
  showReviewPowerPoint?: boolean;
  showGeneratePdf?: boolean;
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function textareaClassName(rows: number) {
  return cn(
    "mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50",
    rows === 1 ? "min-h-[42px]" : rows === 2 ? "min-h-[72px]" : "min-h-[120px]",
  );
}

function createCustomRow(section: string): DiscoveryCustomQuestionRow {
  return {
    id: `custom-${crypto.randomUUID()}`,
    section,
    label: "Custom question",
    rows: 2,
    answer: "",
  };
}

export default function CrmLeadQuestionsPanel({
  leadId,
  companyName,
  lead = null,
  onBack,
  busy = false,
  onLeadUpdated,
  onReviewPowerPoint,
  onGeneratePdf,
  showReviewPowerPoint = false,
  showGeneratePdf = false,
}: CrmLeadQuestionsPanelProps) {
  const [questionnaire, setQuestionnaire] = useState<DiscoveryQuestionnaireData>(
    createEmptyDiscoveryQuestionnaire(),
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPpt, setGeneratingPpt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

  const loadQuestionnaire = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/leads/${leadId}/discovery-questions`, {
        cache: "no-store",
      });
      const data = await readApiJson<{ questionnaire?: DiscoveryQuestionnaireData; error?: string }>(
        response,
      );
      if (!response.ok) throw new Error(data.error ?? "Failed to load discovery questions");

      const normalized = normalizeDiscoveryQuestionnaire(data.questionnaire);
      setQuestionnaire(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
      setEditingCustomId(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load discovery questions",
      );
      const empty = createEmptyDiscoveryQuestionnaire();
      setQuestionnaire(empty);
      setSavedSnapshot(JSON.stringify(empty));
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadQuestionnaire();
  }, [loadQuestionnaire]);

  const isDirty = useMemo(
    () => JSON.stringify(questionnaire) !== savedSnapshot,
    [questionnaire, savedSnapshot],
  );

  const hasAnswers = useMemo(() => {
    const templateFilled = Object.values(questionnaire.answers).some((value) => value.trim());
    const customFilled = questionnaire.customRows.some((row) => row.answer.trim());
    return templateFilled || customFilled;
  }, [questionnaire]);

  const needsPowerPoint = Boolean(
    lead && hasAnswers && !lead.clientReportPptFileId && !lead.clientReportSentAt,
  );

  const canSaveQuestions = isDirty || needsPowerPoint;

  function patchAnswer(questionId: string, answer: string) {
    setQuestionnaire((current) => ({
      ...current,
      answers: { ...current.answers, [questionId]: answer },
    }));
    setSaveMessage(null);
  }

  function patchCustomRow(rowId: string, patch: Partial<DiscoveryCustomQuestionRow>) {
    setQuestionnaire((current) => ({
      ...current,
      customRows: current.customRows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    }));
    setSaveMessage(null);
  }

  function addCustomRow(section: string) {
    const row = createCustomRow(section);
    setQuestionnaire((current) => ({
      ...current,
      customRows: [...current.customRows, row],
    }));
    setEditingCustomId(row.id);
    setSaveMessage(null);
  }

  function deleteCustomRow(rowId: string) {
    setQuestionnaire((current) => ({
      ...current,
      customRows: current.customRows.filter((row) => row.id !== rowId),
    }));
    if (editingCustomId === rowId) setEditingCustomId(null);
    setSaveMessage(null);
  }

  function clearTemplateAnswer(questionId: string) {
    patchAnswer(questionId, "");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/crm/leads/${leadId}/discovery-questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionnaire }),
      });
      const data = await readApiJson<{
        questionnaire?: DiscoveryQuestionnaireData;
        lead?: CrmLead;
        report?: { pptFileName?: string; alertCreated?: boolean };
        reportWarning?: string | null;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to save discovery questions");

      const normalized = normalizeDiscoveryQuestionnaire(data.questionnaire);
      setQuestionnaire(normalized);
      setSavedSnapshot(JSON.stringify(normalized));

      if (data.lead && onLeadUpdated) {
        onLeadUpdated(data.lead);
      }

      const parts = ["Discovery questions saved"];
      if (data.report?.pptFileName) {
        parts.push(`PowerPoint draft generated (${data.report.pptFileName})`);
      }
      if (data.report?.alertCreated) {
        parts.push("home alert added");
      }
      if (data.reportWarning) {
        parts.push(data.reportWarning);
      }
      setSaveMessage(parts.join(" · "));

      window.dispatchEvent(new CustomEvent("internal-dashboard:refresh-alerts"));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save discovery questions",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePowerPoint() {
    setGeneratingPpt(true);
    setError(null);
    setSaveMessage(null);

    try {
      if (isDirty) {
        await handleSave();
        return;
      }

      const response = await fetch(`/api/crm/leads/${leadId}/generate-pptx`, {
        method: "POST",
      });
      const data = await readApiJson<{
        lead?: CrmLead;
        report?: { pptFileName?: string; alertCreated?: boolean };
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to generate PowerPoint");

      if (data.lead && onLeadUpdated) {
        onLeadUpdated(data.lead);
      }

      const parts = ["PowerPoint draft generated"];
      if (data.report?.pptFileName) parts.push(data.report.pptFileName);
      if (data.report?.alertCreated) parts.push("home alert added");
      setSaveMessage(parts.join(" · "));

      window.dispatchEvent(new CustomEvent("internal-dashboard:refresh-alerts"));
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : "Failed to generate PowerPoint",
      );
    } finally {
      setGeneratingPpt(false);
    }
  }

  const disabled = loading || saving || generatingPpt || busy;

  return (
    <div className="flex min-h-[560px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            Discovery call questions
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">{companyName}</h2>
          <p className="mt-1 text-sm text-white/50">
            Standardised discovery questionnaire — saved answers auto-generate a PowerPoint draft
            for internal review before the PDF is emailed to the client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onBack ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onBack}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.05] disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to lead
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled || !canSaveQuestions}
            onClick={() => void handleSave()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              canSaveQuestions
                ? "Save discovery answers and generate the PowerPoint draft"
                : "No changes to save"
            }
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save questions
          </button>
          {needsPowerPoint ? (
            <button
              type="button"
              disabled={disabled || !hasAnswers}
              onClick={() => void handleGeneratePowerPoint()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingPpt ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Presentation className="h-3.5 w-3.5" />
              )}
              Generate PowerPoint
            </button>
          ) : null}
          {showReviewPowerPoint && onReviewPowerPoint ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onReviewPowerPoint()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Presentation className="h-3.5 w-3.5" />
              Review PowerPoint
            </button>
          ) : null}
          {showGeneratePdf && onGeneratePdf ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onGeneratePdf()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-400/60 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileType className="h-3.5 w-3.5" />
              Generate PDF
            </button>
          ) : null}
        </div>
      </div>

      {saveMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {saveMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 flex items-center gap-3 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading discovery questions…
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {DISCOVERY_QUESTION_SECTIONS.map((section) => {
            const templateRows = DISCOVERY_QUESTION_TEMPLATES.filter(
              (question) => question.section === section,
            );
            const customRows = questionnaire.customRows.filter((row) => row.section === section);

            return (
              <section
                key={section}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">{section}</h3>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addCustomRow(section)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add question
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {templateRows.map((question) => {
                    const rows = discoveryQuestionTextareaRows(question.rows);
                    const answer = questionnaire.answers[question.id] ?? "";

                    return (
                      <div
                        key={question.id}
                        className="rounded-xl border border-white/10 bg-[#0b1524]/60 p-3 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <FieldLabel>{question.label}</FieldLabel>
                          {answer.trim() ? (
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => clearTemplateAnswer(question.id)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45 transition-colors hover:border-red-400/30 hover:text-red-200 disabled:opacity-50"
                              title="Clear answer"
                            >
                              <Trash2 className="h-3 w-3" />
                              Clear
                            </button>
                          ) : null}
                        </div>
                        <textarea
                          value={answer}
                          disabled={disabled}
                          rows={rows}
                          onChange={(event) => patchAnswer(question.id, event.target.value)}
                          className={textareaClassName(rows)}
                          placeholder="Enter notes from the discovery call…"
                        />
                      </div>
                    );
                  })}

                  {customRows.map((row) => {
                    const rows = discoveryQuestionTextareaRows(row.rows);
                    const isEditing = editingCustomId === row.id;

                    return (
                      <div
                        key={row.id}
                        className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 sm:p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {isEditing ? (
                            <div className="min-w-0 flex-1">
                              <FieldLabel>Question</FieldLabel>
                              <input
                                value={row.label}
                                disabled={disabled}
                                onChange={(event) =>
                                  patchCustomRow(row.id, { label: event.target.value })
                                }
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50"
                              />
                              <div className="mt-3">
                                <FieldLabel>Field size</FieldLabel>
                                <select
                                  value={row.rows}
                                  disabled={disabled}
                                  onChange={(event) =>
                                    patchCustomRow(row.id, {
                                      rows: Number(event.target.value) as DiscoveryQuestionRowSize,
                                    })
                                  }
                                  className="mt-1.5 rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50"
                                >
                                  <option value={1}>1 row</option>
                                  <option value={2}>2 rows</option>
                                  <option value={4}>4 rows</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <FieldLabel>{row.label}</FieldLabel>
                              <p className="mt-1 text-[11px] text-white/35">Custom question</p>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                setEditingCustomId(isEditing ? null : row.id)
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/55 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                              title={isEditing ? "Done editing" : "Edit question"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => deleteCustomRow(row.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/55 transition-colors hover:border-red-400/30 hover:text-red-200 disabled:opacity-50"
                              title="Delete question"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={row.answer}
                          disabled={disabled}
                          rows={rows}
                          onChange={(event) =>
                            patchCustomRow(row.id, { answer: event.target.value })
                          }
                          className={cn(textareaClassName(rows), "mt-3")}
                          placeholder="Answer…"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
