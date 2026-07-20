"use client";

import { useMemo, useState } from "react";
import { Building2, Clock, MapPin, Plus, Search, Users, X } from "lucide-react";

import { statusPillClass, type CorporateOffice } from "@/lib/corporate-data";
import { archiveOffice, deleteOffice, upsertOffice } from "@/lib/corporate-mock-store";
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

type OfficeFormState = {
  id?: string;
  name: string;
  country: string;
  city: string;
  address: string;
  manager: string;
  employees: number;
  status: "active" | "archived";
  phone: string;
  timezone: string;
};

const emptyOfficeForm = (): OfficeFormState => ({
  name: "",
  country: "Spain",
  city: "Barcelona",
  address: "",
  manager: "",
  employees: 0,
  status: "active",
  phone: "",
  timezone: "Europe/Madrid",
});

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function actionClass(tone: "sky" | "violet" | "amber" | "rose") {
  const map = {
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    violet: "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    amber: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
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

function OfficeDetailPanel({
  office,
  onClose,
  onEdit,
  onArchive,
}: {
  office: CorporateOffice;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-white/15 bg-[#0b1524] shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/15">
                  <Building2 className="h-4 w-4 text-sky-300" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{office.name}</h3>
                  <p className="text-sm text-white/50">
                    {office.city}, {office.country}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <CorporateStatusPill className={statusPillClass(office.status)}>
                  {formatStatusLabel(office.status)}
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
          <div className="mb-4 flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
            <p className="text-sm leading-relaxed text-white/70">{office.address || "No address recorded."}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Site manager" value={office.manager} />
            <Info label="Employees on site" value={office.employees} />
            <Info label="Phone" value={office.phone} />
            <Info label="Timezone" value={office.timezone} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b1524]/70 px-2.5 py-1">
              <Users className="h-3.5 w-3.5 text-sky-300/80" />
              {office.employees} employees
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b1524]/70 px-2.5 py-1">
              <Clock className="h-3.5 w-3.5 text-violet-300/80" />
              {office.timezone}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" className={corporatePrimaryButtonClass()} onClick={onEdit}>
            Edit
          </button>
          {office.status === "active" ? (
            <button type="button" className={actionClass("amber")} onClick={onArchive}>
              Archive
            </button>
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

export default function OfficeLocationsWorkspace() {
  const store = useCorporateMockStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<OfficeFormState | null>(null);

  const filterOptions = useMemo(() => {
    const countries = [...new Set(store.offices.map((o) => o.country))].sort();
    return { countries };
  }, [store.offices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.offices.filter((office) => {
      if (statusFilter !== "all" && office.status !== statusFilter) return false;
      if (countryFilter !== "all" && office.country !== countryFilter) return false;
      if (
        q &&
        ![
          office.name,
          office.city,
          office.country,
          office.manager,
          office.address,
          office.phone,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [store.offices, search, statusFilter, countryFilter]);

  const activeCount = store.offices.filter((o) => o.status === "active").length;
  const totalEmployees = store.offices
    .filter((o) => o.status === "active")
    .reduce((sum, o) => sum + o.employees, 0);
  const countryCount = new Set(
    store.offices.filter((o) => o.status === "active").map((o) => o.country),
  ).size;

  const selected = store.offices.find((o) => o.id === selectedId) ?? null;

  function openAdd() {
    setForm(emptyOfficeForm());
  }

  function openEdit(office: CorporateOffice) {
    setForm({
      id: office.id,
      name: office.name,
      country: office.country,
      city: office.city,
      address: office.address,
      manager: office.manager,
      employees: office.employees,
      status: office.status,
      phone: office.phone,
      timezone: office.timezone,
    });
  }

  function saveForm() {
    if (!form?.name.trim()) return;
    upsertOffice({
      id: form.id,
      name: form.name.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      manager: form.manager.trim(),
      employees: form.employees,
      status: form.status,
      phone: form.phone.trim(),
      timezone: form.timezone.trim(),
    });
    setForm(null);
  }

  function handleDelete(id: string) {
    deleteOffice(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CorporateKpiTile label="Office Locations" value={store.offices.length} />
        <CorporateKpiTile label="Active Sites" value={activeCount} />
        <CorporateKpiTile label="Employees on Site" value={totalEmployees} />
        <CorporateKpiTile label="Countries" value={countryCount} />
      </section>

      <CorporateSection
        title="Office Locations"
        subtitle="Registered offices, sales hubs, and representative sites."
        actions={
          <button type="button" className={corporatePrimaryButtonClass()} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Office
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
                placeholder="Office, city, manager…"
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
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "archived")}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
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
                <th className="px-4 py-3">Office</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-white/45">
                    No offices match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((office) => (
                  <tr key={office.id} className="border-b border-white/8 text-white/85">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{office.name}</p>
                      <p className="text-xs text-white/45">{office.city}</p>
                    </td>
                    <td className="px-4 py-3">{office.country}</td>
                    <td className="px-4 py-3">{office.manager || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{office.employees}</td>
                    <td className="px-4 py-3">
                      <CorporateStatusPill className={statusPillClass(office.status)}>
                        {formatStatusLabel(office.status)}
                      </CorporateStatusPill>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{office.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className={actionClass("sky")}
                          onClick={() => setSelectedId(office.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className={actionClass("violet")}
                          onClick={() => openEdit(office)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={actionClass("rose")}
                          onClick={() => handleDelete(office.id)}
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
        <OfficeDetailPanel
          office={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            openEdit(selected);
            setSelectedId(null);
          }}
          onArchive={() => {
            archiveOffice(selected.id);
            setSelectedId(null);
          }}
        />
      ) : null}

      {form ? (
        <Modal title={form.id ? "Edit Office" : "Add Office"} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Office name">
              <input
                className={corporateInputClass()}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="City">
              <input
                className={corporateInputClass()}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="Country">
              <input
                className={corporateInputClass()}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </Field>
            <Field label="Site manager">
              <input
                className={corporateInputClass()}
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
              />
            </Field>
            <Field label="Employees">
              <input
                className={corporateInputClass()}
                type="number"
                min={0}
                value={form.employees}
                onChange={(e) => setForm({ ...form, employees: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Phone">
              <input
                className={corporateInputClass()}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Timezone">
              <input
                className={corporateInputClass()}
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Europe/Madrid"
              />
            </Field>
            <Field label="Status">
              <select
                className={corporateInputClass()}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "active" | "archived" })
                }
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea
                  className={corporateInputClass()}
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={corporateSecondaryButtonClass()} onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="button" className={corporatePrimaryButtonClass()} onClick={saveForm}>
              Save Office
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
