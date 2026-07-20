/**
 * Client-side Corporate Information mock store for demos.
 * Future: swap selectors/mutations for GET/POST /api/corporate/... endpoints.
 */

import type {
  CorporateActivityItem,
  CorporateAdvisor,
  CorporateBankAccount,
  CorporateCapital,
  CorporateContract,
  CorporateLicence,
  CorporateOffice,
  CorporateOptionPool,
  CorporateShareholder,
} from "@/lib/corporate-data";
import { daysUntil, isWithinDays } from "@/lib/corporate-data";

type Listener = () => void;

export type CorporateMockState = {
  offices: CorporateOffice[];
  banks: CorporateBankAccount[];
  advisors: CorporateAdvisor[];
  contracts: CorporateContract[];
  shareholders: CorporateShareholder[];
  optionPool: CorporateOptionPool;
  capital: CorporateCapital;
  licences: CorporateLicence[];
  activity: CorporateActivityItem[];
};

export function isoDaysFromNow(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function contractStatusFromExpiry(expiryDate: string, current: CorporateContract["status"]) {
  if (current === "archived" || current === "draft") return current;
  const days = daysUntil(expiryDate);
  if (days < 0) return "expired";
  if (days <= 60) return "expiring";
  return "active";
}

function licenceStatusFromRenewal(renewalDate: string, current: CorporateLicence["status"]) {
  if (current === "archived") return current;
  const days = daysUntil(renewalDate);
  if (days < 0) return "expired";
  if (days <= 60) return "expiring";
  return "active";
}

function seedState(): CorporateMockState {
  const offices: CorporateOffice[] = [
    {
      id: "office-bcn-hq",
      name: "Barcelona HQ",
      country: "Spain",
      city: "Barcelona",
      address: "Carrer de Pallars 108, 08018 Barcelona",
      manager: "Paul Fotheringham",
      employees: 18,
      status: "active",
      phone: "+34 932 123 456",
      timezone: "Europe/Madrid",
    },
    {
      id: "office-mad-sales",
      name: "Madrid Sales Hub",
      country: "Spain",
      city: "Madrid",
      address: "Paseo de la Castellana 95, 28046 Madrid",
      manager: "Ashley Cole",
      employees: 6,
      status: "active",
      phone: "+34 915 234 567",
      timezone: "Europe/Madrid",
    },
    {
      id: "office-lon-rep",
      name: "London Representative Office",
      country: "United Kingdom",
      city: "London",
      address: "30 St Mary Axe, London EC3A 8BF",
      manager: "Saffin Khan",
      employees: 3,
      status: "active",
      phone: "+44 20 7123 4567",
      timezone: "Europe/London",
    },
    {
      id: "office-valencia-old",
      name: "Valencia Satellite (closed)",
      country: "Spain",
      city: "Valencia",
      address: "Calle Colón 12, 46004 Valencia",
      manager: "",
      employees: 0,
      status: "archived",
      phone: "",
      timezone: "Europe/Madrid",
    },
  ];

  const banks: CorporateBankAccount[] = [
    {
      id: "bank-caixa-eur",
      bank: "CaixaBank",
      accountName: "Unit311 Operations EUR",
      currency: "EUR",
      country: "Spain",
      accountType: "Current",
      status: "active",
      primary: true,
      iban: "ES91 2100 0418 4502 0005 1332",
      swift: "CAIXESBBXXX",
      routing: "",
      branch: "Barcelona Diagonal",
      accountHolder: "Nakama Ventures SL",
      notes: "Primary operating account · payroll and supplier payments",
    },
    {
      id: "bank-barclays-gbp",
      bank: "Barclays",
      accountName: "Unit311 UK Client Receipts",
      currency: "GBP",
      country: "United Kingdom",
      accountType: "Multi-currency",
      status: "active",
      primary: false,
      iban: "GB29 NWBK 6016 1331 9268 19",
      swift: "BARCGB22",
      routing: "20-00-00",
      branch: "London Canary Wharf",
      accountHolder: "Unit311 UK Ltd",
      notes: "GBP client invoicing and UK payroll",
    },
    {
      id: "bank-jpm-usd",
      bank: "J.P. Morgan",
      accountName: "Unit311 Treasury USD",
      currency: "USD",
      country: "United States",
      accountType: "Treasury",
      status: "review",
      primary: false,
      iban: "",
      swift: "CHASUS33",
      routing: "021000021",
      branch: "New York Corporate",
      accountHolder: "Nakama Ventures SL",
      notes: "Annual KYC refresh pending · US vendor settlements",
    },
    {
      id: "bank-santander-eur",
      bank: "Banco Santander",
      accountName: "Nakama Reserves EUR",
      currency: "EUR",
      country: "Spain",
      accountType: "Savings",
      status: "active",
      primary: false,
      iban: "ES76 0049 0001 5023 4567 8900",
      swift: "BSCHESMMXXX",
      routing: "",
      branch: "Madrid Castellana",
      accountHolder: "Nakama Ventures SL",
      notes: "Cash reserve · 3-month notice on large withdrawals",
    },
  ];

  const advisors: CorporateAdvisor[] = [
    {
      id: "adv-cuatrecasas",
      company: "Cuatrecasas",
      contact: "Laura Mendoza (Partner)",
      category: "Lawyers",
      country: "Spain",
      phone: "+34 934 032 000",
      email: "l.mendoza@cuatrecasas.com",
      retainer: "€4,500 / month",
      status: "active",
      notes: "Corporate, employment, and commercial contracts",
    },
    {
      id: "adv-bdo",
      company: "BDO Spain",
      contact: "Marc Vidal",
      category: "Accountants",
      country: "Spain",
      phone: "+34 934 424 200",
      email: "marc.vidal@bdo.es",
      retainer: "€2,800 / month",
      status: "active",
      notes: "Monthly management accounts and VAT filings",
    },
    {
      id: "adv-kpmg",
      company: "KPMG Abogados",
      contact: "Elena Sánchez",
      category: "Auditors",
      country: "Spain",
      phone: "+34 915 663 100",
      email: "elena.sanchez@kpmg.es",
      retainer: "Annual audit fee €18,000",
      status: "active",
      notes: "Statutory audit · FY2025 fieldwork scheduled Q4",
    },
    {
      id: "adv-grant-thornton",
      company: "Grant Thornton",
      contact: "David Puig",
      category: "Tax Advisors",
      country: "Spain",
      phone: "+34 932 688 400",
      email: "david.puig@gt.es",
      retainer: "€1,200 / quarter",
      status: "active",
      notes: "Transfer pricing and cross-border tax planning",
    },
    {
      id: "adv-marsh",
      company: "Marsh España",
      contact: "Isabel Romero",
      category: "Insurance Brokers",
      country: "Spain",
      phone: "+34 915 724 000",
      email: "isabel.romero@marsh.com",
      retainer: "Broker fee on placement",
      status: "active",
      notes: "D&O, cyber, and office contents policies",
    },
    {
      id: "adv-cosec",
      company: "Iberian Company Secretarial",
      contact: "James Whitfield",
      category: "Corporate Secretaries",
      country: "United Kingdom",
      phone: "+44 20 7946 0958",
      email: "j.whitfield@iberiancosec.co.uk",
      retainer: "£650 / month",
      status: "inactive",
      notes: "Former UK subsidiary filings · retained for archive access",
    },
  ];

  const contracts: CorporateContract[] = [
    {
      id: "contract-aws-msa",
      name: "AWS Enterprise Discount Program",
      supplier: "Amazon Web Services EMEA",
      type: "MSA",
      owner: "Hannes Weber",
      startDate: isoDaysFromNow(-540),
      expiryDate: isoDaysFromNow(42),
      value: "€84,000 / year",
      status: "expiring",
      summary: "Cloud infrastructure hosting for Unit311 platform and staging environments.",
      parties: "Nakama Ventures SL · AWS EMEA SARL",
      renewalNotes: "Negotiate 12-month EDP renewal before August committee.",
      documents: "AWS_EDP_2024_signed.pdf",
      notes: "Committed spend €7k/month",
    },
    {
      id: "contract-bcn-lease",
      name: "Barcelona HQ Office Lease",
      supplier: "Pallars 108 Properties SL",
      type: "Lease",
      owner: "Paul Fotheringham",
      startDate: isoDaysFromNow(-730),
      expiryDate: isoDaysFromNow(28),
      value: "€18,600 / year",
      status: "expiring",
      summary: "3rd floor flex office · 24 desks · break-out room included.",
      parties: "Nakama Ventures SL · Pallars 108 Properties SL",
      renewalNotes: "Landlord offered 3-year extension at +4% CPI.",
      documents: "",
      notes: "Break clause at 24 months — exercised option retained",
    },
    {
      id: "contract-dno-insurance",
      name: "Directors & Officers Liability",
      supplier: "Zurich Insurance",
      type: "Insurance",
      owner: "Stefan Braun",
      startDate: isoDaysFromNow(-120),
      expiryDate: isoDaysFromNow(245),
      value: "€12,400 / year",
      status: "active",
      summary: "€2M D&O cover for board and senior management.",
      parties: "Nakama Ventures SL · Zurich Insurance plc",
      renewalNotes: "",
      documents: "Zurich_DO_Policy_2026.pdf",
      notes: "Broker: Marsh España",
    },
    {
      id: "contract-hubspot",
      name: "HubSpot CRM Platform",
      supplier: "HubSpot Ireland Ltd",
      type: "Supplier",
      owner: "Ashley Cole",
      startDate: isoDaysFromNow(-365),
      expiryDate: isoDaysFromNow(180),
      value: "€14,400 / year",
      status: "active",
      summary: "Sales Hub Professional · 10 seats · marketing add-on.",
      parties: "Nakama Ventures SL · HubSpot Ireland Ltd",
      renewalNotes: "",
      documents: "HubSpot_Order_Form_2025.pdf",
      notes: "",
    },
    {
      id: "contract-ms-nda",
      name: "Microsoft Partner NDA",
      supplier: "Microsoft Ireland Operations Ltd",
      type: "NDA",
      owner: "Hannes Weber",
      startDate: isoDaysFromNow(-400),
      expiryDate: isoDaysFromNow(-18),
      value: "—",
      status: "expired",
      summary: "Mutual NDA for Azure marketplace co-sell discussions.",
      parties: "Nakama Ventures SL · Microsoft Ireland Operations Ltd",
      renewalNotes: "Legal to re-issue before next partner review.",
      documents: "MS_NDA_2024.pdf",
      notes: "",
    },
    {
      id: "contract-employment-template",
      name: "Standard Employment Agreement Template",
      supplier: "Cuatrecasas (internal)",
      type: "Employment",
      owner: "Ana Torres",
      startDate: isoDaysFromNow(-30),
      expiryDate: isoDaysFromNow(335),
      value: "—",
      status: "draft",
      summary: "Updated Spanish employment contract template for 2026 hires.",
      parties: "Nakama Ventures SL",
      renewalNotes: "Awaiting final HR and legal sign-off.",
      documents: "",
      notes: "Replaces 2023 template",
    },
  ];

  const shareholders: CorporateShareholder[] = [
    {
      id: "sh-paul",
      company: "Nakama Ventures SL",
      shareholder: "Paul Fotheringham",
      shareClass: "Ordinary",
      shares: 450_000,
      price: "€0.85",
      issueDate: isoDaysFromNow(-1825),
      notes: "Founder · CEO",
    },
    {
      id: "sh-hannes",
      company: "Nakama Ventures SL",
      shareholder: "Hannes Weber",
      shareClass: "Ordinary",
      shares: 300_000,
      price: "€0.85",
      issueDate: isoDaysFromNow(-1825),
      notes: "Founder · CTO",
    },
    {
      id: "sh-ashley",
      company: "Nakama Ventures SL",
      shareholder: "Ashley Cole",
      shareClass: "Ordinary",
      shares: 100_000,
      price: "€1.20",
      issueDate: isoDaysFromNow(-540),
      notes: "Seed investor · board observer",
    },
    {
      id: "sh-stefan",
      company: "Nakama Ventures SL",
      shareholder: "Stefan Braun Holdings SL",
      shareClass: "Preference",
      shares: 100_000,
      price: "€2.50",
      issueDate: isoDaysFromNow(-365),
      notes: "Series Seed · 1× non-participating preference",
    },
    {
      id: "sh-esop",
      company: "Nakama Ventures SL",
      shareholder: "Employee Option Pool",
      shareClass: "Options",
      shares: 50_000,
      price: "€0.85",
      issueDate: isoDaysFromNow(-730),
      notes: "Unallocated ESOP reserve on cap table",
    },
  ];

  const optionPool: CorporateOptionPool = {
    authorised: 150_000,
    issued: 45_000,
    reserved: 85_000,
    lastUpdated: isoDaysFromNow(-5),
  };

  const capital: CorporateCapital = {
    authorisedShareCapital: "€1,000,000",
    issuedShareCapital: "€850,000",
    currency: "EUR",
  };

  const licences: CorporateLicence[] = [
    {
      id: "lic-m365",
      software: "Microsoft 365 E5",
      vendor: "Microsoft",
      licenceType: "Enterprise subscription",
      seats: 32,
      renewalDate: isoDaysFromNow(28),
      cost: "€9,600 / year",
      owner: "Hannes Weber",
      status: "expiring",
    },
    {
      id: "lic-figma",
      software: "Figma Organization",
      vendor: "Figma Inc.",
      licenceType: "Org plan",
      seats: 12,
      renewalDate: isoDaysFromNow(11),
      cost: "€4,320 / year",
      owner: "Lucía Fernández",
      status: "expiring",
    },
    {
      id: "lic-github",
      software: "GitHub Enterprise Cloud",
      vendor: "GitHub",
      licenceType: "Enterprise",
      seats: 24,
      renewalDate: isoDaysFromNow(48),
      cost: "€7,200 / year",
      owner: "Hannes Weber",
      status: "expiring",
    },
    {
      id: "lic-slack",
      software: "Slack Business+",
      vendor: "Salesforce",
      licenceType: "Annual",
      seats: 28,
      renewalDate: isoDaysFromNow(165),
      cost: "€5,040 / year",
      owner: "Paul Fotheringham",
      status: "active",
    },
    {
      id: "lic-adobe",
      software: "Adobe Creative Cloud Teams",
      vendor: "Adobe",
      licenceType: "Teams",
      seats: 6,
      renewalDate: isoDaysFromNow(-12),
      cost: "€2,160 / year",
      owner: "Lucía Fernández",
      status: "expired",
    },
  ];

  const activity: CorporateActivityItem[] = [
    {
      id: "act-1",
      at: isoDaysFromNow(0),
      label: "Bank account updated",
      detail: "J.P. Morgan USD — KYC refresh flagged for review",
    },
    {
      id: "act-2",
      at: isoDaysFromNow(-1),
      label: "Contract added",
      detail: "Employment Agreement Template — draft",
    },
    {
      id: "act-3",
      at: isoDaysFromNow(-3),
      label: "Licence renewal due",
      detail: "Figma Organization — renewal in 11 days",
    },
    {
      id: "act-4",
      at: isoDaysFromNow(-5),
      label: "Shareholder record updated",
      detail: "Stefan Braun Holdings SL — Preference shares",
    },
    {
      id: "act-5",
      at: isoDaysFromNow(-8),
      label: "Office archived",
      detail: "Valencia Satellite — lease ended",
    },
    {
      id: "act-6",
      at: isoDaysFromNow(-12),
      label: "Advisor added",
      detail: "Grant Thornton — Tax Advisors",
    },
    {
      id: "act-7",
      at: isoDaysFromNow(-18),
      label: "Contract renewed",
      detail: "Directors & Officers Liability — Zurich Insurance",
    },
  ];

  return {
    offices,
    banks,
    advisors,
    contracts,
    shareholders,
    optionPool,
    capital,
    licences,
    activity,
  };
}

let state = seedState();
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function pushActivity(label: string, detail: string) {
  state = {
    ...state,
    activity: [
      { id: uid("act"), at: isoDaysFromNow(0), label, detail },
      ...state.activity,
    ].slice(0, 40),
  };
}

export function subscribeCorporateMockStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCorporateMockSnapshot(): CorporateMockState {
  return state;
}

export function resetCorporateMockStore() {
  state = seedState();
  emit();
}

export function listCorporateActivity() {
  return state.activity;
}

/* —— Offices —— */

export function upsertOffice(input: Partial<CorporateOffice> & { id?: string }) {
  const existing = input.id ? state.offices.find((item) => item.id === input.id) : null;
  const next: CorporateOffice = {
    id: existing?.id ?? uid("office"),
    name: input.name ?? existing?.name ?? "New office",
    country: input.country ?? existing?.country ?? "Spain",
    city: input.city ?? existing?.city ?? "Barcelona",
    address: input.address ?? existing?.address ?? "",
    manager: input.manager ?? existing?.manager ?? "",
    employees: input.employees ?? existing?.employees ?? 0,
    status: input.status ?? existing?.status ?? "active",
    phone: input.phone ?? existing?.phone ?? "",
    timezone: input.timezone ?? existing?.timezone ?? "Europe/Madrid",
  };
  state = {
    ...state,
    offices: existing
      ? state.offices.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.offices],
  };
  pushActivity(existing ? "Office updated" : "Office added", `${next.name} — ${next.city}`);
  emit();
  return next;
}

