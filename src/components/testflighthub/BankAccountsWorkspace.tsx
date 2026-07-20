"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, Star, X } from "lucide-react";

import {
  CORPORATE_BANK_ACCOUNT_TYPES,
  CORPORATE_BANK_STATUSES,
  statusPillClass,
  type CorporateBankAccount,
  type CorporateBankStatus,
} from "@/lib/corporate-data";
import {
  archiveBankAccount,
  deleteBankAccount,
  markPrimaryBankAccount,
  upsertBankAccount,
} from "@/lib/corporate-mock-store";
import { useCorporateMockStore } from "./useCorporateMockStore";
import {
  CorporateFieldLabel,
  CorporateKpiTile,
  CorporateSection,
  CorporateStatusPill,
  corporateInputClass,
  corporatePrimaryButtonClass,
  corporateSecondaryButtonClass,
} from "./corporate-ui";

const CURRENCIES = ["EUR", "GBP", "USD", "CHF", "SEK", "NOK", "DKK"] as const;

type BankFormState = {
  id?: string;
  bank: string;
  accountName: string;
  currency: string;
  country: string;
  accountType: (typeof CORPORATE_BANK_ACCOUNT_TYPES)[number];
  status: CorporateBankStatus;
  iban: string;
  swift: string;
  routing: string;
  branch: string;
  accountHolder: string;
  notes: string;
};

