"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Mail,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  PROCUREMENT_MODULE_TABS,
  PROCUREMENT_ROLE_LABELS,
  PROCUREMENT_ROLES,
  PO_STATUS_LABELS,
  REQUISITION_STATUS_LABELS,
  calcPoTotals,
  lineTotal,
  matchStatusClass,
  money,
  moneyExact,
  poStatusClass,
  requisitionStatusClass,
  type ProcurementLineItem,
  type ProcurementModuleTab,
  type ProcurementPriority,
  type ProcurementRole,
  type PurchaseOrder,
  type PurchaseRequisition,
  type RequisitionStatus,
  type RolePermissionMatrix,
} from "@/lib/procurement-data";
import {
  advanceRequisition,
  approveInvoiceMatch,
  buildDashboardSnapshot,
  buildReportingSnapshot,
  createGoodsReceipt,
  createPurchaseOrderFromDraft,
  createRequisition,
  isoDaysFromNow,
  markPurchaseOrderEmailed,
  nextPoNumber,
  nextReceiptNumber,
  nextRequestNumber,
  setProcurementRole,
  toggleIntegration,
  uid,
} from "@/lib/procurement-mock-store";
import { downloadPurchaseOrderPdf } from "@/lib/procurement-pdf-service";
import { cn } from "@/lib/utils";
import { useProcurementMockStore } from "./useProcurementMockStore";
import {
  ProcurementFieldLabel,
  ProcurementKpiTile,
  ProcurementSection,
  ProcurementStatusPill,
  procurementInputClass,
  procurementPrimaryButtonClass,
  procurementSecondaryButtonClass,
} from "./procurement-ui";

const CHART_COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#94a3b8"];

const PERMISSION_COLUMNS: Array<{ key: keyof RolePermissionMatrix[ProcurementRole]; label: string }> = [
  { key: "createRequisition", label: "Create PR" },
  { key: "approveManager", label: "Mgr Approve" },
  { key: "approveFinance", label: "Finance" },
  { key: "createPo", label: "Create PO" },
  { key: "receiveGoods", label: "Receive" },
  { key: "matchInvoices", label: "Match Inv" },
  { key: "manageSuppliers", label: "Suppliers" },
  { key: "manageContracts", label: "Contracts" },
  { key: "configureWorkflows", label: "Workflows" },
  { key: "viewReports", label: "Reports" },
];

const AI_KIND_LABELS: Record<string, string> = {
  preferred_supplier: "Preferred supplier",
  cost_saving: "Cost saving",
  duplicate_purchase: "Duplicate purchase",
  unusual_spend: "Unusual spend",
  replenishment: "Replenishment",
  supplier_summary: "Supplier summary",
};

const DEFAULT_DELIVERY = "Unit311 Central, Carrer de la Marina 16, Barcelona 08005";
const DEFAULT_BILLING = "Unit311 Central Finance, Carrer de la Marina 16, Barcelona 08005";

function emptyLine(partial?: Partial<ProcurementLineItem>): ProcurementLineItem {
  return {
    id: uid("line"),
    item: "",
    description: "",
    sku: "",
    quantity: 1,
    unit: "ea",
    unitPrice: 0,
    estimatedCost: 0,
    taxPct: 21,
    discountPct: 0,
    preferredSupplierId: "",
    preferredSupplierName: "",
    ...partial,
  };
}

function nextRequisitionStatus(status: RequisitionStatus): RequisitionStatus | null {
  switch (status) {
    case "draft":
      return "submitted";
    case "submitted":
      return "manager_approval";
    case "manager_approval":
      return "finance_approval";
    case "finance_approval":
      return "purchasing";
    case "purchasing":
      return "po_created";
    default:
      return null;
  }
}

function advanceLabel(status: RequisitionStatus): string {
  switch (status) {
    case "draft":
      return "Submit";
    case "submitted":
      return "Send to manager";
    case "manager_approval":
      return "Approve (manager)";
    case "finance_approval":
      return "Approve (finance)";
    case "purchasing":
      return "Mark PO created";
    default:
      return "Advance";
  }
}

