"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, History, Loader2, Pencil, Save, X } from "lucide-react";

import {
  COMPANY_STATUSES,
  companyDetailsFieldsEqual,
  createBlankCompanyDetailsFields,
  isCompanyDetailsEmpty,
  sanitizeCompanyDetailsFields,
  validateCompanyDetailsFields,
  type CompanyDetails,
  type CompanyDetailsFields,
  type CompanyDetailsValidationErrors,
  type CompanyStatus,
} from "@/lib/company-details-data";
import { cn } from "@/lib/utils";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function FieldLabel({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45"
    >
      {children}
      {required ? <span className="ml-1 text-rose-300">*</span> : null}
    </label>
  );
}

function inputClassName(hasError?: boolean) {
  return cn(
    "mt-1.5 w-full rounded-xl border bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-70",
    hasError ? "border-rose-400/50" : "border-white/10",
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DisplayValue({ value, multiline }: { value: string; multiline?: boolean }) {
  if (!value.trim()) {
    return <p className="mt-1.5 text-sm text-white/40">Not set</p>;
  }
  return (
    <p
      className={cn(
        "mt-1.5 text-sm text-white/90",
        multiline && "whitespace-pre-wrap leading-relaxed",
      )}
    >
      {value}
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-300">{message}</p>;
}

function toFields(details: CompanyDetails | null): CompanyDetailsFields {
  if (!details) return createBlankCompanyDetailsFields();
  return {
    legalCompanyName: details.legalCompanyName,
    tradingName: details.tradingName,
    companyNumber: details.companyNumber,
    vatTaxNumber: details.vatTaxNumber,
    registeredOfficeAddress: details.registeredOfficeAddress,
    principalBusinessAddress: details.principalBusinessAddress,
    countryOfRegistration: details.countryOfRegistration,
    dateOfIncorporation: details.dateOfIncorporation,
    companyStatus: details.companyStatus,
    sicIndustryClassification: details.sicIndustryClassification,
    website: details.website,
    primaryEmail: details.primaryEmail,
    primaryTelephone: details.primaryTelephone,
    generalCompanyDescription: details.generalCompanyDescription,
  };
}

export default function CompanyDetailsWorkspace() {
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [draft, setDraft] = useState<CompanyDetailsFields>(createBlankCompanyDetailsFields());
  const [savedSnapshot, setSavedSnapshot] = useState<CompanyDetailsFields>(
    createBlankCompanyDetailsFields(),
  );
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CompanyDetailsValidationErrors>({});
  const [hasRecord, setHasRecord] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isDirty = useMemo(
    () => !companyDetailsFieldsEqual(draft, savedSnapshot),
    [draft, savedSnapshot],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/company-details", { cache: "no-store" });
      const payload = await readApiJson<{
        details: CompanyDetails | null;
        error?: string;
      }>(response);
      if (!response.ok) {
        throw new Error(payload.error || `Failed to load (${response.status})`);
      }
      const next = payload.details;
      const fields = toFields(next);
      setDetails(next);
      setDraft(fields);
      setSavedSnapshot(fields);
      setHasRecord(Boolean(next));
      setMode(next ? "view" : "view");
      setFieldErrors({});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load company details.");
      setDetails(null);
      setHasRecord(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField<K extends keyof CompanyDetailsFields>(
    key: K,
    value: CompanyDetailsFields[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSaveMessage(null);
  }

  function startEditing() {
    setMode("edit");
    setError(null);
    setSaveMessage(null);
    setFieldErrors({});
  }

  function cancelEditing() {
    setDraft(savedSnapshot);
    setFieldErrors({});
    setError(null);
    setSaveMessage(null);
    setMode("view");
  }

  async function handleSave() {
    const validation = validateCompanyDetailsFields(draft);
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
      setError("Fix the highlighted fields before saving.");
      return;
    }

    const optimistic = sanitizeCompanyDetailsFields(draft);
    const previousDetails = details;
    const previousSnapshot = savedSnapshot;
    const previousHasRecord = hasRecord;

    setSaving(true);
    setError(null);
    setSaveMessage(null);
    setDraft(optimistic);
    setSavedSnapshot(optimistic);
    setHasRecord(true);
    setDetails((current) =>
      current
        ? {
            ...current,
            ...optimistic,
            updatedAt: new Date().toISOString(),
          }
        : ({
            id: "optimistic",
            workspaceId: "",
            ...optimistic,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } satisfies CompanyDetails),
    );

    try {
      const response = await fetch("/api/company-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      const payload = await readApiJson<{ details: CompanyDetails; error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error || `Save failed (${response.status})`);
      }
      const saved = payload.details;
      const fields = toFields(saved);
      setDetails(saved);
      setDraft(fields);
      setSavedSnapshot(fields);
      setHasRecord(true);
      setMode("view");
      setSaveMessage("Company details saved.");
    } catch (saveError) {
      setDetails(previousDetails);
      setDraft(previousSnapshot);
      setSavedSnapshot(previousSnapshot);
      setHasRecord(previousHasRecord);
      setMode("edit");
      setError(saveError instanceof Error ? saveError.message : "Failed to save company details.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading company details…
        </div>
      </div>
    );
  }

  if (error && !hasRecord && mode === "view" && isCompanyDetailsEmpty(draft)) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.08]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasRecord && mode === "view" && isCompanyDetailsEmpty(draft)) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10">
          <Building2 className="h-5 w-5 text-sky-200" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-white">No company details yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/65">
          Add the legal entity profile for this workspace — registration numbers, addresses, and
          contact details.
        </p>
        <button
          type="button"
          onClick={startEditing}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/15 px-5 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/25"
        >
          Add Company Details
        </button>
      </div>
    );
  }

  const editing = mode === "edit";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {draft.legalCompanyName.trim() || "Company Details"}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={cancelEditing}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden />
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !isDirty}
                onClick={() => void handleSave()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowHistory((value) => !value)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.08]"
              >
                <History className="h-4 w-4" aria-hidden />
                History
              </button>
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/25"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {showHistory ? (
        <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4">
          <h3 className="text-sm font-semibold text-white">Record history</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">Created</dt>
              <dd className="mt-1 text-sm text-white/80">
                {details?.createdAt
                  ? new Date(details.createdAt).toLocaleString()
                  : "Not recorded yet"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                Last updated
              </dt>
              <dd className="mt-1 text-sm text-white/80">
                {details?.updatedAt
                  ? new Date(details.updatedAt).toLocaleString()
                  : "Not recorded yet"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {saveMessage}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Legal identity"
          description="Core registration details for the legal entity."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="legalCompanyName" required>
                Legal Company Name
              </FieldLabel>
              {editing ? (
                <input
                  id="legalCompanyName"
                  value={draft.legalCompanyName}
                  onChange={(event) => updateField("legalCompanyName", event.target.value)}
                  className={inputClassName(Boolean(fieldErrors.legalCompanyName))}
                  disabled={saving}
                  autoComplete="organization"
                />
              ) : (
                <DisplayValue value={draft.legalCompanyName} />
              )}
              <FieldError message={fieldErrors.legalCompanyName} />
            </div>
            <div>
              <FieldLabel htmlFor="tradingName">Trading Name</FieldLabel>
              {editing ? (
                <input
                  id="tradingName"
                  value={draft.tradingName}
                  onChange={(event) => updateField("tradingName", event.target.value)}
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.tradingName} />
              )}
            </div>
            <div>
              <FieldLabel htmlFor="companyNumber">Company Number</FieldLabel>
              {editing ? (
                <input
                  id="companyNumber"
                  value={draft.companyNumber}
                  onChange={(event) => updateField("companyNumber", event.target.value)}
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.companyNumber} />
              )}
            </div>
            <div>
              <FieldLabel htmlFor="vatTaxNumber">VAT / Tax Number</FieldLabel>
              {editing ? (
                <input
                  id="vatTaxNumber"
                  value={draft.vatTaxNumber}
                  onChange={(event) => updateField("vatTaxNumber", event.target.value)}
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.vatTaxNumber} />
              )}
            </div>
            <div>
              <FieldLabel htmlFor="companyStatus">Company Status</FieldLabel>
              {editing ? (
                <select
                  id="companyStatus"
                  value={draft.companyStatus}
                  onChange={(event) =>
                    updateField("companyStatus", event.target.value as CompanyStatus)
                  }
                  className={inputClassName(Boolean(fieldErrors.companyStatus))}
                  disabled={saving}
                >
                  {COMPANY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              ) : (
                <DisplayValue value={draft.companyStatus} />
              )}
              <FieldError message={fieldErrors.companyStatus} />
            </div>
            <div>
              <FieldLabel htmlFor="dateOfIncorporation">Date of Incorporation</FieldLabel>
              {editing ? (
                <input
                  id="dateOfIncorporation"
                  type="date"
                  value={draft.dateOfIncorporation}
                  onChange={(event) => updateField("dateOfIncorporation", event.target.value)}
                  className={inputClassName(Boolean(fieldErrors.dateOfIncorporation))}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.dateOfIncorporation} />
              )}
              <FieldError message={fieldErrors.dateOfIncorporation} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="countryOfRegistration">Country of Registration</FieldLabel>
              {editing ? (
                <input
                  id="countryOfRegistration"
                  value={draft.countryOfRegistration}
                  onChange={(event) => updateField("countryOfRegistration", event.target.value)}
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.countryOfRegistration} />
              )}
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="sicIndustryClassification">
                SIC / Industry Classification
              </FieldLabel>
              {editing ? (
                <input
                  id="sicIndustryClassification"
                  value={draft.sicIndustryClassification}
                  onChange={(event) =>
                    updateField("sicIndustryClassification", event.target.value)
                  }
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.sicIndustryClassification} />
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Addresses"
          description="Registered office and principal place of business."
        >
          <div className="grid gap-4">
            <div>
              <FieldLabel htmlFor="registeredOfficeAddress">Registered Office Address</FieldLabel>
              {editing ? (
                <textarea
                  id="registeredOfficeAddress"
                  rows={4}
                  value={draft.registeredOfficeAddress}
                  onChange={(event) =>
                    updateField("registeredOfficeAddress", event.target.value)
                  }
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.registeredOfficeAddress} multiline />
              )}
            </div>
            <div>
              <FieldLabel htmlFor="principalBusinessAddress">
                Principal Business Address
              </FieldLabel>
              {editing ? (
                <textarea
                  id="principalBusinessAddress"
                  rows={4}
                  value={draft.principalBusinessAddress}
                  onChange={(event) =>
                    updateField("principalBusinessAddress", event.target.value)
                  }
                  className={inputClassName()}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.principalBusinessAddress} multiline />
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Contact" description="Primary public and operational contact points.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="website">Website</FieldLabel>
              {editing ? (
                <input
                  id="website"
                  value={draft.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  className={inputClassName(Boolean(fieldErrors.website))}
                  disabled={saving}
                  placeholder="https://example.com"
                />
              ) : draft.website.trim() ? (
                <a
                  href={draft.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-sm text-sky-200 underline-offset-2 hover:underline"
                >
                  {draft.website}
                </a>
              ) : (
                <DisplayValue value="" />
              )}
              <FieldError message={fieldErrors.website} />
            </div>
            <div>
              <FieldLabel htmlFor="primaryEmail">Primary Email</FieldLabel>
              {editing ? (
                <input
                  id="primaryEmail"
                  type="email"
                  value={draft.primaryEmail}
                  onChange={(event) => updateField("primaryEmail", event.target.value)}
                  className={inputClassName(Boolean(fieldErrors.primaryEmail))}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.primaryEmail} />
              )}
              <FieldError message={fieldErrors.primaryEmail} />
            </div>
            <div>
              <FieldLabel htmlFor="primaryTelephone">Primary Telephone</FieldLabel>
              {editing ? (
                <input
                  id="primaryTelephone"
                  value={draft.primaryTelephone}
                  onChange={(event) => updateField("primaryTelephone", event.target.value)}
                  className={inputClassName(Boolean(fieldErrors.primaryTelephone))}
                  disabled={saving}
                />
              ) : (
                <DisplayValue value={draft.primaryTelephone} />
              )}
              <FieldError message={fieldErrors.primaryTelephone} />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Company description"
          description="Short overview of the organisation for internal reference."
        >
          <FieldLabel htmlFor="generalCompanyDescription">General Company Description</FieldLabel>
          {editing ? (
            <textarea
              id="generalCompanyDescription"
              rows={8}
              value={draft.generalCompanyDescription}
              onChange={(event) =>
                updateField("generalCompanyDescription", event.target.value)
              }
              className={inputClassName()}
              disabled={saving}
            />
          ) : (
            <DisplayValue value={draft.generalCompanyDescription} multiline />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
