"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";

import {
  CORPORATE_CONTRACT_TYPES,
  daysUntil,
  isWithinDays,
  statusPillClass,
  type CorporateContract,
} from "@/lib/corporate-data";
import {
  archiveContract,
  deleteContract,
  isoDaysFromNow,
  renewContract,
  upsertContract,
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

type ContractFormState = {
  id?: string;
  name: string;
  supplier: string;
  type: (typeof CORPORATE_CONTRACT_TYPES)[number];
  owner: string;
  startDate: string;
  expiryDate: string;
  value: string;
  status: CorporateContract["status"];
  summary: string;
  parties: string;
  renewalNotes: string;
  documents: string;
  notes: string;
};

type ContractPanelTab = "Summary" | "Parties" | "Renewal" | "Documents" | "History" | "Notes";

const CONTRACT_PANEL_TABS: ContractPanelTab[] = [
  "Summary",
  "Parties",
  "Renewal",
  "Documents",
  "History",
  "Notes",
];

const emptyContractForm = (): ContractFormState => ({
  name: "",
  supplier: "",
  type: "Other",
  owner: "",
  startDate: isoDaysFromNow(0),
  expiryDate: isoDaysFromNow(365),
  value: "",
  status: "draft",
  summary: "",
  parties: "",
  renewalNotes: "",
  documents: "",
  notes: "",
});

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

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

function ContractDetailPanel({
  contract,
  activity,
  tab,
  onTab,
  onClose,
  onEdit,
  onRenew,
  onArchive,
}: {
  contract: CorporateContract;
  activity: Array<{ id: string; at: string; label: string; detail: string }>;
  tab: ContractPanelTab;
  onTab: (tab: ContractPanelTab) => void;
  onClose: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onArchive: () => void;
}) {
  const daysLeft = daysUntil(contract.expiryDate);
  const contractActivity = activity.filter(
    (item) =>
      item.detail.toLowerCase().includes(contract.name.toLowerCase()) ||
      item.detail.toLowerCase().includes(contract.supplier.toLowerCase()) ||
      item.label.toLowerCase().includes("contract"),
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-white/15 bg-[#0b1524] shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{contract.name}</h3>
              <p className="mt-1 text-sm text-white/50">
                {contract.supplier} · {contract.type}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CorporateStatusPill className={statusPillClass(contract.status)}>
                  {formatStatusLabel(contract.status)}
                </CorporateStatusPill>
                {contract.status !== "archived" && daysLeft >= 0 && daysLeft <= 60 ? (
                  <CorporateStatusPill className={statusPillClass("expiring")}>
                    {daysLeft} days to expiry
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
          <div className="mt-4 flex flex-wrap gap-1.5">
            {CONTRACT_PANEL_TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onTab(item)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  tab === item
                    ? "border border-sky-400/40 bg-sky-500/15 text-sky-100"
                    : "border border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "Summary" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Owner" value={contract.owner} />
              <Info label="Value" value={contract.value} />
              <Info label="Start date" value={formatShortDate(contract.startDate)} />
              <Info label="Expiry date" value={formatShortDate(contract.expiryDate)} />
              <div className="sm:col-span-2">
                <Info label="Summary" value={contract.summary || "No summary recorded."} />
              </div>
            </div>
          ) : null}

          {tab === "Parties" ? (
            <Info label="Contract parties" value={contract.parties || "Parties not recorded."} />
          ) : null}

          {tab === "Renewal" ? (
            <Info
              label="Renewal notes"
              value={contract.renewalNotes || "No renewal notes yet."}
            />
          ) : null}

          {tab === "Documents" ? (
            contract.documents ? (
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">On file</p>
                <p className="mt-2 text-sm font-medium text-white">{contract.documents}</p>
              </div>
            ) : (
              <p className="text-sm text-white/45">No documents linked to this contract.</p>
            )
          ) : null}

          {tab === "History" ? (
            <ul className="space-y-2">
              {contractActivity.length === 0 ? (
                <li className="text-sm text-white/45">No activity recorded for this contract.</li>
              ) : (
                contractActivity.map((item) => (
                  <li key={item.id} className="rounded-xl border border-white/10 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-white/40">
                        {formatShortDate(item.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">{item.detail}</p>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          {tab === "Notes" ? (
            <Info label="Internal notes" value={contract.notes || "No internal notes."} />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" className={corporatePrimaryButtonClass()} onClick={onEdit}>
            Edit
          </button>
          {contract.status !== "archived" ? (
            <>
              <button type="button" className={actionClass("emerald")} onClick={onRenew}>
                Renew
              </button>
              <button type="button" className={actionClass("amber")} onClick={onArchive}>
                Archive
              </button>
            </>
          ) : null}
        </div>
      </aside>
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

export default function ContractsWorkspace() {
  const store = useCorporateMockStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof CORPORATE_CONTRACT_TYPES)[number] | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<CorporateContract["status"] | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<ContractPanelTab>("Summary");
  const [form, setForm] = useState<ContractFormState | null>(null);

  const expiringSoon = useMemo(
    () =>
      store.contracts.filter(
        (c) =>
          c.status !== "archived" &&
          c.status !== "draft" &&
          isWithinDays(c.expiryDate, 60),
      ),
    [store.contracts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.contracts.filter((contract) => {
      if (typeFilter !== "all" && contract.type !== typeFilter) return false;
      if (statusFilter !== "all" && contract.status !== statusFilter) return false;
      if (
        q &&
        ![
          contract.name,
          contract.supplier,
          contract.type,
          contract.owner,
          contract.value,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [store.contracts, search, typeFilter, statusFilter]);

  const activeCount = store.contracts.filter(
    (c) => c.status === "active" || c.status === "expiring",
  ).length;
  const expiredCount = store.contracts.filter((c) => c.status === "expired").length;

  const selected = store.contracts.find((c) => c.id === selectedId) ?? null;

  function openAdd() {
    setForm(emptyContractForm());
  }

  function openEdit(contract: CorporateContract) {
    setForm({
      id: contract.id,
      name: contract.name,
      supplier: contract.supplier,
      type: contract.type,
      owner: contract.owner,
      startDate: contract.startDate,
      expiryDate: contract.expiryDate,
      value: contract.value,
      status: contract.status,
      summary: contract.summary,
      parties: contract.parties,
      renewalNotes: contract.renewalNotes,
      documents: contract.documents,
      notes: contract.notes,
    });
  }

  function saveForm() {
    if (!form?.name.trim()) return;
    upsertContract({
      id: form.id,
      name: form.name.trim(),
      supplier: form.supplier.trim(),
      type: form.type,
      owner: form.owner.trim(),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      value: form.value.trim(),
      status: form.status,
      summary: form.summary.trim(),
      parties: form.parties.trim(),
      renewalNotes: form.renewalNotes.trim(),
      documents: form.documents.trim(),
      notes: form.notes.trim(),
    });
    setForm(null);
  }

  function openContract(id: string) {
    setSelectedId(id);
    setPanelTab("Summary");
  }

  function handleDelete(id: string) {
    deleteContract(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CorporateKpiTile label="Contracts" value={store.contracts.length} />
        <CorporateKpiTile label="Active" value={activeCount} />
        <CorporateKpiTile
          label="Expiring (60 days)"
          value={expiringSoon.length}
          hint="Renewal attention needed"
        />
        <CorporateKpiTile label="Expired" value={expiredCount} />
      </section>

      {expiringSoon.length > 0 ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-100">
                {expiringSoon.length} contract{expiringSoon.length === 1 ? "" : "s"} expiring within
                60 days
              </p>
              <ul className="mt-2 space-y-1.5">
                {expiringSoon.slice(0, 5).map((contract) => (
                  <li key={contract.id} className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-left text-sm text-amber-50/90 hover:text-white"
                      onClick={() => openContract(contract.id)}
                    >
                      {contract.name}
                    </button>
                    <span className="text-xs tabular-nums text-amber-200/70">
                      {formatShortDate(contract.expiryDate)} · {daysUntil(contract.expiryDate)} days
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <CorporateSection
        title="Contract Register"
        subtitle="Corporate contracts, MSAs, leases, and key commercial agreements."
        actions={
          <button type="button" className={corporatePrimaryButtonClass()} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Contract
          </button>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <CorporateFieldLabel>Search</CorporateFieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                className={`${corporateInputClass()} pl-9`}
                placeholder="Contract, supplier, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <CorporateFieldLabel>Type</CorporateFieldLabel>
            <select
              className={corporateInputClass()}
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as (typeof CORPORATE_CONTRACT_TYPES)[number] | "all")
              }
            >
              <option value="all">All</option>
              {CORPORATE_CONTRACT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <CorporateFieldLabel>Status</CorporateFieldLabel>
            <select
              className={corporateInputClass()}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as CorporateContract["status"] | "all")
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring</option>
              <option value="expired">Expired</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-white/45">
                    No contracts match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((contract) => (
                  <tr key={contract.id} className="border-b border-white/8 text-white/85">
                    <td className="px-4 py-3 font-medium text-white">{contract.name}</td>
                    <td className="px-4 py-3">{contract.supplier}</td>
                    <td className="px-4 py-3">{contract.type}</td>
                    <td className="px-4 py-3">{contract.owner}</td>
                    <td className="px-4 py-3 tabular-nums">{formatShortDate(contract.startDate)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatShortDate(contract.expiryDate)}
                    </td>
                    <td className="px-4 py-3">{contract.value || "—"}</td>
                    <td className="px-4 py-3">
                      <CorporateStatusPill className={statusPillClass(contract.status)}>
                        {formatStatusLabel(contract.status)}
                      </CorporateStatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className={actionClass("sky")}
                          onClick={() => openContract(contract.id)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className={actionClass("violet")}
                          onClick={() => openEdit(contract)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={actionClass("emerald")}
                          onClick={() => renewContract(contract.id)}
                        >
                          Renew
                        </button>
                        <button
                          type="button"
                          className={actionClass("amber")}
                          onClick={() => archiveContract(contract.id)}
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          className={actionClass("rose")}
                          onClick={() => handleDelete(contract.id)}
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
        <ContractDetailPanel
          contract={selected}
          activity={store.activity}
          tab={panelTab}
          onTab={setPanelTab}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            openEdit(selected);
            setSelectedId(null);
          }}
          onRenew={() => renewContract(selected.id)}
          onArchive={() => {
            archiveContract(selected.id);
            setSelectedId(null);
          }}
        />
      ) : null}

      {form ? (
        <Modal title={form.id ? "Edit Contract" : "Add Contract"} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contract name">
              <input
                className={corporateInputClass()}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Supplier">
              <input
                className={corporateInputClass()}
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <select
                className={corporateInputClass()}
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as ContractFormState["type"] })
                }
              >
                {CORPORATE_CONTRACT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Owner">
              <input
                className={corporateInputClass()}
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </Field>
            <Field label="Start date">
              <input
                className={corporateInputClass()}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Expiry date">
              <input
                className={corporateInputClass()}
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </Field>
            <Field label="Value">
              <input
                className={corporateInputClass()}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="e.g. €84,000 / year"
              />
            </Field>
            <Field label="Status">
              <select
                className={corporateInputClass()}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CorporateContract["status"] })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Summary">
                <textarea
                  className={corporateInputClass()}
                  rows={2}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Parties">
                <textarea
                  className={corporateInputClass()}
                  rows={2}
                  value={form.parties}
                  onChange={(e) => setForm({ ...form, parties: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Renewal notes">
                <textarea
                  className={corporateInputClass()}
                  rows={2}
                  value={form.renewalNotes}
                  onChange={(e) => setForm({ ...form, renewalNotes: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Documents">
              <input
                className={corporateInputClass()}
                value={form.documents}
                onChange={(e) => setForm({ ...form, documents: e.target.value })}
                placeholder="filename.pdf"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  className={corporateInputClass()}
                  rows={2}
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
              Save Contract
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