function LineItemsEditor({
  lines,
  onChange,
  currency = "EUR",
}: {
  lines: ProcurementLineItem[];
  onChange: (lines: ProcurementLineItem[]) => void;
  currency?: string;
}) {
  const totals = calcPoTotals(lines);

  function patch(id: string, patch: Partial<ProcurementLineItem>) {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };
        if (patch.unitPrice !== undefined && patch.estimatedCost === undefined) {
          next.estimatedCost = patch.unitPrice;
        }
        return next;
      }),
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/45">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Unit €</th>
              <th className="px-3 py-2 font-medium">Tax%</th>
              <th className="px-3 py-2 font-medium">Disc%</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-white/10">
                <td className="px-2 py-1.5">
                  <input
                    className={cn(procurementInputClass(), "mt-0 min-w-[9rem]")}
                    value={line.item}
                    onChange={(e) =>
                      patch(line.id, { item: e.target.value, description: e.target.value || line.description })
                    }
                    placeholder="Item"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className={cn(procurementInputClass(), "mt-0 w-24")}
                    value={line.sku}
                    onChange={(e) => patch(line.id, { sku: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    className={cn(procurementInputClass(), "mt-0 w-16")}
                    value={line.quantity}
                    onChange={(e) => patch(line.id, { quantity: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(procurementInputClass(), "mt-0 w-24")}
                    value={line.unitPrice}
                    onChange={(e) => patch(line.id, { unitPrice: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    className={cn(procurementInputClass(), "mt-0 w-16")}
                    value={line.taxPct}
                    onChange={(e) => patch(line.id, { taxPct: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    className={cn(procurementInputClass(), "mt-0 w-16")}
                    value={line.discountPct}
                    onChange={(e) => patch(line.id, { discountPct: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-2 tabular-nums text-white/80">
                  {moneyExact(lineTotal(line).total, currency)}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-rose-200"
                    onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={procurementSecondaryButtonClass()}
          onClick={() => onChange([...lines, emptyLine()])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add line
        </button>
        <div className="flex flex-wrap gap-4 text-xs text-white/55">
          <span>
            Subtotal <strong className="text-white">{moneyExact(totals.subtotal, currency)}</strong>
          </span>
          <span>
            Tax <strong className="text-white">{moneyExact(totals.taxTotal, currency)}</strong>
          </span>
          <span>
            Total <strong className="text-sky-200">{moneyExact(totals.grandTotal, currency)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function ApprovalHistoryList({ entries }: { entries: PurchaseRequisition["approvalHistory"] }) {
  if (!entries.length) {
    return <p className="text-sm text-white/40">No approval history yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-white/90">
              {entry.actor}{" "}
              <span className="font-normal text-white/45">· {entry.role}</span>
            </span>
            <span className="text-xs text-white/40">{entry.at}</span>
          </div>
          <p className="mt-1 text-xs capitalize text-sky-200/90">{entry.action}</p>
          {entry.note ? <p className="mt-0.5 text-xs text-white/55">{entry.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default function ProcurementWorkspace() {
  const store = useProcurementMockStore();
  const [tab, setTab] = useState<ProcurementModuleTab>("Dashboard");
  const [toast, setToast] = useState<string | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [showReqForm, setShowReqForm] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);
  const [showGrForm, setShowGrForm] = useState(false);

  const [reqForm, setReqForm] = useState(() => ({
    requestNumber: nextRequestNumber(),
    requestDate: isoDaysFromNow(0),
    requestedBy: "Alex Rivera",
    department: "Operations",
    costCentre: "OPS-BCN",
    priority: "normal" as ProcurementPriority,
    requiredDate: isoDaysFromNow(14),
    businessJustification: "",
    budgetCode: "BUD-OPS-26",
    status: "draft" as RequisitionStatus,
    lines: [emptyLine()],
  }));

  const [poForm, setPoForm] = useState(() => ({
    poNumber: nextPoNumber(),
    supplierId: "",
    supplierContact: "",
    deliveryAddress: DEFAULT_DELIVERY,
    billingAddress: DEFAULT_BILLING,
    currency: "EUR",
    paymentTerms: "Net 30",
    expectedDelivery: isoDaysFromNow(14),
    status: "draft" as PurchaseOrder["status"],
    requisitionId: null as string | null,
    notes: "",
    lines: [emptyLine()],
  }));

  const [grForm, setGrForm] = useState({
    poId: "",
    deliveryDate: isoDaysFromNow(0),
    receivedBy: "Luis Fernández",
    notes: "",
    lines: [] as Array<{
      lineId: string;
      item: string;
      orderedQty: number;
      receivedQty: number;
      damagedQty: number;
      backOrderQty: number;
    }>,
  });

  const dashboard = useMemo(() => buildDashboardSnapshot(store), [store]);
  const reporting = useMemo(() => buildReportingSnapshot(store), [store]);

  const selectedReq =
    store.requisitions.find((r) => r.id === selectedReqId) ?? store.requisitions[0] ?? null;
  const selectedPo =
    store.purchaseOrders.find((p) => p.id === selectedPoId) ?? store.purchaseOrders[0] ?? null;

  const pendingApprovals = useMemo(
    () =>
      store.requisitions.filter((r) =>
        ["submitted", "manager_approval", "finance_approval", "purchasing"].includes(r.status),
      ),
    [store.requisitions],
  );

  const poStatusChart = useMemo(
    () =>
      dashboard.poStatusBreakdown.map((row) => ({
        name: PO_STATUS_LABELS[row.status as keyof typeof PO_STATUS_LABELS] ?? row.status,
        value: row.count,
      })),
    [dashboard.poStatusBreakdown],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function openNewRequisition() {
    setReqForm({
      requestNumber: nextRequestNumber(),
      requestDate: isoDaysFromNow(0),
      requestedBy: "Alex Rivera",
      department: "Operations",
      costCentre: "OPS-BCN",
      priority: "normal",
      requiredDate: isoDaysFromNow(14),
      businessJustification: "",
      budgetCode: "BUD-OPS-26",
      status: "draft",
      lines: [emptyLine()],
    });
    setShowReqForm(true);
  }

  function submitRequisition(asDraft: boolean) {
    if (!reqForm.businessJustification.trim() || !reqForm.lines.some((l) => l.item.trim())) {
      showToast("Add justification and at least one line item.");
      return;
    }
    const created = createRequisition({
      ...reqForm,
      status: asDraft ? "draft" : "submitted",
      lines: reqForm.lines.map((l) => ({
        ...l,
        description: l.description || l.item,
        estimatedCost: l.estimatedCost || l.unitPrice,
      })),
      attachments: [],
    });
    setSelectedReqId(created.id);
    setShowReqForm(false);
    showToast(asDraft ? "Draft requisition saved." : "Requisition submitted.");
  }

  function openNewPo() {
    const supplier = store.suppliers[0];
    setPoForm({
      poNumber: nextPoNumber(),
      supplierId: supplier?.id ?? "",
      supplierContact: supplier
        ? `${supplier.contacts[0]?.name ?? ""} <${supplier.contacts[0]?.email ?? ""}>`
        : "",
      deliveryAddress: DEFAULT_DELIVERY,
      billingAddress: DEFAULT_BILLING,
      currency: supplier?.currency ?? "EUR",
      paymentTerms: supplier?.paymentTerms ?? "Net 30",
      expectedDelivery: isoDaysFromNow(14),
      status: "draft",
      requisitionId: null,
      notes: "",
      lines: [emptyLine()],
    });
    setShowPoForm(true);
  }

  function submitPurchaseOrder() {
    const supplier = store.suppliers.find((s) => s.id === poForm.supplierId);
    if (!supplier || !poForm.lines.some((l) => l.item.trim())) {
      showToast("Select a supplier and add line items.");
      return;
    }
    const created = createPurchaseOrderFromDraft({
      poNumber: poForm.poNumber,
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      supplierContact: poForm.supplierContact,
      deliveryAddress: poForm.deliveryAddress,
      billingAddress: poForm.billingAddress,
      currency: poForm.currency,
      paymentTerms: poForm.paymentTerms,
      expectedDelivery: poForm.expectedDelivery,
      status: poForm.status,
      requisitionId: poForm.requisitionId,
      lines: poForm.lines.map((l) => ({
        ...l,
        description: l.description || l.item,
        preferredSupplierId: supplier.id,
        preferredSupplierName: supplier.companyName,
        estimatedCost: l.estimatedCost || l.unitPrice,
      })),
      notes: poForm.notes,
    });
    setSelectedPoId(created.id);
    setShowPoForm(false);
    showToast(`Purchase order ${created.poNumber} created.`);
  }

  function openGoodsReceiptForm(poId?: string) {
    const po = store.purchaseOrders.find((p) => p.id === (poId || store.purchaseOrders[0]?.id));
    if (!po) return;
    setGrForm({
      poId: po.id,
      deliveryDate: isoDaysFromNow(0),
      receivedBy: "Luis Fernández",
      notes: "",
      lines: po.lines.map((line) => ({
        lineId: line.id,
        item: line.item,
        orderedQty: line.quantity,
        receivedQty: line.quantity,
        damagedQty: 0,
        backOrderQty: 0,
      })),
    });
    setShowGrForm(true);
  }

  function submitGoodsReceipt() {
    const po = store.purchaseOrders.find((p) => p.id === grForm.poId);
    if (!po) return;
    const lines = grForm.lines.map((line) => ({
      ...line,
      backOrderQty: Math.max(0, line.orderedQty - line.receivedQty),
    }));
    const receipt = createGoodsReceipt({
      receiptNumber: nextReceiptNumber(),
      poId: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      deliveryDate: grForm.deliveryDate,
      receivedBy: grForm.receivedBy,
      lines,
      photos: [],
      notes: grForm.notes,
      inventoryUpdated: true,
    });
    setShowGrForm(false);
    showToast(`Goods receipt ${receipt.receiptNumber} logged · inventory updated.`);
  }

  function emailPo(po: PurchaseOrder) {
    markPurchaseOrderEmailed(po.id);
    showToast(`Purchase order ${po.poNumber} emailed to supplier.`);
  }

  function onSupplierChange(supplierId: string) {
    const supplier = store.suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      setPoForm((f) => ({ ...f, supplierId }));
      return;
    }
    setPoForm((f) => ({
      ...f,
      supplierId,
      supplierContact: `${supplier.contacts[0]?.name ?? ""} <${supplier.contacts[0]?.email ?? ""}>`,
      currency: supplier.currency,
      paymentTerms: supplier.paymentTerms,
    }));
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Procurement & Purchasing</h1>
          <p className="mt-1 text-sm text-white/50">
            Requisitions, POs, suppliers, receipts, and three-way match — Unit311 Central.
          </p>
        </div>
        <div className="min-w-[14rem]">
          <ProcurementFieldLabel>Acting as</ProcurementFieldLabel>
          <select
            className={procurementInputClass()}
            value={store.currentRole}
            onChange={(e) => setProcurementRole(e.target.value as ProcurementRole)}
          >
            {PROCUREMENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {PROCUREMENT_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {PROCUREMENT_MODULE_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              tab === item
                ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Dashboard" ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <ProcurementKpiTile label="Awaiting Approval" value={dashboard.requisitionsAwaitingApproval} />
            <ProcurementKpiTile label="POs Outstanding" value={dashboard.purchaseOrdersOutstanding} />
            <ProcurementKpiTile label="Received (30d)" value={dashboard.ordersReceivedThisMonth} />
            <ProcurementKpiTile
              label="Supplier Performance"
              value={`${dashboard.supplierPerformanceAvg}`}
              hint="Avg score"
            />
            <ProcurementKpiTile label="Spend This Month" value={money(dashboard.spendThisMonth)} />
            <ProcurementKpiTile
              label="Budget vs Actual"
              value={`${dashboard.budgetVsActualPct}%`}
              hint="Of monthly budget"
            />
            <ProcurementKpiTile
              label="Avg Approval Time"
              value={`${dashboard.averageApprovalHours}h`}
            />
            <ProcurementKpiTile label="Open Deliveries" value={dashboard.openDeliveries} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <ProcurementSection title="Monthly spend" subtitle="Trailing six months">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.monthlySpend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="spend" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ProcurementSection>

            <ProcurementSection title="Spend by supplier" subtitle="Top suppliers by lifetime spend">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboard.spendBySupplier}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="spend" fill="#34d399" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ProcurementSection>

            <ProcurementSection title="Spend by department" subtitle="From open and recent requisitions">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.spendByDepartment} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="spend" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ProcurementSection>

            <ProcurementSection title="PO status mix" subtitle="Current purchase order pipeline">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={poStatusChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                      {poStatusChart.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ProcurementSection>
          </div>
        </div>
      ) : null}

      {tab === "Requisitions" ? (
        <div className="space-y-5">
          <ProcurementSection
            title="Purchase requisitions"
            subtitle="Request → approve → hand off to purchasing"
            actions={
              <button type="button" className={procurementPrimaryButtonClass()} onClick={openNewRequisition}>
                <Plus className="h-3.5 w-3.5" />
                New requisition
              </button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <ul className="space-y-2">
                {store.requisitions.map((req) => (
                  <li key={req.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReqId(req.id);
                        setShowReqForm(false);
                      }}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                        selectedReq?.id === req.id
                          ? "border-sky-400/35 bg-sky-500/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{req.requestNumber}</span>
                        <ProcurementStatusPill className={requisitionStatusClass(req.status)}>
                          {REQUISITION_STATUS_LABELS[req.status]}
                        </ProcurementStatusPill>
                      </div>
                      <p className="mt-1 text-xs text-white/55">
                        {req.requestedBy} · {req.department} · {PRIORITY_LABELS[req.priority]}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-white/40">{req.businessJustification}</p>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-white/10 bg-[#0b1524]/50 p-4">
                {showReqForm ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">Create requisition</h3>
                      <button type="button" className={procurementSecondaryButtonClass()} onClick={() => setShowReqForm(false)}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <ProcurementFieldLabel>Request number</ProcurementFieldLabel>
                        <input className={procurementInputClass()} value={reqForm.requestNumber} readOnly />
                      </div>
                      <div>
                        <ProcurementFieldLabel>Request date</ProcurementFieldLabel>
                        <input
                          type="date"
                          className={procurementInputClass()}
                          value={reqForm.requestDate}
                          onChange={(e) => setReqForm((f) => ({ ...f, requestDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <ProcurementFieldLabel>Requested by</ProcurementFieldLabel>
                        <input
                          className={procurementInputClass()}
                          value={reqForm.requestedBy}
                          onChange={(e) => setReqForm((f) => ({ ...f, requestedBy: e.target.value }))}
                        />
                      </div>
                      <div>
                        <ProcurementFieldLabel>Department</ProcurementFieldLabel>
                        <input
                          className={procurementInputClass()}
                          value={reqForm.department}
                          onChange={(e) => setReqForm((f) => ({ ...f, department: e.target.value }))}
                        />
                      </div>
                      <div>
                        <ProcurementFieldLabel>Cost centre</ProcurementFieldLabel>
                        <input
                          className={procurementInputClass()}
                          value={reqForm.costCentre}
                          onChange={(e) => setReqForm((f) => ({ ...f, costCentre: e.target.value }))}
                        />
                      </div>
                      <div>
                        <ProcurementFieldLabel>Priority</ProcurementFieldLabel>
                        <select
                          className={procurementInputClass()}
                          value={reqForm.priority}
                          onChange={(e) =>
                            setReqForm((f) => ({ ...f, priority: e.target.value as ProcurementPriority }))
                          }
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {PRIORITY_LABELS[p]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <ProcurementFieldLabel>Required date</ProcurementFieldLabel>
                        <input
                          type="date"
                          className={procurementInputClass()}
                          value={reqForm.requiredDate}
                          onChange={(e) => setReqForm((f) => ({ ...f, requiredDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <ProcurementFieldLabel>Budget code</ProcurementFieldLabel>
                        <input
                          className={procurementInputClass()}
                          value={reqForm.budgetCode}
                          onChange={(e) => setReqForm((f) => ({ ...f, budgetCode: e.target.value }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <ProcurementFieldLabel>Business justification</ProcurementFieldLabel>
                        <textarea
                          rows={2}
                          className={procurementInputClass()}
                          value={reqForm.businessJustification}
                          onChange={(e) =>
                            setReqForm((f) => ({ ...f, businessJustification: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <LineItemsEditor
                      lines={reqForm.lines}
                      onChange={(lines) => setReqForm((f) => ({ ...f, lines }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={procurementSecondaryButtonClass()} onClick={() => submitRequisition(true)}>
                        Save draft
                      </button>
                      <button type="button" className={procurementPrimaryButtonClass()} onClick={() => submitRequisition(false)}>
                        Submit for approval
                      </button>
                    </div>
                  </div>
                ) : selectedReq ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{selectedReq.requestNumber}</h3>
                        <p className="mt-1 text-xs text-white/50">
                          {selectedReq.requestedBy} · {selectedReq.department} · {selectedReq.costCentre}
                        </p>
                      </div>
                      <ProcurementStatusPill className={requisitionStatusClass(selectedReq.status)}>
                        {REQUISITION_STATUS_LABELS[selectedReq.status]}
                      </ProcurementStatusPill>
                    </div>
                    <dl className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-white/40">Priority</dt>
                        <dd className="text-white/80">{PRIORITY_LABELS[selectedReq.priority]}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Required</dt>
                        <dd className="text-white/80">{selectedReq.requiredDate}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Budget</dt>
                        <dd className="text-white/80">{selectedReq.budgetCode}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-white/40">Justification</dt>
                        <dd className="text-white/80">{selectedReq.businessJustification}</dd>
                      </div>
                    </dl>
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-white/[0.03] text-white/45">
                          <tr>
                            <th className="px-3 py-2 font-medium">Item</th>
                            <th className="px-3 py-2 font-medium">Qty</th>
                            <th className="px-3 py-2 font-medium">Unit</th>
                            <th className="px-3 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReq.lines.map((line) => (
                            <tr key={line.id} className="border-t border-white/10 text-white/75">
                              <td className="px-3 py-2">{line.item}</td>
                              <td className="px-3 py-2 tabular-nums">{line.quantity}</td>
                              <td className="px-3 py-2 tabular-nums">{moneyExact(line.unitPrice)}</td>
                              <td className="px-3 py-2 tabular-nums">{moneyExact(lineTotal(line).total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {nextRequisitionStatus(selectedReq.status) ? (
                        <button
                          type="button"
                          className={procurementPrimaryButtonClass()}
                          onClick={() => {
                            const next = nextRequisitionStatus(selectedReq.status);
                            if (!next) return;
                            advanceRequisition(
                              selectedReq.id,
                              next,
                              PROCUREMENT_ROLE_LABELS[store.currentRole],
                              store.currentRole,
                              `${advanceLabel(selectedReq.status)} → ${REQUISITION_STATUS_LABELS[next]}`,
                            );
                            showToast(`Advanced to ${REQUISITION_STATUS_LABELS[next]}.`);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {advanceLabel(selectedReq.status)}
                        </button>
                      ) : null}
                      {selectedReq.status !== "rejected" && selectedReq.status !== "po_created" ? (
                        <button
                          type="button"
                          className={procurementSecondaryButtonClass()}
                          onClick={() => {
                            advanceRequisition(
                              selectedReq.id,
                              "rejected",
                              PROCUREMENT_ROLE_LABELS[store.currentRole],
                              store.currentRole,
                              "Rejected",
                            );
                            showToast("Requisition rejected.");
                          }}
                        >
                          Reject
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                        Approval history
                      </h4>
                      <ApprovalHistoryList entries={selectedReq.approvalHistory} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/45">Select a requisition or create a new one.</p>
                )}
              </div>
            </div>
          </ProcurementSection>
        </div>
      ) : null}

      {tab === "Purchase Orders" ? (
        <div className="space-y-5">
          <ProcurementSection
            title="Purchase orders"
            subtitle="Issue, email, and track supplier orders"
            actions={
              <button type="button" className={procurementPrimaryButtonClass()} onClick={openNewPo}>
                <Plus className="h-3.5 w-3.5" />
                New PO
              </button>
            }
          >
            {showPoForm ? (
              <div className="mb-5 space-y-3 rounded-xl border border-white/10 bg-[#0b1524]/50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Create purchase order</h3>
                  <button type="button" className={procurementSecondaryButtonClass()} onClick={() => setShowPoForm(false)}>
                    Cancel
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <ProcurementFieldLabel>PO number</ProcurementFieldLabel>
                    <input className={procurementInputClass()} value={poForm.poNumber} readOnly />
                  </div>
                  <div>
                    <ProcurementFieldLabel>Supplier</ProcurementFieldLabel>
                    <select
                      className={procurementInputClass()}
                      value={poForm.supplierId}
                      onChange={(e) => onSupplierChange(e.target.value)}
                    >
                      {store.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <ProcurementFieldLabel>Supplier contact</ProcurementFieldLabel>
                    <input
                      className={procurementInputClass()}
                      value={poForm.supplierContact}
                      onChange={(e) => setPoForm((f) => ({ ...f, supplierContact: e.target.value }))}
                    />
                  </div>
                  <div>
                    <ProcurementFieldLabel>Currency</ProcurementFieldLabel>
                    <input
                      className={procurementInputClass()}
                      value={poForm.currency}
                      onChange={(e) => setPoForm((f) => ({ ...f, currency: e.target.value }))}
                    />
                  </div>
                  <div>
                    <ProcurementFieldLabel>Payment terms</ProcurementFieldLabel>
                    <input
                      className={procurementInputClass()}
                      value={poForm.paymentTerms}
                      onChange={(e) => setPoForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <ProcurementFieldLabel>Expected delivery</ProcurementFieldLabel>
                    <input
                      type="date"
                      className={procurementInputClass()}
                      value={poForm.expectedDelivery}
                      onChange={(e) => setPoForm((f) => ({ ...f, expectedDelivery: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ProcurementFieldLabel>Delivery address</ProcurementFieldLabel>
                    <input
                      className={procurementInputClass()}
                      value={poForm.deliveryAddress}
                      onChange={(e) => setPoForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                    />
                  </div>
                  <div>
                    <ProcurementFieldLabel>Billing address</ProcurementFieldLabel>
                    <input
                      className={procurementInputClass()}
                      value={poForm.billingAddress}
                      onChange={(e) => setPoForm((f) => ({ ...f, billingAddress: e.target.value }))}
                    />
                  </div>
                </div>
                <LineItemsEditor
                  lines={poForm.lines}
                  currency={poForm.currency}
                  onChange={(lines) => setPoForm((f) => ({ ...f, lines }))}
                />
                <button type="button" className={procurementPrimaryButtonClass()} onClick={submitPurchaseOrder}>
                  Create purchase order
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              {store.purchaseOrders.map((po) => (
                <article
                  key={po.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    selectedPo?.id === po.id
                      ? "border-sky-400/35 bg-sky-500/10"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <button type="button" className="w-full text-left" onClick={() => setSelectedPoId(po.id)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{po.poNumber}</h3>
                      <ProcurementStatusPill className={poStatusClass(po.status)}>
                        {PO_STATUS_LABELS[po.status]}
                      </ProcurementStatusPill>
                    </div>
                    <p className="mt-1 text-xs text-white/55">{po.supplierName}</p>
                    <p className="mt-2 text-lg font-semibold tabular-nums text-sky-100">
                      {moneyExact(po.grandTotal, po.currency)}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Expected {po.expectedDelivery}
                      {po.emailedAt ? ` · Emailed ${po.emailedAt}` : ""}
                    </p>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={procurementSecondaryButtonClass()}
                      onClick={() => {
                        downloadPurchaseOrderPdf(po);
                        showToast(`Downloaded ${po.poNumber}.pdf`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </button>
                    <button type="button" className={procurementPrimaryButtonClass()} onClick={() => emailPo(po)}>
                      <Mail className="h-3.5 w-3.5" />
                      Email PO
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </ProcurementSection>
        </div>
      ) : null}

      {tab === "Suppliers" ? (
        <ProcurementSection title="Suppliers" subtitle="Performance, preference, and commercial details">
          <div className="grid gap-3 sm:grid-cols-2">
            {store.suppliers.map((supplier) => {
              const open = expandedSupplier === supplier.id;
              return (
                <article key={supplier.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setExpandedSupplier(open ? null : supplier.id)}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{supplier.companyName}</h3>
                        {supplier.preferred ? (
                          <ProcurementStatusPill className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100">
                            Preferred
                          </ProcurementStatusPill>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {supplier.category} · Score {supplier.performanceScore}
                      </p>
                    </div>
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                    )}
                  </button>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                      <p className="text-white/40">On-time</p>
                      <p className="mt-1 font-semibold tabular-nums text-white">{supplier.onTimeDeliveryPct}%</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                      <p className="text-white/40">Quality</p>
                      <p className="mt-1 font-semibold tabular-nums text-white">{supplier.qualityScore}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
                      <p className="text-white/40">Spend</p>
                      <p className="mt-1 font-semibold tabular-nums text-white">{money(supplier.totalSpend)}</p>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-white/60">
                      <p>
                        Contact: {supplier.contacts[0]?.name} · {supplier.contacts[0]?.email}
                      </p>
                      <p>
                        Terms: {supplier.paymentTerms} · Lead {supplier.averageLeadTimeDays}d · Rating{" "}
                        {supplier.rating}
                      </p>
                      <p>
                        Tax ID {supplier.taxId} · Insurance exp {supplier.insuranceExpiry}
                      </p>
                      {supplier.notes ? <p className="text-white/45">{supplier.notes}</p> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </ProcurementSection>
      ) : null}

      {tab === "Goods Receipts" ? (
        <div className="space-y-5">
          <ProcurementSection
            title="Goods receipts"
            subtitle="Partial deliveries supported · inventory flag on save"
            actions={
              <button type="button" className={procurementPrimaryButtonClass()} onClick={() => openGoodsReceiptForm()}>
                <Plus className="h-3.5 w-3.5" />
                Receive against PO
              </button>
            }
          >
            {showGrForm ? (
              <div className="mb-5 space-y-3 rounded-xl border border-white/10 bg-[#0b1524]/50 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <ProcurementFieldLabel>Purchase order</ProcurementFieldLabel>
                    <select
                      className={procurementInputClass()}
                      value={grForm.poId}
                      onChange={(e) => openGoodsReceiptForm(e.target.value)}
                    >
                      {store.purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} · {po.supplierName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <ProcurementFieldLabel>Delivery date</ProcurementFieldLabel>
                    <input
                      type="date"
                      className={procurementInputClass()}
                      value={grForm.deliveryDate}
                      onChange={(e) => setGrForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <ProcurementFieldLabel>Received by</ProcurementFieldLabel>
                    <input
                      className={procurementInputClass()}
                      value={grForm.receivedBy}
                      onChange={(e) => setGrForm((f) => ({ ...f, receivedBy: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/45">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Ordered</th>
                        <th className="px-3 py-2">Received</th>
                        <th className="px-3 py-2">Damaged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grForm.lines.map((line) => (
                        <tr key={line.lineId} className="border-t border-white/10">
                          <td className="px-3 py-2 text-white/80">{line.item}</td>
                          <td className="px-3 py-2 tabular-nums text-white/60">{line.orderedQty}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              className={cn(procurementInputClass(), "mt-0 w-20")}
                              value={line.receivedQty}
                              onChange={(e) =>
                                setGrForm((f) => ({
                                  ...f,
                                  lines: f.lines.map((l) =>
                                    l.lineId === line.lineId
                                      ? { ...l, receivedQty: Number(e.target.value) || 0 }
                                      : l,
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              className={cn(procurementInputClass(), "mt-0 w-20")}
                              value={line.damagedQty}
                              onChange={(e) =>
                                setGrForm((f) => ({
                                  ...f,
                                  lines: f.lines.map((l) =>
                                    l.lineId === line.lineId
                                      ? { ...l, damagedQty: Number(e.target.value) || 0 }
                                      : l,
                                  ),
                                }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <textarea
                  rows={2}
                  className={procurementInputClass()}
                  placeholder="Notes"
                  value={grForm.notes}
                  onChange={(e) => setGrForm((f) => ({ ...f, notes: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={procurementPrimaryButtonClass()} onClick={submitGoodsReceipt}>
                    Post receipt
                  </button>
                  <button type="button" className={procurementSecondaryButtonClass()} onClick={() => setShowGrForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <ul className="space-y-3">
              {store.goodsReceipts.map((gr) => (
                <li key={gr.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{gr.receiptNumber}</p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {gr.poNumber} · {gr.supplierName} · {gr.deliveryDate}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {gr.inventoryUpdated ? (
                        <ProcurementStatusPill className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100">
                          Inventory updated
                        </ProcurementStatusPill>
                      ) : null}
                      {gr.lines.some((l) => l.backOrderQty > 0) ? (
                        <ProcurementStatusPill className="border-amber-400/30 bg-amber-500/10 text-amber-100">
                          Partial
                        </ProcurementStatusPill>
                      ) : (
                        <ProcurementStatusPill className="border-sky-400/30 bg-sky-500/10 text-sky-100">
                          Complete
                        </ProcurementStatusPill>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/45">
                    Received by {gr.receivedBy}
                    {gr.notes ? ` · ${gr.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </ProcurementSection>
        </div>
      ) : null}

      {tab === "Invoice Matching" ? (
        <ProcurementSection title="Invoice matching" subtitle="Three-way match · approve or hold mismatches">
          <ul className="space-y-3">
            {store.invoiceMatches.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{inv.invoiceNumber}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {inv.supplierName} · {inv.poNumber}
                      {inv.receiptNumber ? ` · ${inv.receiptNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProcurementStatusPill className={matchStatusClass(inv.matchStatus)}>
                      {inv.matchStatus.replace(/_/g, " ")}
                    </ProcurementStatusPill>
                    <ProcurementStatusPill className="border-white/15 bg-white/5 text-white/70">
                      {inv.status.replace(/_/g, " ")}
                    </ProcurementStatusPill>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <p className="text-white/55">
                    Invoice <span className="font-semibold text-white">{moneyExact(inv.invoiceTotal, inv.currency)}</span>
                  </p>
                  <p className="text-white/55">
                    PO <span className="font-semibold text-white">{moneyExact(inv.poTotal, inv.currency)}</span>
                  </p>
                  <p className="text-white/55">
                    Receipt <span className="font-semibold text-white">{moneyExact(inv.receiptTotal, inv.currency)}</span>
                  </p>
                </div>
                {inv.mismatches.length > 0 ? (
                  <ul className="mt-3 space-y-1 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {inv.mismatches.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                ) : null}
                {inv.status === "awaiting_approval" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={procurementPrimaryButtonClass()}
                      onClick={() => {
                        approveInvoiceMatch(inv.id, true);
                        showToast(`Approved ${inv.invoiceNumber}.`);
                      }}
                    >
                      Approve match
                    </button>
                    <button
                      type="button"
                      className={procurementSecondaryButtonClass()}
                      onClick={() => {
                        approveInvoiceMatch(inv.id, false);
                        showToast(`Rejected ${inv.invoiceNumber}.`);
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </ProcurementSection>
      ) : null}

      {tab === "Approvals" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <ProcurementSection title="Approval rules" subtitle="Value bands and routing levels">
            <ul className="space-y-3">
              {store.approvalRules.map((rule) => (
                <li key={rule.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{rule.name}</p>
                    <ProcurementStatusPill
                      className={
                        rule.active
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/15 bg-white/5 text-white/60"
                      }
                    >
                      {rule.active ? "Active" : "Inactive"}
                    </ProcurementStatusPill>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {money(rule.minValue)} – {rule.maxValue == null ? "∞" : money(rule.maxValue)}
                  </p>
                  <ol className="mt-2 space-y-1 text-xs text-white/65">
                    {rule.levels.map((level) => (
                      <li key={level.level}>
                        L{level.level}: {level.label}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </ProcurementSection>

          <ProcurementSection title="Pending queue" subtitle={`${pendingApprovals.length} requisitions in flight`}>
            <ul className="space-y-3">
              {pendingApprovals.map((req) => (
                <li key={req.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{req.requestNumber}</p>
                    <ProcurementStatusPill className={requisitionStatusClass(req.status)}>
                      {REQUISITION_STATUS_LABELS[req.status]}
                    </ProcurementStatusPill>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {req.department} · {PRIORITY_LABELS[req.priority]} · {req.requestedBy}
                  </p>
                  <div className="mt-3">
                    <ApprovalHistoryList entries={req.approvalHistory} />
                  </div>
                </li>
              ))}
              {!pendingApprovals.length ? (
                <p className="text-sm text-white/45">No requisitions awaiting approval.</p>
              ) : null}
            </ul>
          </ProcurementSection>
        </div>
      ) : null}

      {tab === "Contracts" ? (
        <ProcurementSection title="Supplier contracts" subtitle="Renewal watch and commercial frameworks">
          <ul className="space-y-3">
            {store.contracts.map((contract) => (
              <li
                key={contract.id}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  contract.status === "expiring_soon"
                    ? "border-amber-400/35 bg-amber-500/10"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{contract.title}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {contract.supplierName} · Owner {contract.owner}
                    </p>
                  </div>
                  <ProcurementStatusPill
                    className={
                      contract.status === "expiring_soon"
                        ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
                        : contract.status === "active"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/15 bg-white/5 text-white/70"
                    }
                  >
                    {contract.status.replace(/_/g, " ")}
                  </ProcurementStatusPill>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/55">
                  <span>Value {moneyExact(contract.contractValue, contract.currency)}</span>
                  <span>Renews {contract.renewalDate}</span>
                  <span>Notice {contract.noticePeriodDays}d</span>
                </div>
                {contract.status === "expiring_soon" ? (
                  <p className="mt-2 text-xs text-amber-100/90">
                    Renewal window open
                    {contract.reminderSent ? " · reminder already sent" : " · send reminder"}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </ProcurementSection>
      ) : null}

      {tab === "Reporting" ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ProcurementKpiTile label="Spend YTD" value={money(reporting.totalSpendYtd)} />
            <ProcurementKpiTile label="Savings Achieved" value={money(reporting.savingsAchieved)} />
            <ProcurementKpiTile label="Budget Utilisation" value={`${reporting.budgetUtilisationPct}%`} />
            <ProcurementKpiTile label="Outstanding PO Value" value={money(reporting.outstandingPoValue)} />
            <ProcurementKpiTile label="Contracts Renewing" value={reporting.contractsRenewingSoon} />
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <ProcurementSection title="Spend by category">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reporting.spendByCategory} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="category" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="spend" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ProcurementSection>
            <ProcurementSection title="Supplier performance">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reporting.supplierPerformance} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="score" name="Score" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="onTime" name="On-time %" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ProcurementSection>
          </div>
        </div>
      ) : null}

      {tab === "AI Insights" ? (
        <ProcurementSection title="AI insights" subtitle="Recommendations from purchasing history and inventory signals">
          <div className="grid gap-3 sm:grid-cols-2">
            {store.aiInsights.map((insight) => (
              <article key={insight.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ProcurementStatusPill className="border-sky-400/30 bg-sky-500/10 text-sky-100">
                    {AI_KIND_LABELS[insight.kind] ?? insight.kind}
                  </ProcurementStatusPill>
                  <span className="text-xs tabular-nums text-white/40">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{insight.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{insight.detail}</p>
                <button type="button" className={`${procurementSecondaryButtonClass()} mt-3`}>
                  {insight.actionLabel}
                </button>
              </article>
            ))}
          </div>
        </ProcurementSection>
      ) : null}

      {tab === "Integrations" ? (
        <ProcurementSection title="Accounting integrations" subtitle="Push POs and matched invoices to finance systems">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {store.integrations.map((row) => (
              <article key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{row.platform}</h3>
                    <p className="mt-1 text-xs text-white/45">
                      {row.lastSyncAt ? `Last sync ${row.lastSyncAt}` : "Not connected"}
                    </p>
                  </div>
                  <ProcurementStatusPill
                    className={
                      row.status === "connected"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : row.status === "error"
                          ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                          : "border-white/15 bg-white/5 text-white/65"
                    }
                  >
                    {row.status}
                  </ProcurementStatusPill>
                </div>
                {row.notes ? <p className="mt-2 text-xs text-white/50">{row.notes}</p> : null}
                <p className="mt-2 text-[11px] text-white/40">
                  POs {row.syncPurchaseOrders ? "on" : "off"} · Invoices {row.syncInvoices ? "on" : "off"}
                </p>
                <button
                  type="button"
                  className={`${procurementPrimaryButtonClass()} mt-3`}
                  onClick={() => {
                    toggleIntegration(row.id);
                    showToast(
                      row.status === "connected"
                        ? `Disconnected ${row.platform}.`
                        : `Connected ${row.platform}.`,
                    );
                  }}
                >
                  {row.status === "connected" ? "Disconnect" : "Connect"}
                </button>
              </article>
            ))}
          </div>
        </ProcurementSection>
      ) : null}

      {tab === "Permissions" ? (
        <ProcurementSection
          title="Role permissions"
          subtitle={`Current role: ${PROCUREMENT_ROLE_LABELS[store.currentRole]}`}
        >
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.1em] text-white/45">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  {PERMISSION_COLUMNS.map((col) => (
                    <th key={col.key} className="px-2 py-2.5 font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROCUREMENT_ROLES.map((role) => {
                  const perms = store.rolePermissions[role];
                  const isCurrent = role === store.currentRole;
                  return (
                    <tr
                      key={role}
                      className={cn(
                        "border-t border-white/10",
                        isCurrent ? "bg-sky-500/10" : "bg-transparent",
                      )}
                    >
                      <td className="px-3 py-2.5 font-medium text-white">
                        {PROCUREMENT_ROLE_LABELS[role]}
                        {isCurrent ? (
                          <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-sky-200">
                            you
                          </span>
                        ) : null}
                      </td>
                      {PERMISSION_COLUMNS.map((col) => (
                        <td key={col.key} className="px-2 py-2.5 text-center">
                          {perms[col.key] ? (
                            <Check className="mx-auto h-3.5 w-3.5 text-emerald-300" />
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ProcurementSection>
      ) : null}
    </div>
  );
}