const emptyBankForm = (): BankFormState => ({
  bank: "",
  accountName: "",
  currency: "EUR",
  country: "Spain",
  accountType: "Current",
  status: "active",
  iban: "",
  swift: "",
  routing: "",
  branch: "",
  accountHolder: "Nakama Ventures SL",
  notes: "",
});

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function actionClass(tone: "sky" | "violet" | "amber" | "rose" | "emerald") {
  const map = {
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    violet: "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    amber: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
    emerald: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
  } as const;
  return `inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${map[tone]}`;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-1 text-sm text-white/80">{value || "—"}</div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            type="button"
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BankDetailPanel({
  account,
  onClose,
  onEdit,
  onArchive,
  onMarkPrimary,
}: {
  account: CorporateBankAccount;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onMarkPrimary: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-white/15 bg-[#0b1524] shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{account.accountName}</h3>
              <p className="mt-1 text-sm text-white/50">
                {account.bank} · {account.currency}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CorporateStatusPill className={statusPillClass(account.status)}>
                  {formatStatusLabel(account.status)}
                </CorporateStatusPill>
                {account.primary ? (
                  <CorporateStatusPill className={statusPillClass("primary")}>
                    <Star className="mr-1 h-3 w-3 fill-current" />
                    Primary
                  </CorporateStatusPill>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/5"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Bank" value={account.bank} />
            <Info label="Account holder" value={account.accountHolder} />
            <Info label="IBAN" value={account.iban} />
            <Info label="SWIFT / BIC" value={account.swift} />
            <Info label="Routing / Sort code" value={account.routing} />
            <Info label="Branch" value={account.branch} />
            <Info label="Country" value={account.country} />
            <Info label="Account type" value={account.accountType} />
            <div className="sm:col-span-2">
              <Info label="Notes" value={account.notes || "No notes recorded."} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" className={corporatePrimaryButtonClass()} onClick={onEdit}>
            Edit
          </button>
          {!account.primary && account.status !== "archived" ? (
            <button type="button" className={corporateSecondaryButtonClass()} onClick={onMarkPrimary}>
              Mark Primary
            </button>
          ) : null}
          {account.status !== "archived" ? (
            <button type="button" className={actionClass("amber")} onClick={onArchive}>
              Archive
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default function BankAccountsWorkspace() {
  const store = useCorporateMockStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CorporateBankStatus | "all">("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BankFormState | null>(null);

  const filterOptions = useMemo(() => {
    const currencies = [...new Set(store.banks.map((b) => b.currency))].sort();
    const countries = [...new Set(store.banks.map((b) => b.country))].sort();
    return { currencies, countries };
  }, [store.banks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.banks.filter((account) => {
      if (statusFilter !== "all" && account.status !== statusFilter) return false;
      if (currencyFilter !== "all" && account.currency !== currencyFilter) return false;
      if (countryFilter !== "all" && account.country !== countryFilter) return false;
      if (
        q &&
        ![
          account.bank,
          account.accountName,
          account.currency,
          account.country,
          account.accountHolder,
          account.iban,
          account.swift,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [store.banks, search, statusFilter, currencyFilter, countryFilter]);

  const activeCount = store.banks.filter((b) => b.status === "active").length;
  const currencyCount = new Set(store.banks.map((b) => b.currency)).size;
  const primaryAccount = store.banks.find((b) => b.primary);
  const reviewCount = store.banks.filter((b) => b.status === "review").length;

  const selected = store.banks.find((b) => b.id === selectedId) ?? null;

  function openAdd() {
    setForm(emptyBankForm());
  }

  function openEdit(account: CorporateBankAccount) {
    setForm({
      id: account.id,
      bank: account.bank,
      accountName: account.accountName,
      currency: account.currency,
      country: account.country,
      accountType: account.accountType,
      status: account.status,
      iban: account.iban,
      swift: account.swift,
      routing: account.routing,
      branch: account.branch,
      accountHolder: account.accountHolder,
      notes: account.notes,
    });
  }

  function saveForm() {
    if (!form?.bank.trim() || !form.accountName.trim()) return;
    upsertBankAccount({
      id: form.id,
      bank: form.bank.trim(),
      accountName: form.accountName.trim(),
      currency: form.currency,
      country: form.country.trim(),
      accountType: form.accountType,
      status: form.status,
      iban: form.iban.trim(),
      swift: form.swift.trim(),
      routing: form.routing.trim(),
      branch: form.branch.trim(),
      accountHolder: form.accountHolder.trim(),
      notes: form.notes.trim(),
    });
    setForm(null);
  }

  function handleDelete(id: string) {
    deleteBankAccount(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CorporateKpiTile label="Bank Accounts" value={store.banks.length} />
        <CorporateKpiTile label="Active" value={activeCount} />
        <CorporateKpiTile label="Currencies" value={currencyCount} hint="Multi-currency register" />
        <CorporateKpiTile
          label="Primary Account"
          value={primaryAccount?.currency ?? "—"}
          hint={primaryAccount?.accountName ?? "Not set"}
        />
      </section>

      {reviewCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-medium text-amber-100">
              {reviewCount} account{reviewCount === 1 ? "" : "s"} flagged for review
            </p>
            <p className="mt-0.5 text-xs text-amber-200/70">
              KYC or compliance checks may be required before use.
            </p>
          </div>
        </div>
      ) : null}

      <CorporateSection
        title="Bank Account Register"
        subtitle="Company bank accounts and payment details for operations."
        actions={
          <button type="button" className={corporatePrimaryButtonClass()} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </button>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <CorporateFieldLabel>Search</CorporateFieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                className={`${corporateInputClass()} pl-9`}
                placeholder="Bank, account name, IBAN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <CorporateFieldLabel>Status</CorporateFieldLabel>
            <select
              className={corporateInputClass()}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CorporateBankStatus | "all")}
            >
              <option value="all">All</option>
              {CORPORATE_BANK_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatStatusLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <CorporateFieldLabel>Currency</CorporateFieldLabel>
            <select
              className={corporateInputClass()}
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
            >
              <option value="all">All</option>
              {filterOptions.currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <CorporateFieldLabel>Country</CorporateFieldLabel>
            <select
              className={corporateInputClass()}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="all">All</option>
              {filterOptions.countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Account Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-white/45">
                    No bank accounts match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((account) => (
                  <tr key={account.id} className="border-b border-white/8 text-white/85">
                    <td className="px-4 py-3 font-medium text-white">{account.bank}</td>
                    <td className="px-4 py-3">{account.accountName}</td>
                    <td className="px-4 py-3 tabular-nums">{account.currency}</td>
                    <td className="px-4 py-3">{account.country}</td>
                    <td className="px-4 py-3">{account.accountType}</td>
                    <td className="px-4 py-3">
                      <CorporateStatusPill className={statusPillClass(account.status)}>
                        {formatStatusLabel(account.status)}
                      </CorporateStatusPill>
                    </td>
                    <td className="px-4 py-3">
                      {account.primary ? (
                        <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className={actionClass("sky")}
                          onClick={() => setSelectedId(account.id)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className={actionClass("violet")}
                          onClick={() => openEdit(account)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={actionClass("rose")}
                          onClick={() => handleDelete(account.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CorporateSection>

      {selected ? (
        <BankDetailPanel
          account={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            openEdit(selected);
            setSelectedId(null);
          }}
          onArchive={() => {
            archiveBankAccount(selected.id);
            setSelectedId(null);
          }}
          onMarkPrimary={() => markPrimaryBankAccount(selected.id)}
        />
      ) : null}

      {form ? (
        <Modal title={form.id ? "Edit Bank Account" : "Add Bank Account"} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bank">
              <input
                className={corporateInputClass()}
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
              />
            </Field>
            <Field label="Account name">
              <input
                className={corporateInputClass()}
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              />
            </Field>
            <Field label="Currency">
              <select
                className={corporateInputClass()}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Country">
              <input
                className={corporateInputClass()}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </Field>
            <Field label="Account type">
              <select
                className={corporateInputClass()}
                value={form.accountType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    accountType: e.target.value as BankFormState["accountType"],
                  })
                }
              >
                {CORPORATE_BANK_ACCOUNT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={corporateInputClass()}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CorporateBankStatus })
                }
              >
                {CORPORATE_BANK_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {formatStatusLabel(item)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Account holder">
              <input
                className={corporateInputClass()}
                value={form.accountHolder}
                onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
              />
            </Field>
            <Field label="Branch">
              <input
                className={corporateInputClass()}
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              />
            </Field>
            <Field label="IBAN">
              <input
                className={corporateInputClass()}
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
              />
            </Field>
            <Field label="SWIFT / BIC">
              <input
                className={corporateInputClass()}
                value={form.swift}
                onChange={(e) => setForm({ ...form, swift: e.target.value })}
              />
            </Field>
            <Field label="Routing / Sort code">
              <input
                className={corporateInputClass()}
                value={form.routing}
                onChange={(e) => setForm({ ...form, routing: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  className={corporateInputClass()}
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={corporateSecondaryButtonClass()} onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="button" className={corporatePrimaryButtonClass()} onClick={saveForm}>
              Save Account
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <CorporateFieldLabel>{label}</CorporateFieldLabel>
      {children}
    </div>
  );
}
