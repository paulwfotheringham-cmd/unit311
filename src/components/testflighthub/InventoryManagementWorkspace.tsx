"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";

import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITION_LABELS,
  INVENTORY_CONDITIONS,
  INVENTORY_PANEL_TABS,
  INVENTORY_STATUS_LABELS,
  INVENTORY_STATUSES,
  emptyAssignment,
  inventoryStatusClass,
  isWithinDays,
  type InventoryAsset,
  type InventoryAssignment,
  type InventoryCondition,
  type InventoryPanelTab,
  type InventoryStatus,
} from "@/lib/inventory-data";
import {
  addInventoryDocument,
  addInventoryNote,
  addInventoryService,
  archiveInventoryAsset,
  assignInventoryAsset,
  completeInventoryService,
  deleteInventoryAsset,
  duplicateInventoryAsset,
  isoDaysFromNow,
  retireInventoryAsset,
  returnInventoryAsset,
  scheduleInventoryService,
  transferInventoryAsset,
  upsertInventoryAsset,
} from "@/lib/inventory-mock-store";
import { useInventoryMockStore } from "./useInventoryMockStore";
import {
  InventoryFieldLabel,
  InventoryKpiTile,
  InventorySection,
  InventoryStatusPill,
  inventoryInputClass,
  inventoryPrimaryButtonClass,
  inventorySecondaryButtonClass,
} from "./inventory-ui";

type AssetFormState = {
  id?: string;
  assetTag: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiry: string;
  currentValue: string;
  location: string;
  status: InventoryStatus;
  condition: InventoryCondition;
  department: string;
  nextService: string;
  certificationExpiry: string;
};

type AssignmentFormState = InventoryAssignment;

const LOCATIONS = ["Barcelona", "Porto", "Oxford"] as const;
const DEPARTMENTS = [
  "Operations",
  "Field Operations",
  "Technical",
  "Logistics",
  "Sales",
  "Finance",
] as const;

const emptyAssetForm = (): AssetFormState => ({
  assetTag: "",
  name: "",
  category: "Other",
  manufacturer: "",
  model: "",
  serialNumber: "",
  purchaseDate: isoDaysFromNow(0),
  purchaseCost: "",
  warrantyExpiry: "",
  currentValue: "",
  location: "Barcelona",
  status: "operational",
  condition: "good",
  department: "",
  nextService: "",
  certificationExpiry: "",
});

function formatShortDate(dateKey: string) {
  if (!dateKey) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
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
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={`w-full rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ${wide ? "max-w-3xl" : "max-w-2xl"}`}
      >
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <InventoryFieldLabel>{label}</InventoryFieldLabel>
      {children}
    </div>
  );
}

function AssignmentFields({
  value,
  onChange,
}: {
  value: AssignmentFormState;
  onChange: (next: AssignmentFormState) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Employee">
        <input
          className={inventoryInputClass()}
          value={value.employee}
          onChange={(e) => onChange({ ...value, employee: e.target.value })}
          placeholder="Full name"
        />
      </Field>
      <Field label="Department">
        <select
          className={inventoryInputClass()}
          value={value.department}
          onChange={(e) => onChange({ ...value, department: e.target.value })}
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Office">
        <input
          className={inventoryInputClass()}
          value={value.office}
          onChange={(e) => onChange({ ...value, office: e.target.value })}
          placeholder="Office or site"
        />
      </Field>
      <Field label="Project">
        <input
          className={inventoryInputClass()}
          value={value.project}
          onChange={(e) => onChange({ ...value, project: e.target.value })}
          placeholder="Project or programme"
        />
      </Field>
      <Field label="Issue date">
        <input
          className={inventoryInputClass()}
          type="date"
          value={value.issueDate}
          onChange={(e) => onChange({ ...value, issueDate: e.target.value })}
        />
      </Field>
      <Field label="Expected return">
        <input
          className={inventoryInputClass()}
          type="date"
          value={value.expectedReturn}
          onChange={(e) => onChange({ ...value, expectedReturn: e.target.value })}
        />
      </Field>
    </div>
  );
}

