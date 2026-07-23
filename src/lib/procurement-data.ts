/** Procurement & Purchasing — types, labels, and helpers (MOD-068). */

export const PROCUREMENT_MODULE_TABS = [
  "Dashboard",
  "Requisitions",
  "Purchase Orders",
  "Suppliers",
  "Goods Receipts",
  "Invoice Matching",
  "Approvals",
  "Contracts",
  "Reporting",
  "AI Insights",
  "Integrations",
  "Permissions",
] as const;
export type ProcurementModuleTab = (typeof PROCUREMENT_MODULE_TABS)[number];

export const REQUISITION_STATUSES = [
  "draft",
  "submitted",
  "manager_approval",
  "finance_approval",
  "purchasing",
  "po_created",
  "rejected",
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  manager_approval: "Manager Approval",
  finance_approval: "Finance Approval",
  purchasing: "Purchasing",
  po_created: "PO Created",
  rejected: "Rejected",
};

export const PO_STATUSES = [
  "draft",
  "sent",
  "acknowledged",
  "partially_received",
  "received",
  "invoiced",
  "closed",
  "cancelled",
] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  acknowledged: "Acknowledged",
  partially_received: "Partially Received",
  received: "Received",
  invoiced: "Invoiced",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ProcurementPriority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<ProcurementPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const PROCUREMENT_ROLES = [
  "employee",
  "department_manager",
  "purchasing_officer",
  "finance",
  "operations_manager",
  "administrator",
] as const;
export type ProcurementRole = (typeof PROCUREMENT_ROLES)[number];

export const PROCUREMENT_ROLE_LABELS: Record<ProcurementRole, string> = {
  employee: "Employee",
  department_manager: "Department Manager",
  purchasing_officer: "Purchasing Officer",
  finance: "Finance",
  operations_manager: "Operations Manager",
  administrator: "Administrator",
};

export const ACCOUNTING_INTEGRATIONS = [
  "Xero",
  "QuickBooks",
  "Sage",
  "Microsoft Dynamics",
  "SAP Business One",
] as const;

export type ProcurementLineItem = {
  id: string;
  item: string;
  description: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  estimatedCost: number;
  taxPct: number;
  discountPct: number;
  preferredSupplierId: string;
  preferredSupplierName: string;
};

export type ProcurementAttachment = {
  id: string;
  name: string;
  uploadedAt: string;
  kind: "quote" | "spec" | "photo" | "contract" | "invoice" | "other";
};

export type ApprovalHistoryEntry = {
  id: string;
  at: string;
  actor: string;
  role: ProcurementRole | string;
  action: "submitted" | "approved" | "rejected" | "returned" | "escalated" | "comment";
  note: string;
};

export type PurchaseRequisition = {
  id: string;
  requestNumber: string;
  requestDate: string;
  requestedBy: string;
  department: string;
  costCentre: string;
  priority: ProcurementPriority;
  requiredDate: string;
  businessJustification: string;
  budgetCode: string;
  status: RequisitionStatus;
  lines: ProcurementLineItem[];
  attachments: ProcurementAttachment[];
  approvalHistory: ApprovalHistoryEntry[];
  linkedPoId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  deliveryAddress: string;
  billingAddress: string;
  currency: string;
  paymentTerms: string;
  expectedDelivery: string;
  status: PurchaseOrderStatus;
  requisitionId: string | null;
  lines: ProcurementLineItem[];
  notes: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  emailedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierRecord = {
  id: string;
  companyName: string;
  contacts: Array<{ name: string; email: string; phone: string; role: string }>;
  addresses: Array<{ label: string; line1: string; city: string; country: string; postcode: string }>;
  taxId: string;
  paymentTerms: string;
  bankDetails: string;
  preferred: boolean;
  insuranceExpiry: string;
  contractExpiry: string;
  rating: number;
  performanceScore: number;
  onTimeDeliveryPct: number;
  qualityScore: number;
  priceCompetitiveness: number;
  averageLeadTimeDays: number;
  totalSpend: number;
  notes: string;
  documents: ProcurementAttachment[];
  category: string;
  currency: string;
  status: "active" | "on_hold" | "inactive";
};

export type GoodsReceipt = {
  id: string;
  receiptNumber: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  deliveryDate: string;
  receivedBy: string;
  lines: Array<{
    lineId: string;
    item: string;
    orderedQty: number;
    receivedQty: number;
    damagedQty: number;
    backOrderQty: number;
  }>;
  photos: ProcurementAttachment[];
  notes: string;
  inventoryUpdated: boolean;
  createdAt: string;
};

export type SupplierInvoiceMatch = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poId: string;
  poNumber: string;
  receiptId: string | null;
  receiptNumber: string | null;
  invoiceDate: string;
  invoiceTotal: number;
  poTotal: number;
  receiptTotal: number;
  currency: string;
  matchStatus: "matched" | "quantity_mismatch" | "price_mismatch" | "missing_receipt" | "pending";
  mismatches: string[];
  status: "draft" | "awaiting_approval" | "approved" | "rejected" | "posted";
  createdAt: string;
};

export type ApprovalRule = {
  id: string;
  name: string;
  minValue: number;
  maxValue: number | null;
  department: string | "any";
  businessUnit: string | "any";
  costCentre: string | "any";
  project: string | "any";
  levels: Array<{ level: number; role: ProcurementRole; label: string }>;
  active: boolean;
};

export type SupplierContract = {
  id: string;
  title: string;
  supplierId: string;
  supplierName: string;
  contractValue: number;
  currency: string;
  startDate: string;
  renewalDate: string;
  noticePeriodDays: number;
  owner: string;
  status: "active" | "expiring_soon" | "expired" | "draft";
  documents: ProcurementAttachment[];
  reminderSent: boolean;
  notes: string;
};

