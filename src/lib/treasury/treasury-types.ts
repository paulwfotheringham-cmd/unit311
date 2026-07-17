export type TreasuryView =
  | "dashboard"
  | "transactions"
  | "send"
  | "recipients"
  | "convert"
  | "analytics"
  | "settings"
  | "approvals";

export type TreasurySettings = {
  defaultCurrency: "GBP" | "USD" | "EUR";
  dailyTransferLimit: number;
  approvalThreshold: number;
  lowBalanceAlerts: Record<string, number>;
  favouriteRecipientIds: number[];
  defaultReference: string;
};

export const DEFAULT_TREASURY_SETTINGS: TreasurySettings = {
  defaultCurrency: "GBP",
  dailyTransferLimit: 50000,
  approvalThreshold: 5000,
  lowBalanceAlerts: { GBP: 1000, USD: 1000, EUR: 1000 },
  favouriteRecipientIds: [],
  defaultReference: "Unit311 payment",
};

export type TreasuryTransferDirection = "incoming" | "outgoing";

export type TreasuryTransactionStatus =
  | "completed"
  | "pending"
  | "failed"
  | "cancelled"
  | "unknown";

export type TreasuryTransaction = {
  id: string;
  balanceId: number;
  currency: string;
  date: string;
  direction: TreasuryTransferDirection;
  description: string;
  reference: string;
  counterparty: string;
  amount: number;
  fee: number | null;
  runningBalance: number | null;
  status: TreasuryTransactionStatus;
  raw: Record<string, unknown>;
};

export type TreasuryTransactionFilters = {
  search?: string;
  currency?: string;
  direction?: TreasuryTransferDirection | "all";
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type TreasurySummary = {
  totalTreasuryValueGbp: number;
  totalsByCurrency: Record<string, number>;
  todayIncoming: number;
  todayOutgoing: number;
  monthFees: number;
  monthVolume: number;
  fetchedAt: string;
};

export type TreasuryActivityType =
  | "money_received"
  | "money_sent"
  | "transfer_completed"
  | "transfer_failed"
  | "currency_conversion";

export type TreasuryActivityItem = {
  id: string;
  type: TreasuryActivityType;
  title: string;
  subtitle: string;
  amount: number | null;
  currency: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type TreasuryNotificationType =
  | "transfer_completed"
  | "transfer_failed"
  | "money_received"
  | "low_balance"
  | "large_transfer"
  | "approval_required";

export type TreasuryNotification = {
  id: string;
  type: TreasuryNotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type TreasuryApprovalStatus = "pending" | "approved" | "rejected";

export type TreasuryTransferApproval = {
  id: string;
  status: TreasuryApprovalStatus;
  requestedBy: string;
  requestedByName: string;
  approver: string | null;
  approverName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  payload: TreasuryTransferRequestPayload;
  auditTrail: TreasuryAuditEntry[];
  createdAt: string;
  updatedAt: string;
};

export type TreasuryTransferRequestPayload = {
  quoteId: string;
  recipientId: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  reference: string;
  balanceId?: number;
  exchangeRate?: number;
  fee?: number;
  estimatedArrival?: string | null;
};

export type TreasuryTransferStage =
  | "draft"
  | "awaiting_funding"
  | "processing"
  | "completed"
  | "failed";

export type TreasuryAuditEntry = {
  id: string;
  actor: string;
  actorName: string;
  action: string;
  details: string;
  createdAt: string;
};

export type TreasuryRecipientMeta = {
  wiseRecipientId: number;
  favourite: boolean;
  lastUsedAt: string | null;
  label: string | null;
};

export type TreasuryAnalytics = {
  balanceHistory: Array<{ date: string; GBP: number; USD: number; EUR: number }>;
  incomingVsOutgoing: Array<{ month: string; incoming: number; outgoing: number }>;
  transfersByCurrency: Array<{ currency: string; count: number; volume: number }>;
  monthlyCashFlow: Array<{ month: string; net: number; incoming: number; outgoing: number }>;
  feesByMonth: Array<{ month: string; fees: number }>;
};
