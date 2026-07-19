import type { TreasuryAnalytics, TreasuryTransaction } from "@/lib/treasury/treasury-types";
import { convertToGbp } from "@/lib/treasury/treasury-utils";

function monthKey(date: string) {
  return date.slice(0, 7);
}

function dayKey(date: string) {
  return date.slice(0, 10);
}

export function buildTreasuryAnalytics(
  transactions: TreasuryTransaction[],
): TreasuryAnalytics {
  const byDay = new Map<string, { GBP: number; USD: number; EUR: number }>();
  const incomingVsOutgoing = new Map<string, { incoming: number; outgoing: number }>();
  const byCurrency = new Map<string, { count: number; volume: number }>();
  const cashFlow = new Map<string, { incoming: number; outgoing: number; net: number }>();
  const feesByMonth = new Map<string, number>();

  for (const tx of transactions) {
    const day = dayKey(tx.date);
    const month = monthKey(tx.date);
    const absAmount = Math.abs(tx.amount);
    const gbpAmount = convertToGbp(absAmount, tx.currency);

    const dayEntry = byDay.get(day) ?? { GBP: 0, USD: 0, EUR: 0 };
    if (tx.currency === "GBP" || tx.currency === "USD" || tx.currency === "EUR") {
      dayEntry[tx.currency] = tx.runningBalance ?? dayEntry[tx.currency];
      byDay.set(day, dayEntry);
    }

    const flow = incomingVsOutgoing.get(month) ?? { incoming: 0, outgoing: 0 };
    if (tx.direction === "incoming") flow.incoming += gbpAmount;
    else flow.outgoing += gbpAmount;
    incomingVsOutgoing.set(month, flow);

    const currencyEntry = byCurrency.get(tx.currency) ?? { count: 0, volume: 0 };
    currencyEntry.count += 1;
    currencyEntry.volume += absAmount;
    byCurrency.set(tx.currency, currencyEntry);

    const monthFlow = cashFlow.get(month) ?? { incoming: 0, outgoing: 0, net: 0 };
    if (tx.direction === "incoming") monthFlow.incoming += gbpAmount;
    else monthFlow.outgoing += gbpAmount;
    monthFlow.net = monthFlow.incoming - monthFlow.outgoing;
    cashFlow.set(month, monthFlow);

    if (tx.fee) {
      feesByMonth.set(month, (feesByMonth.get(month) ?? 0) + convertToGbp(tx.fee, tx.currency));
    }
  }

  const balanceHistory = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, values]) => ({ date, ...values }));

  return {
    balanceHistory,
    incomingVsOutgoing: [...incomingVsOutgoing.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, values]) => ({ month, ...values })),
    transfersByCurrency: [...byCurrency.entries()].map(([currency, values]) => ({
      currency,
      ...values,
    })),
    monthlyCashFlow: [...cashFlow.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, values]) => ({ month, ...values })),
    feesByMonth: [...feesByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, fees]) => ({ month, fees })),
  };
}

export function computeTreasurySummary(
  transactions: TreasuryTransaction[],
  balances: Array<{ currency: string; amount: number }>,
) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const totalsByCurrency = Object.fromEntries(
    balances.map((balance) => [balance.currency, balance.amount]),
  ) as Record<string, number>;

  let todayIncoming = 0;
  let todayOutgoing = 0;
  let monthFees = 0;
  let monthVolume = 0;

  for (const tx of transactions) {
    const gbp = convertToGbp(Math.abs(tx.amount), tx.currency);
    if (dayKey(tx.date) === today) {
      if (tx.direction === "incoming") todayIncoming += gbp;
      else todayOutgoing += gbp;
    }
    if (monthKey(tx.date) === month) {
      monthVolume += gbp;
      if (tx.fee) monthFees += convertToGbp(tx.fee, tx.currency);
    }
  }

  const totalTreasuryValueGbp = balances.reduce(
    (sum, balance) => sum + convertToGbp(balance.amount, balance.currency),
    0,
  );

  return {
    totalTreasuryValueGbp,
    totalsByCurrency,
    todayIncoming,
    todayOutgoing,
    monthFees,
    monthVolume,
    fetchedAt: new Date().toISOString(),
  };
}

export function buildBalanceSnapshotAnalytics(
  balances: Array<{ currency: string; amount: number }>,
): TreasuryAnalytics {
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = {
    date: today,
    GBP: balances.find((balance) => balance.currency === "GBP")?.amount ?? 0,
    USD: balances.find((balance) => balance.currency === "USD")?.amount ?? 0,
    EUR: balances.find((balance) => balance.currency === "EUR")?.amount ?? 0,
  };

  return {
    balanceHistory: [snapshot],
    incomingVsOutgoing: [],
    transfersByCurrency: [],
    monthlyCashFlow: [],
    feesByMonth: [],
  };
}