export function archiveOffice(id: string) {
  state = {
    ...state,
    offices: state.offices.map((office) =>
      office.id === id ? { ...office, status: "archived" } : office,
    ),
  };
  const office = state.offices.find((item) => item.id === id);
  if (office) pushActivity("Office archived", `${office.name} — ${office.city}`);
  emit();
}

export function deleteOffice(id: string) {
  const office = state.offices.find((item) => item.id === id);
  state = { ...state, offices: state.offices.filter((item) => item.id !== id) };
  if (office) pushActivity("Office deleted", `${office.name} — ${office.city}`);
  emit();
}

/* —— Banks —— */

export function upsertBankAccount(input: Partial<CorporateBankAccount> & { id?: string }) {
  const existing = input.id ? state.banks.find((item) => item.id === input.id) : null;
  const next: CorporateBankAccount = {
    id: existing?.id ?? uid("bank"),
    bank: input.bank ?? existing?.bank ?? "Bank",
    accountName: input.accountName ?? existing?.accountName ?? "New account",
    currency: input.currency ?? existing?.currency ?? "EUR",
    country: input.country ?? existing?.country ?? "Spain",
    accountType: input.accountType ?? existing?.accountType ?? "Current",
    status: input.status ?? existing?.status ?? "active",
    primary: input.primary ?? existing?.primary ?? false,
    iban: input.iban ?? existing?.iban ?? "",
    swift: input.swift ?? existing?.swift ?? "",
    routing: input.routing ?? existing?.routing ?? "",
    branch: input.branch ?? existing?.branch ?? "",
    accountHolder: input.accountHolder ?? existing?.accountHolder ?? "Nakama Ventures SL",
    notes: input.notes ?? existing?.notes ?? "",
  };
  state = {
    ...state,
    banks: existing
      ? state.banks.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.banks],
  };
  pushActivity(
    existing ? "Bank account updated" : "Bank account added",
    `${next.accountName} · ${next.currency}`,
  );
  emit();
  return next;
}