export type AiInsight = {
  id: string;
  kind:
    | "preferred_supplier"
    | "cost_saving"
    | "duplicate_purchase"
    | "unusual_spend"
    | "replenishment"
    | "supplier_summary";
  title: string;
  detail: string;
  confidence: number;
  actionLabel: string;
  relatedIds: string[];
  createdAt: string;
};

export type IntegrationConnector = {
  id: string;
  platform: (typeof ACCOUNTING_INTEGRATIONS)[number];
  status: "connected" | "available" | "error";
  lastSyncAt: string | null;
  syncPurchaseOrders: boolean;
  syncInvoices: boolean;
  notes: string;
};

export type RolePermissionMatrix = Record<
  ProcurementRole,
  {
    createRequisition: boolean;
    approveManager: boolean;
    approveFinance: boolean;
    createPo: boolean;
    receiveGoods: boolean;
    matchInvoices: boolean;
    manageSuppliers: boolean;
    manageContracts: boolean;
    configureWorkflows: boolean;
    viewReports: boolean;
  }
>;

export type ProcurementDashboardSnapshot = {
  requisitionsAwaitingApproval: number;
  purchaseOrdersOutstanding: number;
  ordersReceivedThisMonth: number;
  supplierPerformanceAvg: number;
  spendThisMonth: number;
  budgetVsActualPct: number;
  averageApprovalHours: number;
  openDeliveries: number;
  monthlySpend: Array<{ month: string; spend: number }>;
  spendBySupplier: Array<{ name: string; spend: number }>;
  spendByDepartment: Array<{ name: string; spend: number }>;
  poStatusBreakdown: Array<{ status: string; count: number }>;
};

export type ProcurementReportingSnapshot = {
  totalSpendYtd: number;
  savingsAchieved: number;
  budgetUtilisationPct: number;
  outstandingPoValue: number;
  contractsRenewingSoon: number;
  spendByCategory: Array<{ category: string; spend: number }>;
  spendByDepartment: Array<{ name: string; spend: number }>;
  supplierPerformance: Array<{ name: string; score: number; onTime: number }>;
};

export function money(n: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function moneyExact(n: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function lineTotal(line: Pick<ProcurementLineItem, "quantity" | "unitPrice" | "taxPct" | "discountPct">) {
  const base = line.quantity * line.unitPrice;
  const afterDiscount = base * (1 - (line.discountPct || 0) / 100);
  const tax = afterDiscount * ((line.taxPct || 0) / 100);
  return {
    base,
    afterDiscount,
    tax,
    total: afterDiscount + tax,
  };
}

export function calcPoTotals(lines: ProcurementLineItem[]) {
  return lines.reduce(
    (acc, line) => {
      const t = lineTotal(line);
      acc.subtotal += t.afterDiscount;
      acc.taxTotal += t.tax;
      acc.discountTotal += t.base - t.afterDiscount;
      acc.grandTotal += t.total;
      return acc;
    },
    { subtotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0 },
  );
}

export function requisitionStatusClass(status: RequisitionStatus) {
  switch (status) {
    case "draft":
      return "border-white/15 bg-white/5 text-white/70";
    case "submitted":
    case "manager_approval":
    case "finance_approval":
    case "purchasing":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    case "po_created":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    case "rejected":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/15 bg-white/5 text-white/70";
  }
}

export function poStatusClass(status: PurchaseOrderStatus) {
  switch (status) {
    case "draft":
      return "border-white/15 bg-white/5 text-white/70";
    case "sent":
    case "acknowledged":
      return "border-sky-400/30 bg-sky-500/10 text-sky-100";
    case "partially_received":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    case "received":
    case "invoiced":
    case "closed":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    case "cancelled":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/15 bg-white/5 text-white/70";
  }
}

export function matchStatusClass(status: SupplierInvoiceMatch["matchStatus"]) {
  switch (status) {
    case "matched":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    case "pending":
      return "border-sky-400/30 bg-sky-500/10 text-sky-100";
    default:
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMatrix = {
  employee: {
    createRequisition: true,
    approveManager: false,
    approveFinance: false,
    createPo: false,
    receiveGoods: false,
    matchInvoices: false,
    manageSuppliers: false,
    manageContracts: false,
    configureWorkflows: false,
    viewReports: false,
  },
  department_manager: {
    createRequisition: true,
    approveManager: true,
    approveFinance: false,
    createPo: false,
    receiveGoods: false,
    matchInvoices: false,
    manageSuppliers: false,
    manageContracts: false,
    configureWorkflows: false,
    viewReports: true,
  },
  purchasing_officer: {
    createRequisition: true,
    approveManager: false,
    approveFinance: false,
    createPo: true,
    receiveGoods: true,
    matchInvoices: false,
    manageSuppliers: true,
    manageContracts: true,
    configureWorkflows: false,
    viewReports: true,
  },
  finance: {
    createRequisition: false,
    approveManager: false,
    approveFinance: true,
    createPo: false,
    receiveGoods: false,
    matchInvoices: true,
    manageSuppliers: false,
    manageContracts: true,
    configureWorkflows: false,
    viewReports: true,
  },
  operations_manager: {
    createRequisition: true,
    approveManager: true,
    approveFinance: false,
    createPo: true,
    receiveGoods: true,
    matchInvoices: false,
    manageSuppliers: true,
    manageContracts: true,
    configureWorkflows: false,
    viewReports: true,
  },
  administrator: {
    createRequisition: true,
    approveManager: true,
    approveFinance: true,
    createPo: true,
    receiveGoods: true,
    matchInvoices: true,
    manageSuppliers: true,
    manageContracts: true,
    configureWorkflows: true,
    viewReports: true,
  },
};
