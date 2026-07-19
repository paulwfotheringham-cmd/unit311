"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  FileType,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Presentation,
  Save,
  Underline,
} from "lucide-react";

import { cn } from "@/lib/utils";

type CrmLeadDiscoveryEditorProps = {
  companyName: string;
  initialHtml: string;
  busy?: boolean;
  onBack: () => void;
  onSave: (html: string) => Promise<void>;
  onCommit: (html: string) => Promise<{ meetingsCompleted: number; alertsCleared: number }>;
  onReviewPowerPoint?: () => void | Promise<void>;
  onGeneratePdf?: () => void | Promise<void>;
  canGeneratePdf?: boolean;
  showReviewPowerPoint?: boolean;
  showGeneratePdf?: boolean;
};

function ToolbarButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function CrmLeadDiscoveryEditor({
  companyName,
  initialHtml,
  busy = false,
  onBack,
  onSave,
  onCommit,
  onReviewPowerPoint,
  onGeneratePdf,
  canGeneratePdf = true,
  showReviewPowerPoint = false,
  showGeneratePdf = false,
}: CrmLeadDiscoveryEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [reviewingPpt, setReviewingPpt] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = initialHtml || "";
    setDirty(false);
  }, [initialHtml, companyName]);

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
  }, []);

  const handleInput = useCallback(() => {
    setDirty(true);
  }, []);

  async function handleSave() {
    const html = editorRef.current?.innerHTML.trim() ?? "";
    setSaving(true);
    try {
      await onSave(html);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCommit() {
    const html = editorRef.current?.innerHTML.trim() ?? "";
    setCommitting(true);
    try {
      await onCommit(html);
      setDirty(false);
    } finally {
      setCommitting(false);
    }
  }

  async function handleReviewPowerPoint() {
    if (!onReviewPowerPoint) return;
    setReviewingPpt(true);
    try {
      await onReviewPowerPoint();
    } finally {
      setReviewingPpt(false);
    }
  }

  async function handleGeneratePdf() {
    if (!onGeneratePdf) return;
    setGeneratingPdf(true);
    try {
      if (dirty) {
        const html = editorRef.current?.innerHTML.trim() ?? "";
        await onSave(html);
        setDirty(false);
      }
      await onGeneratePdf();
    } finally {
      setGeneratingPdf(false);
    }
  }

  const disabled = busy || saving || committing || reviewingPpt || generatingPdf;

  return (
    <div className="flex min-h-[560px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
            Discovery
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">{companyName}</h2>
          <p className="mt-1 text-sm text-white/50">
            Capture discovery call notes, requirements, and follow-ups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onBack}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to lead
          </button>
          <button
            type="button"
            disabled={disabled || !dirty}
            onClick={() => void handleSave()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save discovery
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleCommit()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {committing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Commit
          </button>
          {onReviewPowerPoint && showReviewPowerPoint ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleReviewPowerPoint()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewingPpt ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Presentation className="h-3.5 w-3.5" />
              )}
              Review PowerPoint
            </button>
          ) : null}
          {onGeneratePdf && showGeneratePdf ? (
            <button
              type="button"
              disabled={disabled || !canGeneratePdf}
              onClick={() => void handleGeneratePdf()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-400/60 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileType className="h-3.5 w-3.5" />
              )}
              Generate PDF
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 rounded-t-xl border border-b-0 border-white/15 bg-[#0b1524] px-3 py-2">
        <ToolbarButton label="Bold" disabled={disabled} onClick={() => exec("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" disabled={disabled} onClick={() => exec("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline" disabled={disabled} onClick={() => exec("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Heading 1" disabled={disabled} onClick={() => exec("formatBlock", "h1")}>
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" disabled={disabled} onClick={() => exec("formatBlock", "h2")}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" disabled={disabled} onClick={() => exec("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" disabled={disabled} onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        className={cn(
          "min-h-[420px] flex-1 rounded-b-xl border border-white/15 bg-[#07111f] px-4 py-4 text-sm leading-relaxed text-white/85 outline-none focus:border-sky-400/40",
          disabled && "cursor-not-allowed opacity-60",
        )}
      />
    </div>
  );
}