export function deleteBankAccount(id: string) {
  const bank = state.banks.find((item) => item.id === id);
  state = { ...state, banks: state.banks.filter((item) => item.id !== id) };
  if (bank) pushActivity("Bank account deleted", `${bank.accountName} · ${bank.bank}`);
  emit();
}

export function archiveBankAccount(id: string) {
  state = {
    ...state,
    banks: state.banks.map((bank) =>
      bank.id === id ? { ...bank, status: "archived", primary: false } : bank,
    ),
  };
  const bank = state.banks.find((item) => item.id === id);
  if (bank) pushActivity("Bank account archived", `${bank.accountName} · ${bank.currency}`);
  emit();
}

export function markPrimaryBankAccount(id: string) {
  state = {
    ...state,
    banks: state.banks.map((bank) => ({
      ...bank,
      primary: bank.id === id,
    })),
  };
  const bank = state.banks.find((item) => item.id === id);
  if (bank) pushActivity("Primary bank account set", `${bank.accountName} · ${bank.currency}`);
  emit();
}

/* —— Advisors —— */

export function upsertAdvisor(input: Partial<CorporateAdvisor> & { id?: string }) {
  const existing = input.id ? state.advisors.find((item) => item.id === input.id) : null;
  const next: CorporateAdvisor = {
    id: existing?.id ?? uid("adv"),
    company: input.company ?? existing?.company ?? "Advisor firm",
    contact: input.contact ?? existing?.contact ?? "",
    category: input.category ?? existing?.category ?? "Consultants",
    country: input.country ?? existing?.country ?? "Spain",
    phone: input.phone ?? existing?.phone ?? "",
    email: input.email ?? existing?.email ?? "",
    retainer: input.retainer ?? existing?.retainer ?? "",
    status: input.status ?? existing?.status ?? "active",
    notes: input.notes ?? existing?.notes ?? "",
  };
  state = {
    ...state,
    advisors: existing
      ? state.advisors.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.advisors],
  };
  pushActivity(
    existing ? "Advisor updated" : "Advisor added",
    `${next.company} — ${next.category}`,
  );
  emit();
  return next;
}

