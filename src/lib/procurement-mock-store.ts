/**
 * Client-side Procurement mock store for demos.
 * Future: swap for GET/POST /api/procurement/... endpoints.
 */

import {
  calcPoTotals,
  DEFAULT_ROLE_PERMISSIONS,
  type AiInsight,
  type ApprovalRule,
  type GoodsReceipt,
  type IntegrationConnector,
  type ProcurementDashboardSnapshot,
  type ProcurementLineItem,
  type ProcurementReportingSnapshot,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type PurchaseRequisition,
  type RequisitionStatus,
  type RolePermissionMatrix,
  type SupplierContract,
  type SupplierInvoiceMatch,
  type SupplierRecord,
} from "@/lib/procurement-data";

type Listener = () => void;

export type ProcurementMockState = {
  suppliers: SupplierRecord[];
  requisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  invoiceMatches: SupplierInvoiceMatch[];
  approvalRules: ApprovalRule[];
  contracts: SupplierContract[];
  aiInsights: AiInsight[];
  integrations: IntegrationConnector[];
  rolePermissions: RolePermissionMatrix;
  currentRole: keyof RolePermissionMatrix;
  monthlyBudget: number;
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

function line(partial: Partial<ProcurementLineItem> & { item: string }): ProcurementLineItem {
  return {
    id: partial.id ?? uid("line"),
    item: partial.item,
    description: partial.description ?? partial.item,
    sku: partial.sku ?? `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
    quantity: partial.quantity ?? 1,
    unit: partial.unit ?? "ea",
    unitPrice: partial.unitPrice ?? partial.estimatedCost ?? 0,
    estimatedCost: partial.estimatedCost ?? partial.unitPrice ?? 0,
    taxPct: partial.taxPct ?? 21,
    discountPct: partial.discountPct ?? 0,
    preferredSupplierId: partial.preferredSupplierId ?? "",
    preferredSupplierName: partial.preferredSupplierName ?? "",
  };
}

function seedState(): ProcurementMockState {
  const suppliers: SupplierRecord[] = [
    {
      id: "sup-rs",
      companyName: "RS Components Iberia",
      contacts: [{ name: "Elena Vázquez", email: "elena@rs-components.example", phone: "+34 900 100 200", role: "Account Manager" }],
      addresses: [{ label: "HQ", line1: "Calle Industria 12", city: "Madrid", country: "Spain", postcode: "28001" }],
      taxId: "ESB12345678",
      paymentTerms: "Net 30",
      bankDetails: "ES91 2100 0418 4502 0005 1332",
      preferred: true,
      insuranceExpiry: isoDaysFromNow(120),
      contractExpiry: isoDaysFromNow(200),
      rating: 4.6,
      performanceScore: 92,
      onTimeDeliveryPct: 96,
      qualityScore: 94,
      priceCompetitiveness: 88,
      averageLeadTimeDays: 4,
      totalSpend: 128400,
      notes: "Preferred for electrical and tooling consumables.",
      documents: [{ id: uid("doc"), name: "Master supply agreement.pdf", uploadedAt: isoDaysFromNow(-90), kind: "contract" }],
      category: "Industrial Supplies",
      currency: "EUR",
      status: "active",
    },
    {
      id: "sup-dji",
      companyName: "DJI Enterprise Europe",
      contacts: [{ name: "Marco Rossi", email: "marco@dji-enterprise.example", phone: "+39 02 1234 567", role: "Sales" }],
      addresses: [{ label: "EU Hub", line1: "Via Aeroporto 8", city: "Milan", country: "Italy", postcode: "20100" }],
      taxId: "IT0987654321",
      paymentTerms: "Net 45",
      bankDetails: "IT60 X054 ACCT-000005",
      preferred: true,
      insuranceExpiry: isoDaysFromNow(60),
      contractExpiry: isoDaysFromNow(40),
      rating: 4.8,
      performanceScore: 95,
      onTimeDeliveryPct: 91,
      qualityScore: 98,
      priceCompetitiveness: 72,
      averageLeadTimeDays: 12,
      totalSpend: 286000,
      notes: "Aircraft, payloads, and OEM spares.",
      documents: [],
      category: "Aircraft & Payloads",
      currency: "EUR",
      status: "active",
    },
    {
      id: "sup-it",
      companyName: "Nordic IT Solutions",
      contacts: [{ name: "Sara Lind", email: "sara@nordic-it.example", phone: "+46 8 555 010", role: "Procurement" }],
      addresses: [{ label: "Office", line1: "Storgatan 4", city: "Stockholm", country: "Sweden", postcode: "11122" }],
      taxId: "SE5566778899",
      paymentTerms: "Net 14",
      bankDetails: "SE45 5000 0000 0583 9825 7466",
      preferred: false,
      insuranceExpiry: isoDaysFromNow(300),
      contractExpiry: isoDaysFromNow(400),
      rating: 4.1,
      performanceScore: 84,
      onTimeDeliveryPct: 89,
      qualityScore: 86,
      priceCompetitiveness: 90,
      averageLeadTimeDays: 7,
      totalSpend: 64200,
      notes: "Laptops, docking stations, monitors.",
      documents: [],
      category: "IT Hardware",
      currency: "EUR",
      status: "active",
    },
    {
      id: "sup-log",
      companyName: "Iberia Freight Partners",
      contacts: [{ name: "José Martín", email: "jose@iberiafreight.example", phone: "+34 930 222 111", role: "Ops" }],
      addresses: [{ label: "Depot", line1: "Polígono Zona Franca", city: "Barcelona", country: "Spain", postcode: "08040" }],
      taxId: "ESB87654321",
      paymentTerms: "Net 30",
      bankDetails: "ES80 2310 0001 1800 0001 2345",
      preferred: false,
      insuranceExpiry: isoDaysFromNow(15),
      contractExpiry: isoDaysFromNow(90),
      rating: 3.9,
      performanceScore: 78,
      onTimeDeliveryPct: 82,
      qualityScore: 80,
      priceCompetitiveness: 85,
      averageLeadTimeDays: 3,
      totalSpend: 41800,
      notes: "Courier and palletised inbound.",
      documents: [],
      category: "Logistics Services",
      currency: "EUR",
      status: "active",
    },
  ];

  const requisitions: PurchaseRequisition[] = [
    {
      id: "req-1",
      requestNumber: "PR-2026-0042",
      requestDate: isoDaysFromNow(-3),
      requestedBy: "Alex Rivera",
      department: "Operations",
      costCentre: "OPS-BCN",
      priority: "high",
      requiredDate: isoDaysFromNow(10),
      businessJustification: "Replace damaged battery packs ahead of summer field campaign.",
      budgetCode: "BUD-OPS-26",
      status: "manager_approval",
      lines: [
        line({
          item: "TB60 Intelligent Battery",
          description: "Matrice 300/350 compatible",
          sku: "DJI-TB60",
          quantity: 6,
          unitPrice: 890,
          estimatedCost: 890,
          preferredSupplierId: "sup-dji",
          preferredSupplierName: "DJI Enterprise Europe",
        }),
      ],
      attachments: [{ id: uid("att"), name: "Field damage photos.zip", uploadedAt: isoDaysFromNow(-3), kind: "photo" }],
      approvalHistory: [
        {
          id: uid("ap"),
          at: isoDaysFromNow(-3),
          actor: "Alex Rivera",
          role: "employee",
          action: "submitted",
          note: "Submitted for manager approval",
        },
      ],
      linkedPoId: null,
      createdAt: isoDaysFromNow(-3),
      updatedAt: isoDaysFromNow(-3),
    },
    {
      id: "req-2",
      requestNumber: "PR-2026-0041",
      requestDate: isoDaysFromNow(-8),
      requestedBy: "Priya Shah",
      department: "Engineering",
      costCentre: "ENG-OXF",
      priority: "normal",
      requiredDate: isoDaysFromNow(21),
      businessJustification: "Workstation refresh for new hire cohort.",
      budgetCode: "BUD-IT-26",
      status: "finance_approval",
      lines: [
        line({
          item: "Laptop 16\" Pro",
          sku: "NIT-LP16",
          quantity: 4,
          unitPrice: 1890,
          preferredSupplierId: "sup-it",
          preferredSupplierName: "Nordic IT Solutions",
        }),
        line({
          item: "USB-C Dock",
          sku: "NIT-DOCK",
          quantity: 4,
          unitPrice: 210,
          preferredSupplierId: "sup-it",
          preferredSupplierName: "Nordic IT Solutions",
        }),
      ],
      attachments: [],
      approvalHistory: [
        {
          id: uid("ap"),
          at: isoDaysFromNow(-8),
          actor: "Priya Shah",
          role: "employee",
          action: "submitted",
          note: "Submitted",
        },
        {
          id: uid("ap"),
          at: isoDaysFromNow(-6),
          actor: "James Cole",
          role: "department_manager",
          action: "approved",
          note: "Approved — within eng budget",
        },
      ],
      linkedPoId: null,
      createdAt: isoDaysFromNow(-8),
      updatedAt: isoDaysFromNow(-6),
    },
    {
      id: "req-3",
      requestNumber: "PR-2026-0038",
      requestDate: isoDaysFromNow(-18),
      requestedBy: "Sam Okonkwo",
      department: "Technical",
      costCentre: "TEC-BCN",
      priority: "urgent",
      requiredDate: isoDaysFromNow(2),
      businessJustification: "Safety stock for connector kits.",
      budgetCode: "BUD-TEC-26",
      status: "po_created",
      lines: [
        line({
          item: "Aviation connector kit",
          sku: "RS-AVC-12",
          quantity: 20,
          unitPrice: 48,
          preferredSupplierId: "sup-rs",
          preferredSupplierName: "RS Components Iberia",
        }),
      ],
      attachments: [],
      approvalHistory: [
        {
          id: uid("ap"),
          at: isoDaysFromNow(-18),
          actor: "Sam Okonkwo",
          role: "employee",
          action: "submitted",
          note: "Submitted",
        },
        {
          id: uid("ap"),
          at: isoDaysFromNow(-17),
          actor: "James Cole",
          role: "department_manager",
          action: "approved",
          note: "Approved",
        },
        {
          id: uid("ap"),
          at: isoDaysFromNow(-16),
          actor: "Mia Chen",
          role: "finance",
          action: "approved",
          note: "Finance approved",
        },
      ],
      linkedPoId: "po-1",
      createdAt: isoDaysFromNow(-18),
      updatedAt: isoDaysFromNow(-14),
    },
  ];

  const poLines1 = [
    line({
      item: "Aviation connector kit",
      sku: "RS-AVC-12",
      quantity: 20,
      unitPrice: 48,
      preferredSupplierId: "sup-rs",
      preferredSupplierName: "RS Components Iberia",
    }),
  ];
  const totals1 = calcPoTotals(poLines1);

  const poLines2 = [
    line({
      item: "M350 RTK Aircraft",
      sku: "DJI-M350",
      quantity: 1,
      unitPrice: 12400,
      preferredSupplierId: "sup-dji",
      preferredSupplierName: "DJI Enterprise Europe",
    }),
    line({
      item: "Zenmuse H20T",
      sku: "DJI-H20T",
      quantity: 1,
      unitPrice: 9800,
      preferredSupplierId: "sup-dji",
      preferredSupplierName: "DJI Enterprise Europe",
    }),
  ];
  const totals2 = calcPoTotals(poLines2);

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: "po-1",
      poNumber: "PO-2026-0118",
      supplierId: "sup-rs",
      supplierName: "RS Components Iberia",
      supplierContact: "Elena Vázquez <elena@rs-components.example>",
      deliveryAddress: "Unit311 Central, Carrer de la Marina 16, Barcelona 08005",
      billingAddress: "Unit311 Central Finance, Carrer de la Marina 16, Barcelona 08005",
      currency: "EUR",
      paymentTerms: "Net 30",
      expectedDelivery: isoDaysFromNow(5),
      status: "partially_received",
      requisitionId: "req-3",
      lines: poLines1,
      notes: "Partial delivery expected for first 12 units.",
      ...totals1,
      emailedAt: isoDaysFromNow(-12),
      createdAt: isoDaysFromNow(-14),
      updatedAt: isoDaysFromNow(-2),
    },
    {
      id: "po-2",
      poNumber: "PO-2026-0121",
      supplierId: "sup-dji",
      supplierName: "DJI Enterprise Europe",
      supplierContact: "Marco Rossi <marco@dji-enterprise.example>",
      deliveryAddress: "Unit311 Central, Carrer de la Marina 16, Barcelona 08005",
      billingAddress: "Unit311 Central Finance, Carrer de la Marina 16, Barcelona 08005",
      currency: "EUR",
      paymentTerms: "Net 45",
      expectedDelivery: isoDaysFromNow(18),
      status: "sent",
      requisitionId: null,
      lines: poLines2,
      notes: "Include export compliance docs.",
      ...totals2,
      emailedAt: isoDaysFromNow(-4),
      createdAt: isoDaysFromNow(-4),
      updatedAt: isoDaysFromNow(-4),
    },
    {
      id: "po-3",
      poNumber: "PO-2026-0109",
      supplierId: "sup-it",
      supplierName: "Nordic IT Solutions",
      supplierContact: "Sara Lind <sara@nordic-it.example>",
      deliveryAddress: "Unit311 Oxford Hub, 14 Innovation Way, OX1 1AA",
      billingAddress: "Unit311 Central Finance, Barcelona 08005",
      currency: "EUR",
      paymentTerms: "Net 14",
      expectedDelivery: isoDaysFromNow(-6),
      status: "received",
      requisitionId: null,
      lines: [
        line({
          item: "Laptop 16\" Pro",
          sku: "NIT-LP16",
          quantity: 2,
          unitPrice: 1890,
          preferredSupplierId: "sup-it",
          preferredSupplierName: "Nordic IT Solutions",
        }),
      ],
      notes: "",
      ...calcPoTotals([
        line({
          item: "Laptop 16\" Pro",
          sku: "NIT-LP16",
          quantity: 2,
          unitPrice: 1890,
          preferredSupplierId: "sup-it",
          preferredSupplierName: "Nordic IT Solutions",
        }),
      ]),
      emailedAt: isoDaysFromNow(-20),
      createdAt: isoDaysFromNow(-22),
      updatedAt: isoDaysFromNow(-6),
    },
  ];

  const goodsReceipts: GoodsReceipt[] = [
    {
      id: "gr-1",
      receiptNumber: "GR-2026-0088",
      poId: "po-1",
      poNumber: "PO-2026-0118",
      supplierName: "RS Components Iberia",
      deliveryDate: isoDaysFromNow(-2),
      receivedBy: "Luis Fernández",
      lines: [
        {
          lineId: poLines1[0].id,
          item: "Aviation connector kit",
          orderedQty: 20,
          receivedQty: 12,
          damagedQty: 0,
          backOrderQty: 8,
        },
      ],
      photos: [{ id: uid("ph"), name: "delivery-pallet.jpg", uploadedAt: isoDaysFromNow(-2), kind: "photo" }],
      notes: "Pallet intact. Remaining 8 units on back order.",
      inventoryUpdated: true,
      createdAt: isoDaysFromNow(-2),
    },
    {
      id: "gr-2",
      receiptNumber: "GR-2026-0079",
      poId: "po-3",
      poNumber: "PO-2026-0109",
      supplierName: "Nordic IT Solutions",
      deliveryDate: isoDaysFromNow(-6),
      receivedBy: "Priya Shah",
      lines: [
        {
          lineId: "line-laptop",
          item: "Laptop 16\" Pro",
          orderedQty: 2,
          receivedQty: 2,
          damagedQty: 0,
          backOrderQty: 0,
        },
      ],
      photos: [],
      notes: "Full delivery — asset tags applied.",
      inventoryUpdated: true,
      createdAt: isoDaysFromNow(-6),
    },
  ];

  const invoiceMatches: SupplierInvoiceMatch[] = [
    {
      id: "inv-1",
      invoiceNumber: "INV-RS-55421",
      supplierId: "sup-rs",
      supplierName: "RS Components Iberia",
      poId: "po-1",
      poNumber: "PO-2026-0118",
      receiptId: "gr-1",
      receiptNumber: "GR-2026-0088",
      invoiceDate: isoDaysFromNow(-1),
      invoiceTotal: 1161.6,
      poTotal: totals1.grandTotal,
      receiptTotal: 12 * 48 * 1.21,
      currency: "EUR",
      matchStatus: "quantity_mismatch",
      mismatches: [
        "Invoice covers full PO quantity (20) but goods receipt shows 12 received.",
        "Recommend hold until back-ordered units arrive or credit note issued.",
      ],
      status: "awaiting_approval",
      createdAt: isoDaysFromNow(-1),
    },
    {
      id: "inv-2",
      invoiceNumber: "INV-NIT-9021",
      supplierId: "sup-it",
      supplierName: "Nordic IT Solutions",
      poId: "po-3",
      poNumber: "PO-2026-0109",
      receiptId: "gr-2",
      receiptNumber: "GR-2026-0079",
      invoiceDate: isoDaysFromNow(-5),
      invoiceTotal: 4573.8,
      poTotal: 4573.8,
      receiptTotal: 4573.8,
      currency: "EUR",
      matchStatus: "matched",
      mismatches: [],
      status: "approved",
      createdAt: isoDaysFromNow(-5),
    },
  ];

  const approvalRules: ApprovalRule[] = [
    {
      id: "rule-1",
      name: "Standard under €2,500",
      minValue: 0,
      maxValue: 2500,
      department: "any",
      businessUnit: "any",
      costCentre: "any",
      project: "any",
      levels: [{ level: 1, role: "department_manager", label: "Department Manager" }],
      active: true,
    },
    {
      id: "rule-2",
      name: "Mid-value €2,500–€15,000",
      minValue: 2500,
      maxValue: 15000,
      department: "any",
      businessUnit: "any",
      costCentre: "any",
      project: "any",
      levels: [
        { level: 1, role: "department_manager", label: "Department Manager" },
        { level: 2, role: "finance", label: "Finance" },
      ],
      active: true,
    },
    {
      id: "rule-3",
      name: "High-value over €15,000",
      minValue: 15000,
      maxValue: null,
      department: "any",
      businessUnit: "any",
      costCentre: "any",
      project: "any",
      levels: [
        { level: 1, role: "department_manager", label: "Department Manager" },
        { level: 2, role: "finance", label: "Finance" },
        { level: 3, role: "operations_manager", label: "Operations Manager" },
      ],
      active: true,
    },
  ];

  const contracts: SupplierContract[] = [
    {
      id: "ctr-1",
      title: "RS Components master supply agreement",
      supplierId: "sup-rs",
      supplierName: "RS Components Iberia",
      contractValue: 180000,
      currency: "EUR",
      startDate: isoDaysFromNow(-200),
      renewalDate: isoDaysFromNow(200),
      noticePeriodDays: 60,
      owner: "Mia Chen",
      status: "active",
      documents: [{ id: uid("doc"), name: "MSA-RS-2025.pdf", uploadedAt: isoDaysFromNow(-200), kind: "contract" }],
      reminderSent: false,
      notes: "Volume rebate tier at €150k annual.",
    },
    {
      id: "ctr-2",
      title: "DJI Enterprise framework",
      supplierId: "sup-dji",
      supplierName: "DJI Enterprise Europe",
      contractValue: 420000,
      currency: "EUR",
      startDate: isoDaysFromNow(-300),
      renewalDate: isoDaysFromNow(40),
      noticePeriodDays: 90,
      owner: "James Cole",
      status: "expiring_soon",
      documents: [],
      reminderSent: true,
      notes: "Renewal negotiation scheduled.",
    },
    {
      id: "ctr-3",
      title: "Iberia Freight rate card",
      supplierId: "sup-log",
      supplierName: "Iberia Freight Partners",
      contractValue: 52000,
      currency: "EUR",
      startDate: isoDaysFromNow(-100),
      renewalDate: isoDaysFromNow(90),
      noticePeriodDays: 30,
      owner: "Luis Fernández",
      status: "active",
      documents: [],
      reminderSent: false,
      notes: "",
    },
  ];

  const aiInsights: AiInsight[] = [
    {
      id: "ai-1",
      kind: "preferred_supplier",
      title: "Prefer RS Components for connector kits",
      detail:
        "Based on 14 historical purchases, RS Components delivered 96% on time at 8% lower unit cost than alternate vendors.",
      confidence: 0.91,
      actionLabel: "Apply preferred supplier",
      relatedIds: ["sup-rs"],
      createdAt: isoDaysFromNow(0),
    },
    {
      id: "ai-2",
      kind: "cost_saving",
      title: "Consolidate laptop docks into Nordic IT order",
      detail: "Combining the open Engineering requisition with the next IT cycle could save ~€180 in shipping and admin.",
      confidence: 0.84,
      actionLabel: "Review requisition PR-2026-0041",
      relatedIds: ["req-2"],
      createdAt: isoDaysFromNow(0),
    },
    {
      id: "ai-3",
      kind: "duplicate_purchase",
      title: "Possible duplicate battery request",
      detail: "PR-2026-0042 overlaps with a TB60 stock receipt logged in Inventory 11 days ago (4 units still available).",
      confidence: 0.77,
      actionLabel: "Check inventory first",
      relatedIds: ["req-1"],
      createdAt: isoDaysFromNow(-1),
    },
    {
      id: "ai-4",
      kind: "unusual_spend",
      title: "Aircraft spend above 3-month average",
      detail: "DJI category spend is 42% above the trailing 3-month average due to PO-2026-0121.",
      confidence: 0.88,
      actionLabel: "Open spend report",
      relatedIds: ["po-2"],
      createdAt: isoDaysFromNow(0),
    },
    {
      id: "ai-5",
      kind: "replenishment",
      title: "Predict restock for aviation connectors",
      detail: "At current burn rate, connector kit safety stock falls below reorder point in ~18 days.",
      confidence: 0.82,
      actionLabel: "Create replenishment PR",
      relatedIds: ["sup-rs"],
      createdAt: isoDaysFromNow(0),
    },
    {
      id: "ai-6",
      kind: "supplier_summary",
      title: "DJI Enterprise performance summary",
      detail:
        "Quality 98, on-time 91%, lead time 12 days. Strong quality; watch lead times on urgent campaign buys.",
      confidence: 0.93,
      actionLabel: "Open supplier card",
      relatedIds: ["sup-dji"],
      createdAt: isoDaysFromNow(0),
    },
  ];

  const integrations: IntegrationConnector[] = [
    {
      id: "int-xero",
      platform: "Xero",
      status: "connected",
      lastSyncAt: isoDaysFromNow(-1),
      syncPurchaseOrders: true,
      syncInvoices: true,
      notes: "POs post as bills drafts; matched invoices sync as payable.",
    },
    {
      id: "int-qb",
      platform: "QuickBooks",
      status: "available",
      lastSyncAt: null,
      syncPurchaseOrders: true,
      syncInvoices: true,
      notes: "Connect to push POs and supplier bills.",
    },
    {
      id: "int-sage",
      platform: "Sage",
      status: "available",
      lastSyncAt: null,
      syncPurchaseOrders: true,
      syncInvoices: true,
      notes: "",
    },
    {
      id: "int-dyn",
      platform: "Microsoft Dynamics",
      status: "available",
      lastSyncAt: null,
      syncPurchaseOrders: true,
      syncInvoices: true,
      notes: "",
    },
    {
      id: "int-sap",
      platform: "SAP Business One",
      status: "error",
      lastSyncAt: isoDaysFromNow(-12),
      syncPurchaseOrders: true,
      syncInvoices: true,
      notes: "OAuth token expired — reconnect required.",
    },
  ];

  return {
    suppliers,
    requisitions,
    purchaseOrders,
    goodsReceipts,
    invoiceMatches,
    approvalRules,
    contracts,
    aiInsights,
    integrations,
    rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    currentRole: "purchasing_officer",
    monthlyBudget: 85000,
  };
}

let state: ProcurementMockState = seedState();
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: ProcurementMockState) {
  state = next;
  emit();
}

export function subscribeProcurementMockStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProcurementMockSnapshot() {
  return state;
}

export function setProcurementRole(role: keyof RolePermissionMatrix) {
  setState({ ...state, currentRole: role });
}

export function upsertSupplier(input: SupplierRecord) {
  const existing = state.suppliers.some((s) => s.id === input.id);
  setState({
    ...state,
    suppliers: existing
      ? state.suppliers.map((s) => (s.id === input.id ? input : s))
      : [input, ...state.suppliers],
  });
}

export function createRequisition(draft: Omit<PurchaseRequisition, "id" | "createdAt" | "updatedAt" | "approvalHistory" | "linkedPoId">) {
  const now = isoDaysFromNow(0);
  const req: PurchaseRequisition = {
    ...draft,
    id: uid("req"),
    linkedPoId: null,
    approvalHistory:
      draft.status === "draft"
        ? []
        : [
            {
              id: uid("ap"),
              at: now,
              actor: draft.requestedBy,
              role: "employee",
              action: "submitted",
              note: "Submitted for approval",
            },
          ],
    createdAt: now,
    updatedAt: now,
  };
  setState({ ...state, requisitions: [req, ...state.requisitions] });
  return req;
}

export function advanceRequisition(
  id: string,
  nextStatus: RequisitionStatus,
  actor: string,
  role: string,
  note: string,
) {
  setState({
    ...state,
    requisitions: state.requisitions.map((req) => {
      if (req.id !== id) return req;
      const action =
        nextStatus === "rejected" ? "rejected" : nextStatus === "submitted" ? "submitted" : "approved";
      return {
        ...req,
        status: nextStatus,
        updatedAt: isoDaysFromNow(0),
        approvalHistory: [
          {
            id: uid("ap"),
            at: isoDaysFromNow(0),
            actor,
            role,
            action,
            note,
          },
          ...req.approvalHistory,
        ],
      };
    }),
  });
}

export function createPurchaseOrderFromDraft(
  draft: Omit<PurchaseOrder, "id" | "subtotal" | "taxTotal" | "discountTotal" | "grandTotal" | "createdAt" | "updatedAt" | "emailedAt">,
) {
  const totals = calcPoTotals(draft.lines);
  const po: PurchaseOrder = {
    ...draft,
    id: uid("po"),
    ...totals,
    emailedAt: null,
    createdAt: isoDaysFromNow(0),
    updatedAt: isoDaysFromNow(0),
  };
  setState({ ...state, purchaseOrders: [po, ...state.purchaseOrders] });
  return po;
}

export function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  setState({
    ...state,
    purchaseOrders: state.purchaseOrders.map((po) =>
      po.id === id ? { ...po, status, updatedAt: isoDaysFromNow(0) } : po,
    ),
  });
}

export function markPurchaseOrderEmailed(id: string) {
  setState({
    ...state,
    purchaseOrders: state.purchaseOrders.map((po) =>
      po.id === id ? { ...po, emailedAt: isoDaysFromNow(0), status: po.status === "draft" ? "sent" : po.status } : po,
    ),
  });
}

export function createGoodsReceipt(input: Omit<GoodsReceipt, "id" | "createdAt">) {
  const receipt: GoodsReceipt = {
    ...input,
    id: uid("gr"),
    createdAt: isoDaysFromNow(0),
    inventoryUpdated: true,
  };
  const relatedPo = state.purchaseOrders.find((po) => po.id === input.poId);
  let nextPos = state.purchaseOrders;
  if (relatedPo) {
    const fullyReceived = input.lines.every((l) => l.backOrderQty === 0 && l.receivedQty >= l.orderedQty);
    nextPos = state.purchaseOrders.map((po) =>
      po.id === input.poId
        ? {
            ...po,
            status: fullyReceived ? "received" : "partially_received",
            updatedAt: isoDaysFromNow(0),
          }
        : po,
    );
  }
  setState({
    ...state,
    goodsReceipts: [receipt, ...state.goodsReceipts],
    purchaseOrders: nextPos,
  });
  return receipt;
}

export function approveInvoiceMatch(id: string, approve: boolean) {
  setState({
    ...state,
    invoiceMatches: state.invoiceMatches.map((inv) =>
      inv.id === id
        ? { ...inv, status: approve ? "approved" : "rejected", matchStatus: approve ? inv.matchStatus : inv.matchStatus }
        : inv,
    ),
  });
}

export function upsertContract(contract: SupplierContract) {
  const exists = state.contracts.some((c) => c.id === contract.id);
  setState({
    ...state,
    contracts: exists
      ? state.contracts.map((c) => (c.id === contract.id ? contract : c))
      : [contract, ...state.contracts],
  });
}

export function toggleIntegration(id: string) {
  setState({
    ...state,
    integrations: state.integrations.map((row) => {
      if (row.id !== id) return row;
      if (row.status === "connected") {
        return { ...row, status: "available", lastSyncAt: null };
      }
      return { ...row, status: "connected", lastSyncAt: isoDaysFromNow(0), notes: row.notes.replace(/OAuth.*/, "").trim() };
    }),
  });
}

export function buildDashboardSnapshot(snapshot: ProcurementMockState = state): ProcurementDashboardSnapshot {
  const awaiting = snapshot.requisitions.filter((r) =>
    ["submitted", "manager_approval", "finance_approval", "purchasing"].includes(r.status),
  ).length;
  const outstanding = snapshot.purchaseOrders.filter((po) =>
    ["draft", "sent", "acknowledged", "partially_received"].includes(po.status),
  ).length;
  const receivedMonth = snapshot.goodsReceipts.filter((gr) => gr.deliveryDate >= isoDaysFromNow(-30)).length;
  const perf =
    snapshot.suppliers.reduce((sum, s) => sum + s.performanceScore, 0) /
    Math.max(snapshot.suppliers.length, 1);
  const spendThisMonth = snapshot.purchaseOrders
    .filter((po) => po.createdAt >= isoDaysFromNow(-30) && po.status !== "cancelled")
    .reduce((sum, po) => sum + po.grandTotal, 0);
  const openDeliveries = snapshot.purchaseOrders.filter((po) =>
    ["sent", "acknowledged", "partially_received"].includes(po.status),
  ).length;

  const monthlySpend = Array.from({ length: 6 }).map((_, idx) => {
    const offset = idx - 5;
    const labelDate = new Date();
    labelDate.setMonth(labelDate.getMonth() + offset);
    const month = labelDate.toLocaleString("en-GB", { month: "short" });
    const base = 28000 + idx * 4200 + (idx % 2 === 0 ? 6000 : 0);
    return { month, spend: base };
  });

  const spendBySupplier = snapshot.suppliers
    .map((s) => ({ name: s.companyName, spend: s.totalSpend }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 6);

  const deptMap = new Map<string, number>();
  for (const req of snapshot.requisitions) {
    const value = req.lines.reduce((sum, l) => sum + l.quantity * (l.unitPrice || l.estimatedCost), 0);
    deptMap.set(req.department, (deptMap.get(req.department) ?? 0) + value);
  }
  const spendByDepartment = [...deptMap.entries()].map(([name, spend]) => ({ name, spend }));

  const statusMap = new Map<string, number>();
  for (const po of snapshot.purchaseOrders) {
    statusMap.set(po.status, (statusMap.get(po.status) ?? 0) + 1);
  }
  const poStatusBreakdown = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

  return {
    requisitionsAwaitingApproval: awaiting,
    purchaseOrdersOutstanding: outstanding,
    ordersReceivedThisMonth: receivedMonth,
    supplierPerformanceAvg: Math.round(perf),
    spendThisMonth,
    budgetVsActualPct: Math.round((spendThisMonth / snapshot.monthlyBudget) * 100),
    averageApprovalHours: 18,
    openDeliveries,
    monthlySpend,
    spendBySupplier,
    spendByDepartment,
    poStatusBreakdown,
  };
}

export function buildReportingSnapshot(snapshot: ProcurementMockState = state): ProcurementReportingSnapshot {
  const totalSpendYtd = snapshot.suppliers.reduce((sum, s) => sum + s.totalSpend, 0);
  const outstandingPoValue = snapshot.purchaseOrders
    .filter((po) => ["sent", "acknowledged", "partially_received"].includes(po.status))
    .reduce((sum, po) => sum + po.grandTotal, 0);
  const contractsRenewingSoon = snapshot.contracts.filter((c) => c.status === "expiring_soon").length;
  const spendByCategory = Object.entries(
    snapshot.suppliers.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] ?? 0) + s.totalSpend;
      return acc;
    }, {}),
  ).map(([category, spend]) => ({ category, spend }));

  return {
    totalSpendYtd,
    savingsAchieved: 18400,
    budgetUtilisationPct: 74,
    outstandingPoValue,
    contractsRenewingSoon,
    spendByCategory,
    spendByDepartment: buildDashboardSnapshot(snapshot).spendByDepartment,
    supplierPerformance: snapshot.suppliers.map((s) => ({
      name: s.companyName,
      score: s.performanceScore,
      onTime: s.onTimeDeliveryPct,
    })),
  };
}

export function nextRequestNumber() {
  const nums = state.requisitions
    .map((r) => /PR-\d+-(\d+)/.exec(r.requestNumber)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
  const next = (nums.length ? Math.max(...nums) : 40) + 1;
  return `PR-2026-${String(next).padStart(4, "0")}`;
}

export function nextPoNumber() {
  const nums = state.purchaseOrders
    .map((p) => /PO-\d+-(\d+)/.exec(p.poNumber)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
  const next = (nums.length ? Math.max(...nums) : 100) + 1;
  return `PO-2026-${String(next).padStart(4, "0")}`;
}

export function nextReceiptNumber() {
  const nums = state.goodsReceipts
    .map((g) => /GR-\d+-(\d+)/.exec(g.receiptNumber)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
  const next = (nums.length ? Math.max(...nums) : 70) + 1;
  return `GR-2026-${String(next).padStart(4, "0")}`;
}
