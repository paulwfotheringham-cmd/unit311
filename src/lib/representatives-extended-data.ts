export type RepDocument = {
  id: string;
  title: string;
  type: "Contract" | "NDA" | "Commission schedule" | "Territory map";
  updatedAt: string;
};

export type RepCommissionRow = {
  repId: string;
  client: string;
  period: string;
  amountEur: number;
  status: "Paid" | "Outstanding" | "Upcoming";
};

export const REP_DOCUMENTS: Record<string, RepDocument[]> = {
  "rep-1": [
    { id: "d1", title: "Iberia distribution agreement 2026", type: "Contract", updatedAt: "2026-01-12" },
    { id: "d2", title: "Commission schedule Q1", type: "Commission schedule", updatedAt: "2026-02-01" },
  ],
  "rep-2": [
    { id: "d3", title: "Portugal agency NDA", type: "NDA", updatedAt: "2025-11-20" },
  ],
  "rep-3": [
    { id: "d4", title: "UK territory map", type: "Territory map", updatedAt: "2026-03-05" },
  ],
};

export const REP_COMMISSIONS: RepCommissionRow[] = [
  { repId: "rep-1", client: "Catalonia Energy Partners", period: "Mar 2026", amountEur: 12400, status: "Paid" },
  { repId: "rep-1", client: "Iberia Infrastructure Group", period: "Q2 2026", amountEur: 8600, status: "Outstanding" },
  { repId: "rep-2", client: "Douro Maritime Logistics", period: "Apr 2026", amountEur: 5200, status: "Upcoming" },
  { repId: "rep-3", client: "Oxford Heritage Survey", period: "Feb 2026", amountEur: 3100, status: "Paid" },
];

export function commissionSummaryForRep(repId: string) {
  const rows = REP_COMMISSIONS.filter((row) => row.repId === repId);
  const paid = rows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.amountEur, 0);
  const outstanding = rows.filter((r) => r.status === "Outstanding").reduce((s, r) => s + r.amountEur, 0);
  const upcoming = rows.filter((r) => r.status === "Upcoming").reduce((s, r) => s + r.amountEur, 0);
  return { paid, outstanding, upcoming, rows };
}
