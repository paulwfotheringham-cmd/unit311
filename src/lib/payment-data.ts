import { SITE_EMAIL_DOMAIN, SITE_NAME } from "@/lib/site";

export const PAYMENT_AMOUNT = "US$2,997";
export const PAYMENT_AMOUNT_NUMERIC = 2997;
export const SUBSCRIPTION_INVOICE_DESCRIPTION = "Unit311 Central Quarterly Subscription";
export const SUBSCRIPTION_INVOICE_QUANTITY = 1;
export const PAYMENT_PERIOD = "3 months";
export const PAYMENT_PLAN = `${SITE_NAME} Professional`;

export const PAYMENT_BANK_DETAILS = {
  accountName: "Nakama Technology Holdings Ltd",
  bankName: "Wise US Inc",
  routingNumber: "084009519",
  accountNumber: "482696974780841",
  swift: "TRWIUS35XXX (only for international USD wires if required)",
  bankAddress: "108 W 13th St, Wilmington, DE 19801, United States",
} as const;

/** @deprecated Use PAYMENT_BANK_DETAILS */
export const WISE_DETAILS = {
  accountHolder: PAYMENT_BANK_DETAILS.accountName,
  bankName: PAYMENT_BANK_DETAILS.bankName,
  accountNumber: PAYMENT_BANK_DETAILS.accountNumber,
  sortCode: PAYMENT_BANK_DETAILS.routingNumber,
  iban: PAYMENT_BANK_DETAILS.accountNumber,
  swift: PAYMENT_BANK_DETAILS.swift,
  reference: `${SITE_NAME} quarterly subscription`,
} as const;

export const PAYMENT_SUPPORT_EMAIL = `info@${SITE_EMAIL_DOMAIN}`;