export function deleteAdvisor(id: string) {
  const advisor = state.advisors.find((item) => item.id === id);
  state = { ...state, advisors: state.advisors.filter((item) => item.id !== id) };
  if (advisor) pushActivity("Advisor removed", `${advisor.company} — ${advisor.category}`);
  emit();
}

/* —— Contracts —— */

export function upsertContract(input: Partial<CorporateContract> & { id?: string }) {
  const existing = input.id ? state.contracts.find((item) => item.id === input.id) : null;
  const expiryDate = input.expiryDate ?? existing?.expiryDate ?? isoDaysFromNow(365);
  const draftStatus = input.status ?? existing?.status ?? "draft";
  const next: CorporateContract = {
    id: existing?.id ?? uid("contract"),
    name: input.name ?? existing?.name ?? "New contract",
    supplier: input.supplier ?? existing?.supplier ?? "",
    type: input.type ?? existing?.type ?? "Other",
    owner: input.owner ?? existing?.owner ?? "",
    startDate: input.startDate ?? existing?.startDate ?? isoDaysFromNow(0),
    expiryDate,
    value: input.value ?? existing?.value ?? "",
    status: contractStatusFromExpiry(expiryDate, draftStatus),
    summary: input.summary ?? existing?.summary ?? "",
    parties: input.parties ?? existing?.parties ?? "",
    renewalNotes: input.renewalNotes ?? existing?.renewalNotes ?? "",
    documents: input.documents ?? existing?.documents ?? "",
    notes: input.notes ?? existing?.notes ?? "",
  };
  state = {
    ...state,
    contracts: existing
      ? state.contracts.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.contracts],
  };
  pushActivity(
    existing ? "Contract updated" : "Contract added",
    `${next.name} — ${next.supplier || next.type}`,
  );
  emit();
  return next;
}

