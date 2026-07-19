import type {
  TreasuryTransaction,
  TreasuryTransactionFilters,
} from "@/lib/treasury/treasury-types";

const FX_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.86,
};

export function convertToGbp(amount: number, currency: string) {
  const rate = FX_TO_GBP[currency.toUpperCase()] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

export function maskAccountNumber(value: string | null | undefined) {
  if (!value) return "—";
  const trimmed = value.replace(/\s/g, "");
  if (trimmed.length <= 4) return "****";
  return `****${trimmed.slice(-4)}`;
}

export function formatTreasuryMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatTreasuryDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function defaultStatementInterval(days = 90) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return {
    intervalStart: start.toISOString(),
    intervalEnd: end.toISOString(),
  };
}

export function filterTreasuryTransactions(
  transactions: TreasuryTransaction[],
  filters: TreasuryTransactionFilters,
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const search = filters.search?.trim().toLowerCase() ?? "";
  const direction = filters.direction ?? "all";

  let filtered = transactions.filter((tx) => {
    if (filters.currency && tx.currency !== filters.currency) return false;
    if (direction !== "all" && tx.direction !== direction) return false;
    if (filters.minAmount !== undefined && Math.abs(tx.amount) < filters.minAmount) return false;
    if (filters.maxAmount !== undefined && Math.abs(tx.amount) > filters.maxAmount) return false;
    if (filters.dateFrom && new Date(tx.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(tx.date) > new Date(`${filters.dateTo}T23:59:59.999Z`)) return false;
    if (!search) return true;

    const haystack = [
      tx.description,
      tx.reference,
      tx.counterparty,
      tx.currency,
      String(tx.amount),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });

  filtered = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function transactionsToCsv(transactions: TreasuryTransaction[]) {
  const header = [
    "Date",
    "Direction",
    "Description",
    "Reference",
    "Counterparty",
    "Amount",
    "Currency",
    "Fee",
    "Running Balance",
    "Status",
  ];

  const rows = transactions.map((tx) => [
    tx.date,
    tx.direction,
    tx.description,
    tx.reference,
    tx.counterparty,
    String(tx.amount),
    tx.currency,
    tx.fee === null ? "" : String(tx.fee),
    tx.runningBalance === null ? "" : String(tx.runningBalance),
    tx.status,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}
