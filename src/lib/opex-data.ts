export const OPEX_CLIENT_COUNT = 50;

export const OPEX_STORAGE_KEY = "unit311-opex-line-items";

export type OpexLineItem = {
  id: string;
  description: string;
  amountUsd: number;
};

export const DEFAULT_OPEX_LINE_ITEMS: OpexLineItem[] = [
  { id: "stripe-fee", description: "Stripe fee 25 clients card quarterly", amountUsd: 11_700 },
  { id: "transfer-fees", description: "Transfer fees 25 users paying quarterly", amountUsd: 600 },
  { id: "xero", description: "Xero", amountUsd: 900 },
  { id: "accounts", description: "Accounts", amountUsd: 1_000 },
  { id: "hk-govt-fees", description: "HK GOVT FEES", amountUsd: 315 },
  { id: "email-users", description: "5 email users", amountUsd: 60 },
  { id: "domain", description: "Domain", amountUsd: 15 },
  { id: "cursor-pro", description: "Cursor Pro+", amountUsd: 780 },
  { id: "google-flow", description: "Google Flow", amountUsd: 110 },
  { id: "linkedin-sales", description: "Linkedin Sales", amountUsd: 1_428 },
  { id: "supabase-pro", description: "Supabase Pro", amountUsd: 300 },
  { id: "vercel", description: "Vercel", amountUsd: 240 },
  { id: "openai", description: "OpenAI", amountUsd: 1_000 },
];

export function formatOpexAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function sumOpexYearly(items: OpexLineItem[]) {
  return items.reduce((total, item) => total + item.amountUsd, 0);
}

export function createOpexLineItemId() {
  return `opex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadOpexLineItems(): OpexLineItem[] {
  if (typeof window === "undefined") return DEFAULT_OPEX_LINE_ITEMS;

  try {
    const raw = window.localStorage.getItem(OPEX_STORAGE_KEY);
    if (!raw) return DEFAULT_OPEX_LINE_ITEMS;

    const parsed = JSON.parse(raw) as OpexLineItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_OPEX_LINE_ITEMS;

    return parsed
      .filter(
        (item) =>
          typeof item.id === "string" &&
          typeof item.description === "string" &&
          typeof item.amountUsd === "number" &&
          Number.isFinite(item.amountUsd),
      )
      .map((item) =>
        item.id === "transfer-fees" &&
        item.description === "Transfer fees 50 users paying quarterly"
          ? { ...item, description: "Transfer fees 25 users paying quarterly" }
          : item,
      );
  } catch {
    return DEFAULT_OPEX_LINE_ITEMS;
  }
}

export function saveOpexLineItems(items: OpexLineItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPEX_STORAGE_KEY, JSON.stringify(items));
}

export function parseOpexAmountInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  if (!sanitized || sanitized === ".") return 0;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