export function deleteContract(id: string) {
  const contract = state.contracts.find((item) => item.id === id);
  state = { ...state, contracts: state.contracts.filter((item) => item.id !== id) };
  if (contract) pushActivity("Contract deleted", `${contract.name} — ${contract.supplier}`);
  emit();
}

export function archiveContract(id: string) {
  state = {
    ...state,
    contracts: state.contracts.map((contract) =>
      contract.id === id ? { ...contract, status: "archived" } : contract,
    ),
  };
  const contract = state.contracts.find((item) => item.id === id);
  if (contract) pushActivity("Contract archived", `${contract.name} — ${contract.supplier}`);
  emit();
}

export function renewContract(id: string) {
  state = {
    ...state,
    contracts: state.contracts.map((contract) => {
      if (contract.id !== id) return contract;
      const expiryDate = isoDaysFromNow(365);
      return {
        ...contract,
        expiryDate,
        status: contractStatusFromExpiry(expiryDate, "active"),
        renewalNotes: contract.renewalNotes
          ? `${contract.renewalNotes} · Renewed ${isoDaysFromNow(0)}`
          : `Renewed ${isoDaysFromNow(0)}`,
      };
    }),
  };
  const contract = state.contracts.find((item) => item.id === id);
  if (contract) {
    pushActivity("Contract renewed", `${contract.name} — expires ${contract.expiryDate}`);
  }
  emit();
}

