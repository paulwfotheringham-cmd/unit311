"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import {
  CORPORATE_ADVISOR_CATEGORIES,
  statusPillClass,
  type CorporateAdvisor,
  type CorporateAdvisorCategory,
} from "@/lib/corporate-data";
import { deleteAdvisor, upsertAdvisor } from "@/lib/corporate-mock-store";
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

type AdvisorFormState = {
  id?: string;
  company: string;
  contact: string;
  category: CorporateAdvisorCategory;
  country: string;
  phone: string;
  email: string;
  retainer: string;
  status: "active" | "inactive";
  notes: string;
};

const emptyAdvisorForm = (): AdvisorFormState => ({
  company: "",
  contact: "",
  category: "Consultants",
  country: "Spain",
  phone: "",
  email: "",
  retainer: "",
  status: "active",
  notes: "",
});

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function actionClass(tone: "sky" | "violet" | "rose") {
  const map = {
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    violet: "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
  } as const;
  return `inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${map[tone]}`;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <CorporateFieldLabel>{label}</CorporateFieldLabel>
      {children}
    </div>
  );
}

export default function ProfessionalAdvisorsWorkspace() {
  const store = useCorporateMockStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CorporateAdvisorCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<AdvisorFormState | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.advisors.filter((advisor) => {
      if (categoryFilter !== "all" && advisor.category !== categoryFilter) return false;
      if (statusFilter !== "all" && advisor.status !== statusFilter) return false;
      if (
        q &&
        ![
          advisor.company,
          advisor.contact,
          advisor.category,
          advisor.country,
          advisor.email,
          advisor.phone,
          advisor.retainer,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [store.advisors, search, categoryFilter, statusFilter]);

  const activeCount = store.advisors.filter((a) => a.status === "active").length;
  const categoryCount = new Set(store.advisors.map((a) => a.category)).size;
  const countryCount = new Set(store.advisors.map((a) => a.country)).size;

  function openAdd() {
    setForm(emptyAdvisorForm());
  }

  function openEdit(advisor: CorporateAdvisor) {
    setForm({
      id: advisor.id,
      company: advisor.company,
      contact: advisor.contact,
      category: advisor.category,
      country: advisor.country,
      phone: advisor.phone,
      email: advisor.email,
      retainer: advisor.retainer,
      status: advisor.status,
      notes: advisor.notes,
    });
  }

  function saveForm() {
    if (!form?.company.trim()) return;
    upsertAdvisor({
      id: form.id,
      company: form.company.trim(),
      contact: form.contact.trim(),
      category: form.category,
      country: form.country.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      retainer: form.retainer.trim(),
      status: form.status,
      notes: form.notes.trim(),
    });
    setForm(null);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CorporateKpiTile label="Advisors on Retainer" value={store.advisors.length} />
        <CorporateKpiTile label="Active" value={activeCount} />
        <CorporateKpiTile label="Categories" value={categoryCount} />
        <CorporateKpiTile label="Countries" value={countryCount} />
      </section>

      <CorporateSection
        title="Professional Advisors"
        subtitle="Lawyers, accountants, auditors, and other advisers on retainer."
        actions={
          <button type="button" className={corporatePrimaryButtonClass()} onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Advisor
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
                placeholder="Company, contact, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <CorporateFieldLabel>Category</CorporateFieldLabel>
            <select
              className={corporateInputClass()}
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CorporateAdvisorCategory | "all")
              }
            >
              <option value="all">All</option>
              {CORPORATE_ADVISOR_CATEGORIES.map((item) => (
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
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Retainer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-white/45">
                    No advisors match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((advisor) => (
                  <tr key={advisor.id} className="border-b border-white/8 text-white/85">
                    <td className="px-4 py-3 font-medium text-white">{advisor.company}</td>
                    <td className="px-4 py-3">{advisor.contact}</td>
                    <td className="px-4 py-3">{advisor.category}</td>
                    <td className="px-4 py-3">{advisor.country}</td>
                    <td className="px-4 py-3 tabular-nums">{advisor.phone || "—"}</td>
                    <td className="px-4 py-3">{advisor.email || "—"}</td>
                    <td className="px-4 py-3">{advisor.retainer || "—"}</td>
                    <td className="px-4 py-3">
                      <CorporateStatusPill className={statusPillClass(advisor.status)}>
                        {formatStatusLabel(advisor.status)}
                      </CorporateStatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className={actionClass("violet")}
                          onClick={() => openEdit(advisor)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={actionClass("rose")}
                          onClick={() => deleteAdvisor(advisor.id)}
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

      {form ? (
        <Modal title={form.id ? "Edit Advisor" : "Add Advisor"} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company">
              <input
                className={corporateInputClass()}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field label="Contact">
              <input
                className={corporateInputClass()}
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <select
                className={corporateInputClass()}
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as CorporateAdvisorCategory })
                }
              >
                {CORPORATE_ADVISOR_CATEGORIES.map((item) => (
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
            <Field label="Phone">
              <input
                className={corporateInputClass()}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={corporateInputClass()}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Retainer">
              <input
                className={corporateInputClass()}
                value={form.retainer}
                onChange={(e) => setForm({ ...form, retainer: e.target.value })}
                placeholder="e.g. €2,800 / month"
              />
            </Field>
            <Field label="Status">
              <select
                className={corporateInputClass()}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "active" | "inactive" })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
              Save Advisor
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
