"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";

import type { CrmLead } from "@/lib/crm-data";
import {
  CRM_COMPANY_LOGO_ACCEPT,
  CRM_COMPANY_LOGO_ASPECT,
} from "@/lib/crm-company-logo-data";
import { normalizeCompanyLogoFile } from "@/lib/crm-company-logo-client";
import { cn } from "@/lib/utils";

type CrmLeadLogoUploadProps = {
  lead: CrmLead;
  busy?: boolean;
  compact?: boolean;
  onUploaded: (lead: CrmLead) => void;
  onError?: (message: string) => void;
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

export default function CrmLeadLogoUpload({
  lead,
  busy = false,
  compact = false,
  onUploaded,
  onError,
}: CrmLeadLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrl: string | null = null;

    async function loadPreview() {
      if (!lead.companyLogoFileId) {
        setPreviewUrl(null);
        return;
      }

      try {
        const response = await fetch(`/api/files/objects/${lead.companyLogoFileId}`, {
          cache: "no-store",
        });
        const data = await readApiJson<{ url?: string; error?: string }>(response);
        if (!response.ok || !data.url) {
          throw new Error(data.error ?? "Failed to load logo preview");
        }
        if (!cancelled) setPreviewUrl(data.url);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lead.companyLogoFileId]);

  async function handleFileSelected(file: File | null) {
    if (!file) return;

    setUploading(true);

    try {
      const normalized = await normalizeCompanyLogoFile(file);
      const formData = new FormData();
      formData.append("file", normalized);

      const response = await fetch(`/api/crm/leads/${lead.id}/logo`, {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{ lead?: CrmLead; error?: string }>(response);
      if (!response.ok || !data.lead) {
        throw new Error(data.error ?? "Failed to upload logo");
      }

      onUploaded(data.lead);
    } catch (uploadError) {
      onError?.(uploadError instanceof Error ? uploadError.message : "Failed to upload logo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const disabled = busy || uploading;

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={CRM_COMPANY_LOGO_ACCEPT}
          className="hidden"
          onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={disabled}
          title={lead.companyLogoFileName ? "Replace company logo" : "Upload company logo"}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:border-sky-400/30 hover:text-sky-200 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </button>
      </>
    );
  }

  return (
    <div className="mt-1.5 rounded-xl border border-white/10 bg-[#0b1524] px-3 py-3">
      <input
        ref={inputRef}
        type="file"
        accept={CRM_COMPANY_LOGO_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white"
          style={{ width: 96, height: 96 / CRM_COMPANY_LOGO_ASPECT }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`${lead.companyName} logo`} className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-white/35">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px]">2:1 slot</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/75">Company logo for after-call reports</p>
          <p className="mt-1 text-xs text-white/45">
            PNG, JPG, or SVG. Saved as <span className="text-white/60">Company Logo.png</span> in the
            client folder and shown on the report title page.
          </p>
          {lead.companyLogoFileName ? (
            <p className="mt-2 truncate text-xs text-emerald-300/90">{lead.companyLogoFileName}</p>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {lead.companyLogoFileId ? "Replace logo" : "Upload logo"}
          </button>
        </div>
      </div>
    </div>
  );
}