/* —— Shareholders —— */

export function upsertShareholder(input: Partial<CorporateShareholder> & { id?: string }) {
  const existing = input.id ? state.shareholders.find((item) => item.id === input.id) : null;
  const next: CorporateShareholder = {
    id: existing?.id ?? uid("sh"),
    company: input.company ?? existing?.company ?? "Nakama Ventures SL",
    shareholder: input.shareholder ?? existing?.shareholder ?? "Shareholder",
    shareClass: input.shareClass ?? existing?.shareClass ?? "Ordinary",
    shares: input.shares ?? existing?.shares ?? 0,
    price: input.price ?? existing?.price ?? "",
    issueDate: input.issueDate ?? existing?.issueDate ?? isoDaysFromNow(0),
    notes: input.notes ?? existing?.notes ?? "",
  };
  state = {
    ...state,
    shareholders: existing
      ? state.shareholders.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.shareholders],
  };
  pushActivity(
    existing ? "Shareholder updated" : "Shareholder added",
    `${next.shareholder} — ${next.shares.toLocaleString()} ${next.shareClass}`,
  );
  emit();
  return next;
}

export function deleteShareholder(id: string) {
  const shareholder = state.shareholders.find((item) => item.id === id);
  state = { ...state, shareholders: state.shareholders.filter((item) => item.id !== id) };
  if (shareholder) {
    pushActivity("Shareholder removed", `${shareholder.shareholder} — ${shareholder.shareClass}`);
  }
  emit();
}

