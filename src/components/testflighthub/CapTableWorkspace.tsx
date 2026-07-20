"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Eye, Pencil, PieChart, Plus, Trash2, X } from "lucide-react";

import {
  ownershipPercent,
  type CorporateCapital,
  type CorporateOptionPool,
  type CorporateShareClass,
  type CorporateShareholder,
} from "@/lib/corporate-data";
import { totalIssuedShares } from "@/lib/corporate-dashboard-data";
import {
  deleteShareholder,
  transferShares,
  updateCapital,
  updateOptionPool,
  upsertShareholder,
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

const SHARE_CLASSES: CorporateShareClass[] = ["Ordinary", "Preference", "Options"];

type ShareholderFormState = {
  id?: string;
  company: string;
  shareholder: string;
  shareClass: CorporateShareClass;
  shares: string;
  price: string;
  issueDate: string;
  notes: string;
};

type TransferFormState = {
  fromId: string;
  toId: string;
  shares: string;
};

function formatCorporateDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatShares(value: number) {
  return value.toLocaleString();
}

function emptyShareholderForm(): ShareholderFormState {
  return {
    company: "Nakama Ventures SL",
    shareholder: "",
    shareClass: "Ordinary",
    shares: "",
    price: "",
    issueDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function shareholderToForm(row: CorporateShareholder): ShareholderFormState {
  return {
    id: row.id,
    company: row.company,
    shareholder: row.shareholder,
    shareClass: row.shareClass,
    shares: String(row.shares),
    price: row.price,
    issueDate: row.issueDate,
    notes: row.notes,
  };
}

function isCapTableActivity(label: string) {
  const lower = label.toLowerCase();
  return (
    lower.includes("shareholder") ||
    lower.includes("share transfer") ||
    lower.includes("option pool") ||
    lower.includes("share capital")
  );
}

function actionClass(tone: "sky" | "violet" | "rose") {
  const map = {
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    violet: "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
  } as const;
  return `inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${map[tone]}`;
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-1 text-sm text-white/80">{value || "—"}</div>
    </div>
  );
}

function ShareholderDetailPanel({
  row,
  totalShares,
  onClose,
  onEdit,
  onDelete,
}: {
  row: CorporateShareholder;
  totalShares: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-white/15 bg-[#0b1524] shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{row.shareholder}</h3>
              <p className="mt-1 text-sm text-white/50">
                {row.company} · {row.shareClass}
              </p>
              <div className="mt-2">
                <CorporateStatusPill className="border-sky-400/30 bg-sky-500/15 text-sky-200">
                  {ownershipPercent(row.shares, totalShares)}% ownership
                </CorporateStatusPill>
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
            <Info label="Share class" value={row.shareClass} />
            <Info label="Shares" value={formatShares(row.shares)} />
            <Info label="Issue price" value={row.price} />
            <Info label="Issue date" value={formatCorporateDate(row.issueDate)} />
            <div className="sm:col-span-2">
              <Info label="Notes" value={row.notes || "No notes recorded."} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" className={corporatePrimaryButtonClass()} onClick={onEdit}>
            Edit
          </button>
          <button type="button" className={actionClass("rose")} onClick={onDelete}>
            Delete
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function CapTableWorkspace() {
  const store = useCorporateMockStore();
  const [viewId, setViewId] = useState<string | null>(null);
  const [shareholderForm, setShareholderForm] = useState<ShareholderFormState | null>(null);
  const [transferForm, setTransferForm] = useState<TransferFormState | null>(null);
  const [optionPoolForm, setOptionPoolForm] = useState<CorporateOptionPool | null>(null);
  const [capitalForm, setCapitalForm] = useState<CorporateCapital | null>(null);

  const totalShares = useMemo(
    () => totalIssuedShares(store.shareholders),
    [store.shareholders],
  );

  const history = useMemo(
    () => store.activity.filter((item) => isCapTableActivity(item.label)),
    [store.activity],
  );

  const viewed = store.shareholders.find((row) => row.id === viewId) ?? null;

  function openAddShareholder() {
    setShareholderForm(emptyShareholderForm());
  }

  function openEditShareholder(row: CorporateShareholder) {
    setViewId(null);
    setShareholderForm(shareholderToForm(row));
  }

  function saveShareholder() {
    if (!shareholderForm?.shareholder.trim()) return;
    const shares = Number.parseInt(shareholderForm.shares, 10);
    if (!Number.isFinite(shares) || shares < 0) return;
    upsertShareholder({
      id: shareholderForm.id,
      company: shareholderForm.company.trim(),
      shareholder: shareholderForm.shareholder.trim(),
      shareClass: shareholderForm.shareClass,
      shares,
      price: shareholderForm.price.trim(),
      issueDate: shareholderForm.issueDate,
      notes: shareholderForm.notes.trim(),
    });
    setShareholderForm(null);
  }

  function handleDelete(id: string) {
    deleteShareholder(id);
    if (viewId === id) setViewId(null);
  }

  function openTransfer() {
    const first = store.shareholders[0];
    const second = store.shareholders[1];
    setTransferForm({
      fromId: first?.id ?? "",
      toId: second?.id ?? first?.id ?? "",
      shares: "",
    });
  }

  function saveTransfer() {
    if (!transferForm) return;
    const shares = Number.parseInt(transferForm.shares, 10);
    if (!Number.isFinite(shares) || shares <= 0) return;
    transferShares(transferForm.fromId, transferForm.toId, shares);
    setTransferForm(null);
  }

  function openOptionPool() {
    setOptionPoolForm({ ...store.optionPool });
  }

  function saveOptionPool() {
    if (!optionPoolForm) return;
    updateOptionPool({
      authorised: optionPoolForm.authorised,
      issued: optionPoolForm.issued,
      reserved: optionPoolForm.reserved,
    });
    setOptionPoolForm(null);
  }

  function openCapital() {
    setCapitalForm({ ...store.capital });
  }

  function saveCapital() {
    if (!capitalForm) return;
    updateCapital({
      authorisedShareCapital: capitalForm.authorisedShareCapital.trim(),
      issuedShareCapital: capitalForm.issuedShareCapital.trim(),
      currency: capitalForm.currency.trim(),
    });
    setCapitalForm(null);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
            <PieChart className="h-5 w-5 text-sky-200" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Cap Table</h2>
            <p className="mt-1 text-sm text-white/65">
              Manage shareholders, equity ownership, and capital structure.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CorporateKpiTile label="Issued Shares" value={formatShares(totalShares)} />
        <CorporateKpiTile label="Shareholders" value={store.shareholders.length} />
        <CorporateKpiTile
          label="Option Pool"
          value={formatShares(store.optionPool.reserved)}
          hint={`${formatShares(store.optionPool.authorised)} authorised · ${formatShares(store.optionPool.issued)} issued`}
        />
        <CorporateKpiTile
          label="Last Updated"
          value={formatCorporateDate(store.optionPool.lastUpdated)}
        />
      </section>

      <CorporateSection
        title="Shareholder Register"
        subtitle="Current equity ownership by shareholder and share class."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={corporatePrimaryButtonClass()} onClick={openAddShareholder}>
              <Plus className="h-3.5 w-3.5" />
              Add Shareholder
            </button>
            <button type="button" className={corporateSecondaryButtonClass()} onClick={openAddShareholder}>
              Issue Shares
            </button>
            <button
              type="button"
              className={corporateSecondaryButtonClass(store.shareholders.length < 2)}
              onClick={openTransfer}
              disabled={store.shareholders.length < 2}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transfer Shares
            </button>
            <button type="button" className={corporateSecondaryButtonClass()} onClick={openOptionPool}>
              Edit Option Pool
            </button>
            <button type="button" className={corporateSecondaryButtonClass()} onClick={openCapital}>
              Edit Company Capital
            </button>
          </div>
        }
      >
        {store.shareholders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center">
            <p className="text-sm font-medium text-white/70">No shareholders on the cap table yet.</p>
            <p className="mt-1 text-sm text-white/45">
              Add a shareholder or issue shares to start building the register.
            </p>
            <button
              type="button"
              className={`${corporatePrimaryButtonClass()} mt-4`}
              onClick={openAddShareholder}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Shareholder
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  <th className="px-4 py-3 font-semibold sm:px-5">Shareholder</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Share Class</th>
                  <th className="px-4 py-3 text-right font-semibold sm:px-5">Shares</th>
                  <th className="px-4 py-3 text-right font-semibold sm:px-5">Ownership %</th>
                  <th className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {store.shareholders.map((row) => (
                  <tr key={row.id} className="border-b border-white/8 text-white/85">
                    <td className="px-4 py-3 font-medium text-white sm:px-5">{row.shareholder}</td>
                    <td className="px-4 py-3 sm:px-5">{row.shareClass}</td>
                    <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                      {formatShares(row.shares)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                      {ownershipPercent(row.shares, totalShares)}%
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className={actionClass("sky")}
                          onClick={() => setViewId(row.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          className={actionClass("violet")}
                          onClick={() => openEditShareholder(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={actionClass("rose")}
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-white/[0.04] text-white">
                  <td className="px-4 py-3 font-semibold sm:px-5">Total</td>
                  <td className="px-4 py-3 sm:px-5" />
                  <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">
                    {formatShares(totalShares)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">
                    {totalShares > 0 ? "100.0" : "0.0"}%
                  </td>
                  <td className="px-4 py-3 sm:px-5" />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Info label="Authorised share capital" value={store.capital.authorisedShareCapital} />
          <Info label="Issued share capital" value={store.capital.issuedShareCapital} />
          <Info label="Currency" value={store.capital.currency} />
        </div>
      </CorporateSection>

      <CorporateSection title="Cap Table History" subtitle="Share, option pool, and capital changes.">
        {history.length === 0 ? (
          <p className="text-sm text-white/45">No cap table activity recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/45">{item.detail}</p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-white/40">
                  {formatCorporateDate(item.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CorporateSection>

      {viewed ? (
        <ShareholderDetailPanel
          row={viewed}
          totalShares={totalShares}
          onClose={() => setViewId(null)}
          onEdit={() => openEditShareholder(viewed)}
          onDelete={() => handleDelete(viewed.id)}
        />
      ) : null}

      {shareholderForm ? (
        <Modal
          title={shareholderForm.id ? "Edit Shareholder" : "Add Shareholder"}
          onClose={() => setShareholderForm(null)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CorporateFieldLabel>Shareholder name</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                value={shareholderForm.shareholder}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current ? { ...current, shareholder: e.target.value } : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Company</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                value={shareholderForm.company}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current ? { ...current, company: e.target.value } : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Share class</CorporateFieldLabel>
              <select
                className={corporateInputClass()}
                value={shareholderForm.shareClass}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current
                      ? { ...current, shareClass: e.target.value as CorporateShareClass }
                      : current,
                  )
                }
              >
                {SHARE_CLASSES.map((shareClass) => (
                  <option key={shareClass} value={shareClass}>
                    {shareClass}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <CorporateFieldLabel>Shares</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                inputMode="numeric"
                value={shareholderForm.shares}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current ? { ...current, shares: e.target.value } : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Issue price</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                value={shareholderForm.price}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current ? { ...current, price: e.target.value } : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Issue date</CorporateFieldLabel>
              <input
                type="date"
                className={corporateInputClass()}
                value={shareholderForm.issueDate}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current ? { ...current, issueDate: e.target.value } : current,
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <CorporateFieldLabel>Notes</CorporateFieldLabel>
              <textarea
                className={`${corporateInputClass()} min-h-[88px] resize-y`}
                value={shareholderForm.notes}
                onChange={(e) =>
                  setShareholderForm((current) =>
                    current ? { ...current, notes: e.target.value } : current,
                  )
                }
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={corporatePrimaryButtonClass()} onClick={saveShareholder}>
              Save
            </button>
            <button
              type="button"
              className={corporateSecondaryButtonClass()}
              onClick={() => setShareholderForm(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}

      {transferForm ? (
        <Modal title="Transfer Shares" onClose={() => setTransferForm(null)}>
          <div className="grid gap-4">
            <div>
              <CorporateFieldLabel>From shareholder</CorporateFieldLabel>
              <select
                className={corporateInputClass()}
                value={transferForm.fromId}
                onChange={(e) =>
                  setTransferForm((current) =>
                    current ? { ...current, fromId: e.target.value } : current,
                  )
                }
              >
                {store.shareholders.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.shareholder} ({formatShares(row.shares)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <CorporateFieldLabel>To shareholder</CorporateFieldLabel>
              <select
                className={corporateInputClass()}
                value={transferForm.toId}
                onChange={(e) =>
                  setTransferForm((current) =>
                    current ? { ...current, toId: e.target.value } : current,
                  )
                }
              >
                {store.shareholders.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.shareholder} ({formatShares(row.shares)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <CorporateFieldLabel>Shares to transfer</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                inputMode="numeric"
                value={transferForm.shares}
                onChange={(e) =>
                  setTransferForm((current) =>
                    current ? { ...current, shares: e.target.value } : current,
                  )
                }
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={corporatePrimaryButtonClass()} onClick={saveTransfer}>
              Transfer
            </button>
            <button
              type="button"
              className={corporateSecondaryButtonClass()}
              onClick={() => setTransferForm(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}

      {optionPoolForm ? (
        <Modal title="Edit Option Pool" onClose={() => setOptionPoolForm(null)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <CorporateFieldLabel>Authorised</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                inputMode="numeric"
                value={optionPoolForm.authorised}
                onChange={(e) =>
                  setOptionPoolForm((current) =>
                    current
                      ? { ...current, authorised: Number.parseInt(e.target.value, 10) || 0 }
                      : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Issued</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                inputMode="numeric"
                value={optionPoolForm.issued}
                onChange={(e) =>
                  setOptionPoolForm((current) =>
                    current
                      ? { ...current, issued: Number.parseInt(e.target.value, 10) || 0 }
                      : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Reserved</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                inputMode="numeric"
                value={optionPoolForm.reserved}
                onChange={(e) =>
                  setOptionPoolForm((current) =>
                    current
                      ? { ...current, reserved: Number.parseInt(e.target.value, 10) || 0 }
                      : current,
                  )
                }
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={corporatePrimaryButtonClass()} onClick={saveOptionPool}>
              Save
            </button>
            <button
              type="button"
              className={corporateSecondaryButtonClass()}
              onClick={() => setOptionPoolForm(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}

      {capitalForm ? (
        <Modal title="Edit Company Capital" onClose={() => setCapitalForm(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <CorporateFieldLabel>Authorised share capital</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                value={capitalForm.authorisedShareCapital}
                onChange={(e) =>
                  setCapitalForm((current) =>
                    current
                      ? { ...current, authorisedShareCapital: e.target.value }
                      : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Issued share capital</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                value={capitalForm.issuedShareCapital}
                onChange={(e) =>
                  setCapitalForm((current) =>
                    current ? { ...current, issuedShareCapital: e.target.value } : current,
                  )
                }
              />
            </div>
            <div>
              <CorporateFieldLabel>Currency</CorporateFieldLabel>
              <input
                className={corporateInputClass()}
                value={capitalForm.currency}
                onChange={(e) =>
                  setCapitalForm((current) =>
                    current ? { ...current, currency: e.target.value } : current,
                  )
                }
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={corporatePrimaryButtonClass()} onClick={saveCapital}>
              Save
            </button>
            <button
              type="button"
              className={corporateSecondaryButtonClass()}
              onClick={() => setCapitalForm(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