function AssetDetailPanel({
  asset,
  tab,
  onTab,
  onClose,
  onDuplicate,
  onArchive,
  onDelete,
  onRetire,
}: {
  asset: InventoryAsset;
  tab: InventoryPanelTab;
  onTab: (tab: InventoryPanelTab) => void;
  onClose: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onRetire: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AssetFormState>(() => ({
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    category: asset.category,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serialNumber,
    purchaseDate: asset.purchaseDate,
    purchaseCost: asset.purchaseCost,
    warrantyExpiry: asset.warrantyExpiry,
    currentValue: asset.currentValue,
    location: asset.location,
    status: asset.status,
    condition: asset.condition,
    department: asset.department,
    nextService: asset.nextService,
    certificationExpiry: asset.certificationExpiry,
  }));
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentFormState>(asset.assignment);
  const [serviceForm, setServiceForm] = useState({
    type: "service" as const,
    date: isoDaysFromNow(0),
    nextDue: isoDaysFromNow(90),
    provider: "",
    outcome: "",
    notes: "",
  });
  const [docForm, setDocForm] = useState({ kind: "manual" as const, name: "" });
  const [noteForm, setNoteForm] = useState({
    kind: "operational" as const,
    text: "",
    author: "",
  });
  const [showOverflow, setShowOverflow] = useState(false);

  function cancelEdit() {
    setDraft({
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      category: asset.category,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate,
      purchaseCost: asset.purchaseCost,
      warrantyExpiry: asset.warrantyExpiry,
      currentValue: asset.currentValue,
      location: asset.location,
      status: asset.status,
      condition: asset.condition,
      department: asset.department,
      nextService: asset.nextService,
      certificationExpiry: asset.certificationExpiry,
    });
    setEditing(false);
  }

  function saveOverview() {
    upsertInventoryAsset({
      ...draft,
      id: asset.id,
      assignedTo: asset.assignedTo,
      assignment: asset.assignment,
      services: asset.services,
      documents: asset.documents,
      history: asset.history,
      notes: asset.notes,
      archived: asset.archived,
    });
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-white/15 bg-[#0b1524] shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
                {asset.assetTag}
              </p>
              <h3 className="text-lg font-semibold text-white">{asset.name}</h3>
              <p className="mt-1 text-sm text-white/50">
                {asset.manufacturer} {asset.model} · {asset.location}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <InventoryStatusPill className={inventoryStatusClass(asset.status)}>
                  {INVENTORY_STATUS_LABELS[asset.status]}
                </InventoryStatusPill>
                {asset.assignedTo ? (
                  <InventoryStatusPill className="border-sky-400/30 bg-sky-500/10 text-sky-100">
                    {asset.assignedTo}
                  </InventoryStatusPill>
                ) : (
                  <InventoryStatusPill className="border-white/15 bg-white/5 text-white/55">
                    Unassigned
                  </InventoryStatusPill>
                )}
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
            {INVENTORY_PANEL_TABS.map((item) => (
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
          {tab === "Overview" ? (
            editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Asset tag">
                  <input
                    className={inventoryInputClass()}
                    value={draft.assetTag}
                    onChange={(e) => setDraft({ ...draft, assetTag: e.target.value })}
                  />
                </Field>
                <Field label="Name">
                  <input
                    className={inventoryInputClass()}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </Field>
                <Field label="Category">
                  <select
                    className={inventoryInputClass()}
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  >
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Location">
                  <select
                    className={inventoryInputClass()}
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Manufacturer">
                  <input
                    className={inventoryInputClass()}
                    value={draft.manufacturer}
                    onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })}
                  />
                </Field>
                <Field label="Model">
                  <input
                    className={inventoryInputClass()}
                    value={draft.model}
                    onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  />
                </Field>
                <Field label="Serial number">
                  <input
                    className={inventoryInputClass()}
                    value={draft.serialNumber}
                    onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })}
                  />
                </Field>
                <Field label="Department">
                  <input
                    className={inventoryInputClass()}
                    value={draft.department}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                  />
                </Field>
                <Field label="Purchase date">
                  <input
                    className={inventoryInputClass()}
                    type="date"
                    value={draft.purchaseDate}
                    onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })}
                  />
                </Field>
                <Field label="Purchase cost">
                  <input
                    className={inventoryInputClass()}
                    value={draft.purchaseCost}
                    onChange={(e) => setDraft({ ...draft, purchaseCost: e.target.value })}
                  />
                </Field>
                <Field label="Current value">
                  <input
                    className={inventoryInputClass()}
                    value={draft.currentValue}
                    onChange={(e) => setDraft({ ...draft, currentValue: e.target.value })}
                  />
                </Field>
                <Field label="Warranty expiry">
                  <input
                    className={inventoryInputClass()}
                    type="date"
                    value={draft.warrantyExpiry}
                    onChange={(e) => setDraft({ ...draft, warrantyExpiry: e.target.value })}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={inventoryInputClass()}
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value as InventoryStatus })
                    }
                  >
                    {INVENTORY_STATUSES.filter((s) => s !== "retired").map((s) => (
                      <option key={s} value={s}>
                        {INVENTORY_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Condition">
                  <select
                    className={inventoryInputClass()}
                    value={draft.condition}
                    onChange={(e) =>
                      setDraft({ ...draft, condition: e.target.value as InventoryCondition })
                    }
                  >
                    {INVENTORY_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {INVENTORY_CONDITION_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Next service">
                  <input
                    className={inventoryInputClass()}
                    type="date"
                    value={draft.nextService}
                    onChange={(e) => setDraft({ ...draft, nextService: e.target.value })}
                  />
                </Field>
                <Field label="Certification expiry">
                  <input
                    className={inventoryInputClass()}
                    type="date"
                    value={draft.certificationExpiry}
                    onChange={(e) =>
                      setDraft({ ...draft, certificationExpiry: e.target.value })
                    }
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Category" value={asset.category} />
                <Info label="Location" value={asset.location} />
                <Info label="Manufacturer" value={asset.manufacturer} />
                <Info label="Model" value={asset.model} />
                <Info label="Serial number" value={asset.serialNumber} />
                <Info label="Department" value={asset.department} />
                <Info label="Purchase date" value={formatShortDate(asset.purchaseDate)} />
                <Info label="Purchase cost" value={asset.purchaseCost} />
                <Info label="Current value" value={asset.currentValue} />
                <Info label="Warranty expiry" value={formatShortDate(asset.warrantyExpiry)} />
                <Info label="Condition" value={INVENTORY_CONDITION_LABELS[asset.condition]} />
                <Info label="Next service" value={formatShortDate(asset.nextService)} />
                <Info
                  label="Certification expiry"
                  value={formatShortDate(asset.certificationExpiry)}
                />
              </div>
            )
          ) : null}

          {tab === "Assignment" ? (
            <div className="space-y-4">
              <p className="text-sm text-white/50">
                {asset.assignedTo
                  ? `Currently assigned to ${asset.assignedTo}.`
                  : "This asset is in stock and available for assignment."}
              </p>
              <AssignmentFields value={assignmentDraft} onChange={setAssignmentDraft} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={inventoryPrimaryButtonClass()}
                  onClick={() => assignInventoryAsset(asset.id, assignmentDraft)}
                >
                  Assign
                </button>
                <button
                  type="button"
                  className={actionClass("violet")}
                  onClick={() => transferInventoryAsset(asset.id, assignmentDraft)}
                >
                  Transfer
                </button>
                <button
                  type="button"
                  className={actionClass("amber")}
                  onClick={() => {
                    returnInventoryAsset(asset.id);
                    setAssignmentDraft(emptyAssignment());
                  }}
                >
                  Return
                </button>
              </div>
            </div>
          ) : null}

          {tab === "Maintenance" ? (
            <div className="space-y-4">
              {asset.services.length === 0 ? (
                <p className="text-sm text-white/45">No service records for this asset yet.</p>
              ) : (
                <ul className="space-y-2">
                  {asset.services.map((svc) => (
                    <li key={svc.id} className="rounded-xl border border-white/10 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium capitalize text-white">
                            {svc.type}
                          </p>
                          <p className="text-xs text-white/50">
                            {svc.provider} · {formatShortDate(svc.date)}
                          </p>
                        </div>
                        <InventoryStatusPill
                          className={
                            svc.status === "completed"
                              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                              : svc.status === "overdue"
                                ? "border-rose-400/30 bg-rose-500/15 text-rose-200"
                                : "border-amber-400/30 bg-amber-500/15 text-amber-200"
                          }
                        >
                          {svc.status}
                        </InventoryStatusPill>
                      </div>
                      <p className="mt-1 text-xs text-white/55">{svc.outcome || svc.notes}</p>
                      {svc.status !== "completed" ? (
                        <button
                          type="button"
                          className={`${actionClass("emerald")} mt-2`}
                          onClick={() =>
                            completeInventoryService(asset.id, svc.id, "Completed on site")
                          }
                        >
                          Mark complete
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-sm font-medium text-white">Add service record</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Type">
                    <select
                      className={inventoryInputClass()}
                      value={serviceForm.type}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          type: e.target.value as typeof serviceForm.type,
                        })
                      }
                    >
                      <option value="service">Service</option>
                      <option value="inspection">Inspection</option>
                      <option value="calibration">Calibration</option>
                      <option value="repair">Repair</option>
                      <option value="certification">Certification</option>
                    </select>
                  </Field>
                  <Field label="Provider">
                    <input
                      className={inventoryInputClass()}
                      value={serviceForm.provider}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, provider: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Date">
                    <input
                      className={inventoryInputClass()}
                      type="date"
                      value={serviceForm.date}
                      onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })}
                    />
                  </Field>
                  <Field label="Next due">
                    <input
                      className={inventoryInputClass()}
                      type="date"
                      value={serviceForm.nextDue}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, nextDue: e.target.value })
                      }
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Outcome / notes">
                      <textarea
                        className={inventoryInputClass()}
                        rows={2}
                        value={serviceForm.outcome}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, outcome: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={inventoryPrimaryButtonClass()}
                    onClick={() => {
                      addInventoryService(asset.id, serviceForm);
                      setServiceForm({
                        type: "service",
                        date: isoDaysFromNow(0),
                        nextDue: isoDaysFromNow(90),
                        provider: "",
                        outcome: "",
                        notes: "",
                      });
                    }}
                  >
                    Add record
                  </button>
                  <button
                    type="button"
                    className={actionClass("violet")}
                    onClick={() => {
                      scheduleInventoryService(asset.id, serviceForm);
                      setServiceForm({
                        type: "service",
                        date: isoDaysFromNow(7),
                        nextDue: isoDaysFromNow(90),
                        provider: "",
                        outcome: "",
                        notes: "",
                      });
                    }}
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "Documents" ? (
            <div className="space-y-4">
              {asset.documents.length === 0 ? (
                <p className="text-sm text-white/45">No documents on file for this asset.</p>
              ) : (
                <ul className="space-y-2">
                  {asset.documents.map((doc) => (
                    <li key={doc.id} className="rounded-xl border border-white/10 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">{doc.name}</p>
                          <p className="text-xs capitalize text-white/45">{doc.kind}</p>
                        </div>
                        <span className="text-[11px] tabular-nums text-white/40">
                          {formatShortDate(doc.uploadedAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-xl border border-white/10 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Document type">
                    <select
                      className={inventoryInputClass()}
                      value={docForm.kind}
                      onChange={(e) =>
                        setDocForm({ ...docForm, kind: e.target.value as typeof docForm.kind })
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="warranty">Warranty</option>
                      <option value="invoice">Invoice</option>
                      <option value="certificate">Certificate</option>
                      <option value="inspection">Inspection</option>
                      <option value="photo">Photo</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="File name">
                    <input
                      className={inventoryInputClass()}
                      value={docForm.name}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                      placeholder="document.pdf"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className={`${inventoryPrimaryButtonClass()} mt-3`}
                  onClick={() => {
                    if (!docForm.name.trim()) return;
                    addInventoryDocument(asset.id, docForm);
                    setDocForm({ kind: "manual", name: "" });
                  }}
                >
                  Add document
                </button>
              </div>
            </div>
          ) : null}

          {tab === "History" ? (
            <ul className="space-y-2">
              {asset.history.length === 0 ? (
                <li className="text-sm text-white/45">No history recorded for this asset.</li>
              ) : (
                asset.history.map((item) => (
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
            <div className="space-y-4">
              {asset.notes.length === 0 ? (
                <p className="text-sm text-white/45">No notes for this asset yet.</p>
              ) : (
                <ul className="space-y-2">
                  {asset.notes.map((note) => (
                    <li key={note.id} className="rounded-xl border border-white/10 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium capitalize text-white">{note.kind}</p>
                        <span className="text-[11px] tabular-nums text-white/40">
                          {formatShortDate(note.at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {note.author} · {note.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-xl border border-white/10 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Note type">
                    <select
                      className={inventoryInputClass()}
                      value={noteForm.kind}
                      onChange={(e) =>
                        setNoteForm({ ...noteForm, kind: e.target.value as typeof noteForm.kind })
                      }
                    >
                      <option value="operational">Operational</option>
                      <option value="damage">Damage</option>
                      <option value="issue">Issue</option>
                    </select>
                  </Field>
                  <Field label="Author">
                    <input
                      className={inventoryInputClass()}
                      value={noteForm.author}
                      onChange={(e) => setNoteForm({ ...noteForm, author: e.target.value })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Note">
                      <textarea
                        className={inventoryInputClass()}
                        rows={3}
                        value={noteForm.text}
                        onChange={(e) => setNoteForm({ ...noteForm, text: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${inventoryPrimaryButtonClass()} mt-3`}
                  onClick={() => {
                    if (!noteForm.text.trim()) return;
                    addInventoryNote(asset.id, noteForm);
                    setNoteForm({ kind: "operational", text: "", author: "" });
                  }}
                >
                  Add note
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          {tab === "Overview" && editing ? (
            <>
              <button type="button" className={inventoryPrimaryButtonClass()} onClick={saveOverview}>
                Save
              </button>
              <button type="button" className={inventorySecondaryButtonClass()} onClick={cancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {tab === "Overview" ? (
                <button
                  type="button"
                  className={inventoryPrimaryButtonClass()}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              ) : null}
              <button type="button" className={actionClass("violet")} onClick={onDuplicate}>
                <Copy className="h-3 w-3" />
                Duplicate
              </button>
              {!asset.archived ? (
                <>
                  <button type="button" className={actionClass("amber")} onClick={onArchive}>
                    Archive
                  </button>
                  <button type="button" className={actionClass("rose")} onClick={onRetire}>
                    Retire
                  </button>
                </>
              ) : null}
              <div className="relative ml-auto">
                <button
                  type="button"
                  className={inventorySecondaryButtonClass()}
                  onClick={() => setShowOverflow((v) => !v)}
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showOverflow ? (
                  <div className="absolute bottom-full right-0 mb-2 w-40 rounded-xl border border-white/15 bg-[#0b1524] p-1 shadow-xl">
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-rose-200 hover:bg-white/5"
                      onClick={() => {
                        setShowOverflow(false);
                        onDelete();
                      }}
                    >
                      Delete asset
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function InventoryManagementWorkspace() {
  const store = useInventoryMockStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<InventoryPanelTab>("Overview");
  const [assetForm, setAssetForm] = useState<AssetFormState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{ assetId: string; mode: "assign" | "transfer" } | null>(
    null,
  );
  const [assignForm, setAssignForm] = useState<AssignmentFormState>(emptyAssignment());
  const [retireModal, setRetireModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeAssets = useMemo(
    () => store.assets.filter((a) => !a.archived),
    [store.assets],
  );

  const manufacturers = useMemo(
    () => [...new Set(activeAssets.map((a) => a.manufacturer).filter(Boolean))].sort(),
    [activeAssets],
  );
  const models = useMemo(
    () => [...new Set(activeAssets.map((a) => a.model).filter(Boolean))].sort(),
    [activeAssets],
  );
  const assignees = useMemo(
    () => [...new Set(activeAssets.map((a) => a.assignedTo).filter(Boolean))].sort(),
    [activeAssets],
  );

  const kpis = useMemo(() => {
    const operational = activeAssets.filter((a) => a.status === "operational").length;
    const maintenance = activeAssets.filter((a) => a.status === "maintenance").length;
    const outOfService = activeAssets.filter((a) => a.status === "out_of_service").length;
    const assigned = activeAssets.filter((a) => a.assignedTo).length;
    const unassigned = activeAssets.filter((a) => !a.assignedTo).length;
    const dueService = activeAssets.filter((a) => isWithinDays(a.nextService, 60)).length;
    const expiringCerts = activeAssets.filter((a) =>
      isWithinDays(a.certificationExpiry, 60),
    ).length;
    return {
      total: activeAssets.length,
      operational,
      maintenance,
      outOfService,
      assigned,
      unassigned,
      dueService,
      expiringCerts,
    };
  }, [activeAssets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeAssets.filter((asset) => {
      if (categoryFilter !== "all" && asset.category !== categoryFilter) return false;
      if (locationFilter !== "all" && asset.location !== locationFilter) return false;
      if (statusFilter !== "all" && asset.status !== statusFilter) return false;
      if (departmentFilter !== "all" && asset.department !== departmentFilter) return false;
      if (manufacturerFilter !== "all" && asset.manufacturer !== manufacturerFilter) return false;
      if (modelFilter !== "all" && asset.model !== modelFilter) return false;
      if (assignedFilter === "unassigned" && asset.assignedTo) return false;
      if (assignedFilter !== "all" && assignedFilter !== "unassigned" && asset.assignedTo !== assignedFilter)
        return false;
      if (
        q &&
        ![
          asset.assetTag,
          asset.name,
          asset.category,
          asset.location,
          asset.assignedTo,
          asset.department,
          asset.manufacturer,
          asset.model,
          asset.serialNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    activeAssets,
    search,
    categoryFilter,
    locationFilter,
    statusFilter,
    assignedFilter,
    departmentFilter,
    manufacturerFilter,
    modelFilter,
  ]);

  const dueSoon = useMemo(
    () =>
      activeAssets.filter(
        (a) => isWithinDays(a.nextService, 30) || isWithinDays(a.certificationExpiry, 30),
      ),
    [activeAssets],
  );

  const selected = store.assets.find((a) => a.id === selectedId) ?? null;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setLocationFilter("all");
    setStatusFilter("all");
    setAssignedFilter("all");
    setDepartmentFilter("all");
    setManufacturerFilter("all");
    setModelFilter("all");
  }

  function openAsset(id: string) {
    setSelectedId(id);
    setPanelTab("Overview");
  }

  function saveAssetForm() {
    if (!assetForm?.name.trim()) return;
    upsertInventoryAsset({
      id: assetForm.id,
      assetTag: assetForm.assetTag.trim(),
      name: assetForm.name.trim(),
      category: assetForm.category,
      manufacturer: assetForm.manufacturer.trim(),
      model: assetForm.model.trim(),
      serialNumber: assetForm.serialNumber.trim(),
      purchaseDate: assetForm.purchaseDate,
      purchaseCost: assetForm.purchaseCost.trim(),
      warrantyExpiry: assetForm.warrantyExpiry,
      currentValue: assetForm.currentValue.trim(),
      location: assetForm.location,
      status: assetForm.status,
      condition: assetForm.condition,
      department: assetForm.department.trim(),
      nextService: assetForm.nextService,
      certificationExpiry: assetForm.certificationExpiry,
    });
    setAssetForm(null);
  }

  function downloadReport() {
    const headers = [
      "Asset Tag",
      "Name",
      "Category",
      "Location",
      "Assigned To",
      "Department",
      "Status",
      "Next Service",
      "Condition",
      "Manufacturer",
      "Model",
      "Serial Number",
    ];
    const rows = filtered.map((a) =>
      [
        a.assetTag,
        a.name,
        a.category,
        a.location,
        a.assignedTo,
        a.department,
        INVENTORY_STATUS_LABELS[a.status],
        a.nextService,
        INVENTORY_CONDITION_LABELS[a.condition],
        a.manufacturer,
        a.model,
        a.serialNumber,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unit311-inventory-${isoDaysFromNow(0)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Inventory report downloaded.");
  }

  function openAssign(mode: "assign" | "transfer", assetId = "") {
    const asset = assetId ? store.assets.find((a) => a.id === assetId) : null;
    setAssignForm(asset?.assignment ?? emptyAssignment());
    setAssignModal({ assetId: assetId || filtered[0]?.id || "", mode });
  }

  function submitAssignModal() {
    if (!assignModal?.assetId) return;
    if (assignModal.mode === "assign") {
      assignInventoryAsset(assignModal.assetId, assignForm);
    } else {
      transferInventoryAsset(assignModal.assetId, assignForm);
    }
    setAssignModal(null);
    showToast(
      assignModal.mode === "assign" ? "Asset assigned." : "Asset transferred.",
    );
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-lg">
          {toast}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <InventoryKpiTile label="Total Assets" value={kpis.total} />
        <InventoryKpiTile label="Operational" value={kpis.operational} />
        <InventoryKpiTile label="Maintenance" value={kpis.maintenance} />
        <InventoryKpiTile label="Out of Service" value={kpis.outOfService} />
        <InventoryKpiTile label="Assigned" value={kpis.assigned} />
        <InventoryKpiTile label="Unassigned" value={kpis.unassigned} />
        <InventoryKpiTile label="Due for Service" value={kpis.dueService} hint="Within 60 days" />
        <InventoryKpiTile
          label="Expiring Certifications"
          value={kpis.expiringCerts}
          hint="Within 60 days"
        />
      </section>

      {dueSoon.length > 0 ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-100">
                {dueSoon.length} asset{dueSoon.length === 1 ? "" : "s"} need attention within 30 days
              </p>
              <ul className="mt-2 space-y-1.5">
                {dueSoon.slice(0, 5).map((asset) => (
                  <li key={asset.id} className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-left text-sm text-amber-50/90 hover:text-white"
                      onClick={() => openAsset(asset.id)}
                    >
                      {asset.assetTag} · {asset.name}
                    </button>
                    <span className="text-xs text-amber-200/70">
                      {isWithinDays(asset.nextService, 30)
                        ? `Service ${formatShortDate(asset.nextService)}`
                        : `Cert ${formatShortDate(asset.certificationExpiry)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={inventoryPrimaryButtonClass()}
          onClick={() => setAssetForm(emptyAssetForm())}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Asset
        </button>
        <button
          type="button"
          className={inventorySecondaryButtonClass()}
          onClick={() => setImportOpen(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          Import Assets
        </button>
        <button
          type="button"
          className={inventorySecondaryButtonClass()}
          onClick={() => openAssign("assign")}
        >
          Assign Asset
        </button>
        <button
          type="button"
          className={inventorySecondaryButtonClass()}
          onClick={() => openAssign("transfer")}
        >
          Transfer Asset
        </button>
        <button
          type="button"
          className={inventorySecondaryButtonClass()}
          onClick={() => setRetireModal(filtered[0]?.id ?? "")}
        >
          Retire Asset
        </button>
        <button type="button" className={inventorySecondaryButtonClass()} onClick={downloadReport}>
          <Download className="h-3.5 w-3.5" />
          Generate Inventory Report
        </button>
      </div>

      <InventorySection
        title="Operational Inventory"
        subtitle="Track field assets, assignments, maintenance, and certifications across Unit311 sites."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="sm:col-span-2 xl:col-span-2">
            <InventoryFieldLabel>Search</InventoryFieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                className={`${inventoryInputClass()} pl-9`}
                placeholder="Tag, name, serial, assignee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <InventoryFieldLabel>Category</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All</option>
              {INVENTORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InventoryFieldLabel>Location</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InventoryFieldLabel>Status</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | "all")}
            >
              <option value="all">All</option>
              {INVENTORY_STATUSES.filter((s) => s !== "retired").map((s) => (
                <option key={s} value={s}>
                  {INVENTORY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InventoryFieldLabel>Assigned To</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {assignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InventoryFieldLabel>Department</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InventoryFieldLabel>Manufacturer</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
            >
              <option value="all">All</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InventoryFieldLabel>Model</InventoryFieldLabel>
            <select
              className={inventoryInputClass()}
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
            >
              <option value="all">All</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className={inventorySecondaryButtonClass()} onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <th className="px-4 py-3">Asset Tag</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Service</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-white/60">No assets match these filters</p>
                    <p className="mt-1 text-xs text-white/40">
                      Adjust filters or add a new asset to begin tracking inventory.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => (
                  <tr
                    key={asset.id}
                    className="cursor-pointer border-b border-white/8 text-white/85 transition-colors hover:bg-white/[0.03]"
                    onClick={() => openAsset(asset.id)}
                  >
                    <td className="px-4 py-3 font-medium tabular-nums text-white">{asset.assetTag}</td>
                    <td className="px-4 py-3">{asset.name}</td>
                    <td className="px-4 py-3">{asset.category}</td>
                    <td className="px-4 py-3">{asset.location}</td>
                    <td className="px-4 py-3">{asset.assignedTo || "—"}</td>
                    <td className="px-4 py-3">{asset.department || "—"}</td>
                    <td className="px-4 py-3">
                      <InventoryStatusPill className={inventoryStatusClass(asset.status)}>
                        {INVENTORY_STATUS_LABELS[asset.status]}
                      </InventoryStatusPill>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatShortDate(asset.nextService)}
                    </td>
                    <td className="px-4 py-3">{INVENTORY_CONDITION_LABELS[asset.condition]}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={actionClass("sky")}
                        onClick={() => openAsset(asset.id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </InventorySection>

      {selected ? (
        <AssetDetailPanel
          key={selected.id}
          asset={selected}
          tab={panelTab}
          onTab={setPanelTab}
          onClose={() => setSelectedId(null)}
          onDuplicate={() => {
            const copy = duplicateInventoryAsset(selected.id);
            if (copy) openAsset(copy.id);
          }}
          onArchive={() => {
            archiveInventoryAsset(selected.id);
            setSelectedId(null);
          }}
          onRetire={() => {
            retireInventoryAsset(selected.id);
            setSelectedId(null);
          }}
          onDelete={() => {
            deleteInventoryAsset(selected.id);
            setSelectedId(null);
          }}
        />
      ) : null}

      {assetForm ? (
        <Modal
          title={assetForm.id ? "Edit Asset" : "Add Asset"}
          onClose={() => setAssetForm(null)}
          wide
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Asset tag">
              <input
                className={inventoryInputClass()}
                value={assetForm.assetTag}
                onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </Field>
            <Field label="Name">
              <input
                className={inventoryInputClass()}
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <select
                className={inventoryInputClass()}
                value={assetForm.category}
                onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
              >
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <select
                className={inventoryInputClass()}
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manufacturer">
              <input
                className={inventoryInputClass()}
                value={assetForm.manufacturer}
                onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
              />
            </Field>
            <Field label="Model">
              <input
                className={inventoryInputClass()}
                value={assetForm.model}
                onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
              />
            </Field>
            <Field label="Serial number">
              <input
                className={inventoryInputClass()}
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
              />
            </Field>
            <Field label="Department">
              <input
                className={inventoryInputClass()}
                value={assetForm.department}
                onChange={(e) => setAssetForm({ ...assetForm, department: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={inventoryInputClass()}
                value={assetForm.status}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, status: e.target.value as InventoryStatus })
                }
              >
                {INVENTORY_STATUSES.filter((s) => s !== "retired").map((s) => (
                  <option key={s} value={s}>
                    {INVENTORY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select
                className={inventoryInputClass()}
                value={assetForm.condition}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, condition: e.target.value as InventoryCondition })
                }
              >
                {INVENTORY_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {INVENTORY_CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={inventorySecondaryButtonClass()}
              onClick={() => setAssetForm(null)}
            >
              Cancel
            </button>
            <button type="button" className={inventoryPrimaryButtonClass()} onClick={saveAssetForm}>
              Save Asset
            </button>
          </div>
        </Modal>
      ) : null}

      {importOpen ? (
        <Modal title="Import Assets" onClose={() => setImportOpen(false)}>
          <p className="text-sm text-white/60">
            Upload a CSV or Excel file with your asset register. Column mapping and validation run
            automatically — your file is ready to import when connected to your organisation data
            source.
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-white/30" />
            <p className="mt-3 text-sm text-white/70">Drop a file here or browse</p>
            <p className="mt-1 text-xs text-white/40">CSV, XLSX · up to 5 MB</p>
            <label className={`${inventorySecondaryButtonClass()} mt-4 inline-flex cursor-pointer`}>
              Choose file
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={() => {
                  showToast("Import file received — ready to process when data source is linked.");
                  setImportOpen(false);
                }}
              />
            </label>
          </div>
        </Modal>
      ) : null}

      {assignModal ? (
        <Modal
          title={assignModal.mode === "assign" ? "Assign Asset" : "Transfer Asset"}
          onClose={() => setAssignModal(null)}
        >
          <Field label="Asset">
            <select
              className={inventoryInputClass()}
              value={assignModal.assetId}
              onChange={(e) => {
                const asset = store.assets.find((a) => a.id === e.target.value);
                setAssignModal({ ...assignModal, assetId: e.target.value });
                setAssignForm(asset?.assignment ?? emptyAssignment());
              }}
            >
              {activeAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} · {asset.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-4">
            <AssignmentFields value={assignForm} onChange={setAssignForm} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={inventorySecondaryButtonClass()}
              onClick={() => setAssignModal(null)}
            >
              Cancel
            </button>
            <button type="button" className={inventoryPrimaryButtonClass()} onClick={submitAssignModal}>
              {assignModal.mode === "assign" ? "Assign" : "Transfer"}
            </button>
          </div>
        </Modal>
      ) : null}

      {retireModal !== null ? (
        <Modal title="Retire Asset" onClose={() => setRetireModal(null)}>
          <Field label="Asset to retire">
            <select
              className={inventoryInputClass()}
              value={retireModal}
              onChange={(e) => setRetireModal(e.target.value)}
            >
              {activeAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} · {asset.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="mt-4 text-sm text-white/50">
            Retiring removes the asset from active inventory and clears any assignment.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={inventorySecondaryButtonClass()}
              onClick={() => setRetireModal(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={actionClass("rose")}
              onClick={() => {
                if (retireModal) retireInventoryAsset(retireModal);
                setRetireModal(null);
                if (selectedId === retireModal) setSelectedId(null);
                showToast("Asset retired.");
              }}
            >
              Retire Asset
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