export function transferShares(fromId: string, toId: string, shares: number) {
  if (shares <= 0) return;
  const from = state.shareholders.find((item) => item.id === fromId);
  const to = state.shareholders.find((item) => item.id === toId);
  if (!from || !to || from.shares < shares) return;

  state = {
    ...state,
    shareholders: state.shareholders.map((row) => {
      if (row.id === fromId) return { ...row, shares: row.shares - shares };
      if (row.id === toId) return { ...row, shares: row.shares + shares };
      return row;
    }),
  };
  pushActivity(
    "Share transfer",
    `${from.shareholder} → ${to.shareholder} · ${shares.toLocaleString()} shares`,
  );
  emit();
}

/* —— Option pool & capital —— */

export function updateOptionPool(patch: Partial<CorporateOptionPool>) {
  state = {
    ...state,
    optionPool: {
      ...state.optionPool,
      ...patch,
      lastUpdated: isoDaysFromNow(0),
    },
  };
  pushActivity(
    "Option pool updated",
    `Authorised ${state.optionPool.authorised.toLocaleString()} · Issued ${state.optionPool.issued.toLocaleString()}`,
  );
  emit();
}

export function updateCapital(patch: Partial<CorporateCapital>) {
  state = {
    ...state,
    capital: { ...state.capital, ...patch },
  };
  pushActivity(
    "Share capital updated",
    `Issued ${state.capital.issuedShareCapital} · ${state.capital.currency}`,
  );
  emit();
}

/* —— Licences —— */

export function upsertLicence(input: Partial<CorporateLicence> & { id?: string }) {
  const existing = input.id ? state.licences.find((item) => item.id === input.id) : null;
  const renewalDate = input.renewalDate ?? existing?.renewalDate ?? isoDaysFromNow(365);
  const draftStatus = input.status ?? existing?.status ?? "active";
  const next: CorporateLicence = {
    id: existing?.id ?? uid("lic"),
    software: input.software ?? existing?.software ?? "Software",
    vendor: input.vendor ?? existing?.vendor ?? "",
    licenceType: input.licenceType ?? existing?.licenceType ?? "Subscription",
    seats: input.seats ?? existing?.seats ?? 1,
    renewalDate,
    cost: input.cost ?? existing?.cost ?? "",
    owner: input.owner ?? existing?.owner ?? "",
    status: licenceStatusFromRenewal(renewalDate, draftStatus),
  };
  state = {
    ...state,
    licences: existing
      ? state.licences.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.licences],
  };
  pushActivity(
    existing ? "Licence updated" : "Licence added",
    `${next.software} — ${next.vendor || next.licenceType}`,
  );
  emit();
  return next;
}

export function deleteLicence(id: string) {
  const licence = state.licences.find((item) => item.id === id);
  state = { ...state, licences: state.licences.filter((item) => item.id !== id) };
  if (licence) pushActivity("Licence deleted", `${licence.software} — ${licence.vendor}`);
  emit();
}

export function renewLicence(id: string) {
  state = {
    ...state,
    licences: state.licences.map((licence) => {
      if (licence.id !== id) return licence;
      const renewalDate = isoDaysFromNow(365);
      return {
        ...licence,
        renewalDate,
        status: licenceStatusFromRenewal(renewalDate, "active"),
      };
    }),
  };
  const licence = state.licences.find((item) => item.id === id);
  if (licence) {
    pushActivity("Licence renewed", `${licence.software} — renewal ${licence.renewalDate}`);
  }
  emit();
}

export function archiveLicence(id: string) {
  state = {
    ...state,
    licences: state.licences.map((licence) =>
      licence.id === id ? { ...licence, status: "archived" } : licence,
    ),
  };
  const licence = state.licences.find((item) => item.id === id);
  if (licence) pushActivity("Licence archived", `${licence.software} — ${licence.vendor}`);
  emit();
}

/** Recompute contract/licence expiry statuses from dates (e.g. after day rollover). */
export function refreshCorporateExpiryStatuses() {
  state = {
    ...state,
    contracts: state.contracts.map((contract) => ({
      ...contract,
      status: contractStatusFromExpiry(contract.expiryDate, contract.status),
    })),
    licences: state.licences.map((licence) => ({
      ...licence,
      status: licenceStatusFromRenewal(licence.renewalDate, licence.status),
    })),
  };
  emit();
}

export function listExpiringContracts(withinDays = 60) {
  return state.contracts.filter(
    (contract) =>
      contract.status !== "archived" &&
      contract.status !== "draft" &&
      isWithinDays(contract.expiryDate, withinDays),
  );
}

export function listExpiringLicences(withinDays = 60) {
  return state.licences.filter(
    (licence) =>
      licence.status !== "archived" && isWithinDays(licence.renewalDate, withinDays),
  );
}
