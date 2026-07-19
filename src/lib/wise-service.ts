import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  type KeyObject,
} from "node:crypto";

import type {
  TreasuryTransaction,
  TreasuryTransactionStatus,
  TreasuryTransferDirection,
} from "@/lib/treasury/treasury-types";

const WISE_API_BASE = (process.env.WISE_API_BASE_URL ?? "https://api.wise.com").replace(/\/$/, "");

export type WiseProfile = {
  id: number;
  type: "PERSONAL" | "BUSINESS";
  businessName?: string | null;
};

export type WiseBalance = {
  id: number;
  currency: string;
  type: "STANDARD" | "SAVINGS";
  name: string | null;
  amount: number;
  reservedAmount: number;
  regionLabel: string;
  accountRef: string;
  modificationTime: string | null;
};

export type WiseConnectionStatus = {
  configured: boolean;
  profileId: number | null;
  connected: boolean;
  profileName: string | null;
  profileType: WiseProfile["type"] | null;
  error: string | null;
  scaPrivateKeyConfigured?: boolean;
  scaKey?: {
    configured: boolean;
    parseable: boolean;
    keyFormat: string | null;
    publicKeyFingerprint: string | null;
    publicKeyPem?: string | null;
    usesBase64Env?: boolean;
    error: string | null;
  };
};

const WISE_REGION_LABELS: Record<string, string> = {
  USD: "United States",
  EUR: "Belgium",
  GBP: "United Kingdom",
};

/** Current Wise Balance Statement endpoint (see docs.wise.com/api-reference/balance-statement). */
export const WISE_BALANCE_STATEMENT_PATH =
  "/v1/profiles/{profileId}/balance-statements/{balanceId}/statement.{format}";

export class WiseApiError extends Error {
  readonly status: number;
  readonly requestUrl: string;
  readonly method: string;
  readonly requestParameters: Record<string, unknown> | null;
  readonly responseBody: string;
  readonly responseHeaders: Record<string, string | null>;

  constructor(input: {
    message: string;
    status: number;
    requestUrl: string;
    method: string;
    requestParameters?: Record<string, unknown> | null;
    responseBody: string;
    responseHeaders?: Record<string, string | null>;
  }) {
    super(input.message);
    this.name = "WiseApiError";
    this.status = input.status;
    this.requestUrl = input.requestUrl;
    this.method = input.method;
    this.requestParameters = input.requestParameters ?? null;
    this.responseBody = input.responseBody;
    this.responseHeaders = input.responseHeaders ?? {};
  }

  toClientPayload() {
    return {
      error: this.message,
      wise: {
        status: this.status,
        requestUrl: this.requestUrl,
        method: this.method,
        requestParameters: this.requestParameters,
        responseBody: this.responseBody,
        responseHeaders: this.responseHeaders,
      },
    };
  }
}

export type WiseScaAttemptDiagnostics = {
  attempt: number;
  requestSigningApplied: boolean;
  responseStatus: number;
  scaResult: string | null;
  scaApproval: string | null;
};

function parseWiseRequestPath(path: string) {
  const url = new URL(path, `${WISE_API_BASE}/`);
  const requestParameters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    requestParameters[key] = value;
  });
  return {
    pathname: url.pathname,
    requestParameters,
  };
}

function collectWiseResponseHeaders(response: Response) {
  return {
    "x-2fa-approval-result": response.headers.get("x-2fa-approval-result"),
    "x-2fa-approval": response.headers.get("x-2fa-approval"),
  };
}

function parseWiseApiErrorMessage(
  status: number,
  bodyText: string,
  context?: {
    method?: string;
    requestUrl?: string;
    responseHeaders?: Record<string, string | null>;
  },
) {
  if (bodyText.trim()) {
    try {
      const parsed = JSON.parse(bodyText) as {
        message?: string;
        error?: string;
        path?: string;
        errors?: Array<{ message?: string; code?: string }>;
      };
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
      const firstError = parsed.errors?.find((entry) => entry.message)?.message;
      if (firstError) return firstError;
      return bodyText;
    } catch {
      return bodyText;
    }
  }

  const scaResult = context?.responseHeaders?.["x-2fa-approval-result"];
  const scaApproval = context?.responseHeaders?.["x-2fa-approval"];
  const method = context?.method ?? "GET";
  const target = context?.requestUrl ?? "Wise API";
  const parts = [`${method} ${target} returned HTTP ${status}`];
  if (scaResult) parts.push(`x-2fa-approval-result: ${scaResult}`);
  if (scaApproval) parts.push(`x-2fa-approval: ${scaApproval}`);
  return parts.join(" — ");
}

function logWiseApiExchange(input: {
  requestUrl: string;
  method: string;
  requestParameters: Record<string, unknown> | null;
  requestSigningApplied: boolean;
  scaAttempt?: number;
  responseStatus: number;
  responseBody: string;
  responseHeaders?: Record<string, string | null>;
}) {
  const isStatementRequest = input.requestUrl.includes("balance-statements");
  const loggedBody =
    input.responseStatus >= 400 || isStatementRequest
      ? input.responseBody
      : input.responseBody.length > 500
        ? `${input.responseBody.slice(0, 500)}…`
        : input.responseBody;

  console.info("[Wise API]", {
    requestUrl: input.requestUrl,
    method: input.method,
    requestParameters: input.requestParameters,
    requestSigningApplied: input.requestSigningApplied,
    scaAttempt: input.scaAttempt ?? 1,
    responseStatus: input.responseStatus,
    responseHeaders: input.responseHeaders,
    responseBody: loggedBody,
  });
}

export function formatWiseApiError(status: number, bodyText: string) {
  return parseWiseApiErrorMessage(status, bodyText);
}

export function isWiseStatementAccessError(error: unknown) {
  if (error instanceof WiseApiError) {
    return error.status === 403 && error.requestUrl.includes("balance-statements");
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    (message.includes("(403)") || message.includes("403")) &&
    message.toLowerCase().includes("balance-statement")
  );
}

export function wiseErrorToClientPayload(error: unknown) {
  if (error instanceof WiseApiError) {
    return {
      body: error.toClientPayload(),
      status: error.status,
      isStatementAccessError: isWiseStatementAccessError(error),
    };
  }

  const message = error instanceof Error ? error.message : "Wise API request failed.";
  return {
    body: { error: message },
    status: 500,
    isStatementAccessError: isWiseStatementAccessError(message),
  };
}

function readWiseApiToken() {
  return process.env.WISE_API_TOKEN?.trim() ?? "";
}

function readWiseProfileId() {
  const raw = process.env.WISE_PROFILE_ID?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isWiseConfigured() {
  return Boolean(readWiseApiToken() && readWiseProfileId());
}

export function isWiseScaPrivateKeyConfigured() {
  return Boolean(readWisePrivateKey());
}

/** @deprecated Prefer showing the Wise API error returned by wiseErrorToClientPayload. */
export const WISE_SCA_SETUP_HINT =
  "Wise balance statement access requires an RSA key pair linked to your API token.";

const WISE_SCA_PROTECTED_PATH_PATTERNS = [
  /\/balance-statements\//,
  /\/transfers\/[^/]+\/payments$/,
];

function pathRequiresWiseSca(pathname: string) {
  return WISE_SCA_PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function normalizePrivateKeyPem(raw: string) {
  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  key = key.replace(/\\n/g, "\n");

  if (!key.includes("BEGIN") && /^[A-Za-z0-9+/=\s-]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key.replace(/\s/g, ""), "base64").toString("utf8");
      if (decoded.includes("BEGIN")) {
        key = decoded.trim();
      }
    } catch {
      // Keep original value — createPrivateKey will validate.
    }
  }

  return key;
}

function readWisePrivateKeyRaw() {
  const base64Raw = process.env.WISE_API_PRIVATE_KEY_B64?.trim();
  if (base64Raw) {
    try {
      const decoded = Buffer.from(base64Raw.replace(/\s/g, ""), "base64").toString("utf8");
      if (decoded.includes("BEGIN")) {
        return decoded;
      }
    } catch {
      console.error("[Wise API] WISE_API_PRIVATE_KEY_B64 is set but could not be decoded.");
    }
  }

  return (
    process.env.WISE_API_PRIVATE_KEY?.trim() ?? process.env.WISE_PRIVATE_KEY?.trim() ?? ""
  );
}

function loadWiseScaPrivateKeyObject(privateKeyPem: string): KeyObject {
  const privateKey = createPrivateKey(privateKeyPem);
  const keyType = privateKey.asymmetricKeyType;
  if (keyType !== "rsa") {
    throw new Error(`Expected an RSA private key, received ${keyType ?? "unknown"} key type.`);
  }

  return privateKey;
}

function readWisePrivateKey() {
  const raw = readWisePrivateKeyRaw();
  if (!raw) return null;

  const normalized = normalizePrivateKeyPem(raw);
  if (/ENCRYPTED/i.test(normalized)) {
    console.error(
      "[Wise API] WISE_API_PRIVATE_KEY appears to be passphrase-protected. Wise requires an unencrypted RSA PEM key.",
    );
    return null;
  }

  try {
    loadWiseScaPrivateKeyObject(normalized);
    return normalized;
  } catch (error) {
    console.error(
      "[Wise API] WISE_API_PRIVATE_KEY is set but could not be parsed as an RSA private key.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export function getWiseScaKeyDiagnostics() {
  const usesBase64Env = Boolean(process.env.WISE_API_PRIVATE_KEY_B64?.trim());
  const raw = readWisePrivateKeyRaw();
  if (!raw) {
    return {
      configured: false,
      parseable: false,
      keyFormat: null as string | null,
      publicKeyFingerprint: null as string | null,
      publicKeyPem: null as string | null,
      usesBase64Env,
      error:
        "WISE_API_PRIVATE_KEY is not set. Generate a 2048-bit RSA key pair and upload the public key in Wise → Connect and manage apps → API tokens → Manage public keys.",
    };
  }

  const normalized = normalizePrivateKeyPem(raw);
  if (/ENCRYPTED/i.test(normalized)) {
    return {
      configured: true,
      parseable: false,
      keyFormat: "encrypted",
      publicKeyFingerprint: null,
      publicKeyPem: null,
      usesBase64Env,
      error:
        "Private key is passphrase-protected. Regenerate with: openssl genrsa -out private.pem 2048 (no passphrase).",
    };
  }

  const keyFormat = normalized.includes("BEGIN RSA PRIVATE KEY")
    ? "pkcs1"
    : normalized.includes("BEGIN PRIVATE KEY")
      ? "pkcs8"
      : "unknown";

  try {
    const privateKey = loadWiseScaPrivateKeyObject(normalized);
    const publicKey = createPublicKey(privateKey);
    const spki = publicKey.export({ type: "spki", format: "der" });
    const publicKeyFingerprint = createHash("sha256").update(spki).digest("hex").slice(0, 16);
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    return {
      configured: true,
      parseable: true,
      keyFormat,
      publicKeyFingerprint,
      publicKeyPem,
      usesBase64Env,
      error: null as string | null,
    };
  } catch (error) {
    return {
      configured: true,
      parseable: false,
      keyFormat,
      publicKeyFingerprint: null,
      publicKeyPem: null,
      usesBase64Env,
      error: error instanceof Error ? error.message : "Unable to parse RSA private key.",
    };
  }
}

function isWiseScaChallengeResponse(status: number) {
  return status === 401 || status === 403;
}

export function buildWiseScaFixSteps(
  key: ReturnType<typeof getWiseScaKeyDiagnostics>,
  requestParameters?: Record<string, unknown> | null,
) {
  const scaOtt = requestParameters?.scaOtt as
    | { challengeTypes?: string[] }
    | null
    | undefined;
  const challengeTypes = scaOtt?.challengeTypes ?? [];

  return [
    "In Wise → Connect and manage apps → API tokens, confirm the token is Full Access (not read-only).",
    "For UK/EEA profiles, Wise may no longer accept RSA key signing on personal API tokens (PSD2). Treasury falls back to the Activities feed automatically.",
    key.publicKeyFingerprint
      ? `Server public key fingerprint: ${key.publicKeyFingerprint}.`
      : "Generate a fresh RSA key pair on your machine.",
    challengeTypes.length > 0
      ? `Wise reported challenges: ${challengeTypes.join(", ")}.`
      : "Wise did not expose SIGNATURE challenges — this usually means key-based statement access is disabled for this profile.",
  ].filter(Boolean) as string[];
}

function signWiseScaOneTimeToken(oneTimeToken: string, privateKeyPem: string) {
  const privateKey = loadWiseScaPrivateKeyObject(privateKeyPem);
  const payload = Buffer.from(oneTimeToken, "ascii");
  const signature = cryptoSign("RSA-SHA256", payload, privateKey).toString("base64");
  return signature.replace(/\s+/g, "");
}

async function fetchWiseOneTimeTokenStatusFromPath(path: string, oneTimeToken: string) {
  const token = readWiseApiToken();
  if (!token) return null;

  for (const headerName of ["One-Time-Token", "x-2fa-approval"] as const) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      [headerName]: oneTimeToken,
    };
    const response = await fetch(`${WISE_API_BASE}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const bodyText = await response.text().catch(() => "");
    if (response.ok) {
      return {
        ok: true as const,
        status: response.status,
        data: JSON.parse(bodyText) as WiseOneTimeTokenStatus,
      };
    }
  }

  return { ok: false as const, status: 0, bodyText: "" };
}

type WiseOneTimeTokenStatus = {
  oneTimeTokenProperties?: {
    actionType?: string;
    validity?: number;
    challenges?: Array<{
      required?: boolean;
      passed?: boolean;
      primaryChallenge?: { type?: string };
      alternatives?: Array<{ type?: string }>;
    }>;
  };
};

async function fetchWiseOneTimeTokenStatus(oneTimeToken: string) {
  const paths = ["/v1/identity/one-time-token/status", "/v1/one-time-token/status"];

  for (const path of paths) {
    try {
      const result = await fetchWiseOneTimeTokenStatusFromPath(path, oneTimeToken);
      if (result?.ok) {
        return result.data;
      }

      console.warn("[Wise API] Failed to fetch one-time token status.", {
        path,
        status: result?.status,
        body: result?.bodyText?.slice(0, 500),
      });
    } catch (error) {
      console.warn("[Wise API] Failed to fetch one-time token status.", { path, error });
    }
  }

  return null;
}

function summarizeWiseOneTimeTokenStatus(status: WiseOneTimeTokenStatus | null) {
  const challenges = status?.oneTimeTokenProperties?.challenges ?? [];
  const challengeTypes = challenges.flatMap((challenge) => {
    const types = [challenge.primaryChallenge?.type];
    for (const alternative of challenge.alternatives ?? []) {
      types.push(alternative.type);
    }
    return types.filter(Boolean) as string[];
  });

  return {
    actionType: status?.oneTimeTokenProperties?.actionType ?? null,
    validitySeconds: status?.oneTimeTokenProperties?.validity ?? null,
    challengeTypes: [...new Set(challengeTypes)],
    pendingRequired: challenges.some((challenge) => challenge.required && !challenge.passed),
  };
}

function buildWiseScaFailureMessage(input: {
  baseMessage: string;
  requestSigningApplied: boolean;
  scaRetryResult: string | null;
  keyDiagnostics: ReturnType<typeof getWiseScaKeyDiagnostics>;
  ottSummary: ReturnType<typeof summarizeWiseOneTimeTokenStatus> | null;
}) {
  const parts = [input.baseMessage];

  if (!input.keyDiagnostics.parseable) {
    parts.push(
      input.keyDiagnostics.error ??
        "WISE_API_PRIVATE_KEY is missing or could not be parsed as an unencrypted RSA private key.",
    );
    return parts.join(" ");
  }

  if (!input.requestSigningApplied) {
    parts.push(
      "Wise returned a one-time token but the server did not sign it. Check WISE_API_PRIVATE_KEY on Vercel.",
    );
    return parts.join(" ");
  }

  if (input.scaRetryResult === "REJECTED") {
    const likelyPsd2PersonalTokenBlock =
      input.requestSigningApplied &&
      (!input.ottSummary?.challengeTypes.length ||
        !input.ottSummary.challengeTypes.includes("SIGNATURE"));

    if (likelyPsd2PersonalTokenBlock) {
      parts.push(
        "Wise rejected the RSA signature even though the server key is configured. For UK/EEA business profiles, Wise often no longer accepts key-based SCA on personal API tokens (PSD2). Statement PDF/CSV export via API may be unavailable — Treasury uses the Activities feed instead.",
      );
      if (input.keyDiagnostics.publicKeyFingerprint) {
        parts.push(`Server key fingerprint: ${input.keyDiagnostics.publicKeyFingerprint}.`);
      }
      return parts.join(" ");
    }

    parts.push(
      "RSA signature was rejected by Wise. The private key on the server does not match the public key uploaded on this API token.",
    );
    if (input.keyDiagnostics.publicKeyFingerprint) {
      parts.push(`Server key fingerprint: ${input.keyDiagnostics.publicKeyFingerprint}.`);
    }
    if (input.ottSummary?.challengeTypes.length) {
      parts.push(`Wise challenges for this request: ${input.ottSummary.challengeTypes.join(", ")}.`);
      if (
        input.ottSummary.challengeTypes.some((type) =>
          ["PIN", "SMS", "WHATSAPP", "VOICE", "FACE_MAP", "PARTNER_DEVICE_FINGERPRINT"].includes(
            type,
          ),
        ) &&
        !input.ottSummary.challengeTypes.includes("SIGNATURE")
      ) {
        parts.push(
          "Wise is not offering a SIGNATURE challenge for this token — upload your public key under the same API token (Full Access), or regenerate the key pair.",
        );
      }
    }
    parts.push(
      "Fix: run node scripts/setup-wise-sca-vercel.mjs, upload wise-keys/wise-public.pem in Wise → API tokens → Manage public keys (same token as WISE_API_TOKEN), then redeploy.",
    );
  }

  return parts.join(" ");
}

async function wiseRequest<T>(path: string): Promise<T> {
  return wiseApiRequest<T>(path);
}

type WiseRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: "json" | "text";
  /** Force SCA signing for protected endpoints (balance statements, transfer funding). */
  requiresSca?: boolean;
};

async function executeWiseHttpRequest(input: {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  requestUrl: string;
  requestParameters: Record<string, unknown> | null;
  requestSigningApplied: boolean;
  scaAttempt: number;
}) {
  const response = await fetch(`${WISE_API_BASE}${input.path}`, {
    method: input.method,
    headers: input.headers,
    body: input.body,
    cache: "no-store",
  });

  const bodyText = await response.text().catch(() => "");
  const responseHeaders = collectWiseResponseHeaders(response);

  logWiseApiExchange({
    requestUrl: input.requestUrl,
    method: input.method,
    requestParameters: input.requestParameters,
    requestSigningApplied: input.requestSigningApplied,
    scaAttempt: input.scaAttempt,
    responseStatus: response.status,
    responseBody: bodyText,
    responseHeaders,
  });

  return { response, bodyText, responseHeaders };
}

export async function wiseApiRequest<T>(
  path: string,
  options: WiseRequestOptions = {},
): Promise<T> {
  const token = readWiseApiToken();
  if (!token) {
    throw new Error("WISE_API_TOKEN is not configured.");
  }

  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...options.headers,
  };

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const { pathname, requestParameters: queryParameters } = parseWiseRequestPath(path);
  const requestUrl = `${WISE_API_BASE}${pathname}${path.includes("?") ? path.slice(path.indexOf("?")) : ""}`;
  const requestParameters: Record<string, unknown> = { ...queryParameters };
  if (options.body !== undefined) {
    requestParameters.body = options.body;
  }

  const requiresSca = options.requiresSca ?? pathRequiresWiseSca(pathname);
  const privateKey = requiresSca ? readWisePrivateKey() : null;
  const keyDiagnostics = requiresSca ? getWiseScaKeyDiagnostics() : null;

  let scaOneTimeToken: string | undefined;
  let scaSignature: string | undefined;
  let lastOttSummary: ReturnType<typeof summarizeWiseOneTimeTokenStatus> | null = null;
  const scaAttempts: WiseScaAttemptDiagnostics[] = [];
  const maxAttempts = requiresSca ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const requestHeaders: Record<string, string> = { ...headers };
    const requestSigningApplied = Boolean(scaOneTimeToken && scaSignature);

    if (requestSigningApplied) {
      requestHeaders["x-2fa-approval"] = scaOneTimeToken!;
      requestHeaders["X-Signature"] = scaSignature!;
    }

    const { response, bodyText, responseHeaders } = await executeWiseHttpRequest({
      path,
      method,
      headers: requestHeaders,
      body,
      requestUrl,
      requestParameters:
        Object.keys(requestParameters).length > 0
          ? {
              ...requestParameters,
              ...(requiresSca ? { requiresSca: true } : {}),
              ...(requestSigningApplied ? { scaRetry: true } : {}),
            }
          : requiresSca
            ? { requiresSca: true, ...(requestSigningApplied ? { scaRetry: true } : {}) }
            : null,
      requestSigningApplied,
      scaAttempt: attempt + 1,
    });

    scaAttempts.push({
      attempt: attempt + 1,
      requestSigningApplied,
      responseStatus: response.status,
      scaResult: responseHeaders["x-2fa-approval-result"],
      scaApproval: responseHeaders["x-2fa-approval"],
    });

    if (response.ok) {
      if (options.responseType === "text") {
        return bodyText as T;
      }

      if (!bodyText) {
        return {} as T;
      }

      try {
        return JSON.parse(bodyText) as T;
      } catch {
        throw new Error("Wise API returned an unexpected response.");
      }
    }

    if (!requiresSca || attempt === maxAttempts - 1) {
      const baseMessage = parseWiseApiErrorMessage(response.status, bodyText, {
        method,
        requestUrl,
        responseHeaders,
      });
      const signedRetryAttempt = scaAttempts.find((entry) => entry.requestSigningApplied) ?? null;
      if (requiresSca && !lastOttSummary && responseHeaders["x-2fa-approval"]) {
        const ottStatus = await fetchWiseOneTimeTokenStatus(responseHeaders["x-2fa-approval"]);
        lastOttSummary = summarizeWiseOneTimeTokenStatus(ottStatus);
      }

      throw new WiseApiError({
        message: requiresSca
          ? buildWiseScaFailureMessage({
              baseMessage,
              requestSigningApplied: Boolean(signedRetryAttempt),
              scaRetryResult:
                signedRetryAttempt?.scaResult ?? responseHeaders["x-2fa-approval-result"],
              keyDiagnostics: keyDiagnostics ?? getWiseScaKeyDiagnostics(),
              ottSummary: lastOttSummary,
            })
          : baseMessage,
        status: response.status,
        requestUrl,
        method,
        requestParameters: {
          ...(Object.keys(requestParameters).length > 0 ? requestParameters : {}),
          ...(requiresSca
            ? {
                scaAttempts,
                scaKey: keyDiagnostics,
                scaOtt: lastOttSummary,
              }
            : {}),
        },
        responseBody: bodyText,
        responseHeaders,
      });
    }

    const pendingScaToken = response.headers.get("x-2fa-approval")?.trim();
    if (!isWiseScaChallengeResponse(response.status) || !pendingScaToken) {
      throw new WiseApiError({
        message: parseWiseApiErrorMessage(response.status, bodyText, {
          method,
          requestUrl,
          responseHeaders,
        }),
        status: response.status,
        requestUrl,
        method,
        requestParameters: Object.keys(requestParameters).length > 0 ? requestParameters : null,
        responseBody: bodyText,
        responseHeaders,
      });
    }

    const ottStatus = await fetchWiseOneTimeTokenStatus(pendingScaToken);
    lastOttSummary = summarizeWiseOneTimeTokenStatus(ottStatus);

    if (!privateKey) {
      throw new WiseApiError({
        message: buildWiseScaFailureMessage({
          baseMessage: parseWiseApiErrorMessage(response.status, bodyText, {
            method,
            requestUrl,
            responseHeaders,
          }),
          requestSigningApplied: false,
          scaRetryResult: responseHeaders["x-2fa-approval-result"],
          keyDiagnostics: keyDiagnostics ?? getWiseScaKeyDiagnostics(),
          ottSummary: lastOttSummary,
        }),
        status: response.status,
        requestUrl,
        method,
        requestParameters: {
          ...(Object.keys(requestParameters).length > 0 ? requestParameters : {}),
          scaAttempts,
          scaKey: keyDiagnostics ?? getWiseScaKeyDiagnostics(),
          scaOtt: lastOttSummary,
        },
        responseBody: bodyText,
        responseHeaders,
      });
    }

    try {
      scaOneTimeToken = pendingScaToken;
      scaSignature = signWiseScaOneTimeToken(pendingScaToken, privateKey);
    } catch (signError) {
      throw new WiseApiError({
        message: `Failed to sign Wise SCA one-time token: ${
          signError instanceof Error ? signError.message : "Unknown signing error"
        }`,
        status: response.status,
        requestUrl,
        method,
        requestParameters: Object.keys(requestParameters).length > 0 ? requestParameters : null,
        responseBody: bodyText,
        responseHeaders,
      });
    }
  }

  throw new Error("Wise API request failed after SCA retry.");
}

export async function listWiseProfiles(): Promise<WiseProfile[]> {
  const profiles = await wiseRequest<
    Array<{ id: number; type: WiseProfile["type"]; details?: { name?: string | null } }>
  >("/v1/profiles");

  return profiles.map((profile) => ({
    id: profile.id,
    type: profile.type,
    businessName: profile.details?.name ?? null,
  }));
}

function formatBalanceRef(balanceId: number) {
  return `****${String(balanceId).slice(-4)}`;
}

function readWiseMoneyValue(
  money?: { value?: number | string } | null,
) {
  if (money?.value === undefined || money.value === null) return null;
  const parsed =
    typeof money.value === "number" ? money.value : Number(String(money.value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function mapWiseBalance(row: {
  id: number;
  currency: string;
  type: "STANDARD" | "SAVINGS";
  name?: string | null;
  amount?: { value?: number | string };
  cashAmount?: { value?: number | string };
  totalWorth?: { value?: number | string };
  reservedAmount?: { value?: number | string };
  modificationTime?: string | null;
}): WiseBalance {
  const currency = row.currency.trim().toUpperCase();
  const amount =
    readWiseMoneyValue(row.amount) ??
    readWiseMoneyValue(row.cashAmount) ??
    readWiseMoneyValue(row.totalWorth) ??
    0;
  const reservedAmount = readWiseMoneyValue(row.reservedAmount) ?? 0;
  return {
    id: row.id,
    currency,
    type: row.type,
    name: row.name ?? null,
    amount,
    reservedAmount,
    regionLabel: WISE_REGION_LABELS[currency] ?? currency,
    accountRef: formatBalanceRef(row.id),
    modificationTime: row.modificationTime ?? null,
  };
}

export async function listWiseBalances(profileId?: number): Promise<WiseBalance[]> {
  const resolvedProfileId = profileId ?? readWiseProfileId();
  if (!resolvedProfileId) {
    throw new Error("WISE_PROFILE_ID is not configured.");
  }

  const response = await wiseRequest<
    | Array<{
        id: number;
        currency: string;
        type: "STANDARD" | "SAVINGS";
        name?: string | null;
        amount?: { value?: number | string };
        cashAmount?: { value?: number | string };
        totalWorth?: { value?: number | string };
        reservedAmount?: { value?: number | string };
        modificationTime?: string | null;
        visible?: boolean;
      }>
    | {
        balances?: Array<{
          id: number;
          currency: string;
          type: "STANDARD" | "SAVINGS";
          name?: string | null;
          amount?: { value?: number | string };
          cashAmount?: { value?: number | string };
          totalWorth?: { value?: number | string };
          reservedAmount?: { value?: number | string };
          modificationTime?: string | null;
          visible?: boolean;
        }>;
      }
  >(`/v4/profiles/${resolvedProfileId}/balances?types=STANDARD,SAVINGS`);

  const rows = Array.isArray(response) ? response : (response.balances ?? []);
  const priority = ["USD", "EUR", "GBP"];
  return rows
    .filter((balance) => balance.visible !== false)
    .map(mapWiseBalance)
    .sort((a, b) => {
      const aIndex = priority.indexOf(a.currency);
      const bIndex = priority.indexOf(b.currency);
      if (aIndex === -1 && bIndex === -1) return a.currency.localeCompare(b.currency);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
}

export async function getWiseConnectionStatus(): Promise<WiseConnectionStatus> {
  const profileId = readWiseProfileId();
  const configured = Boolean(readWiseApiToken() && profileId);

  if (!configured || !profileId) {
    return {
      configured: false,
      profileId,
      connected: false,
      profileName: null,
      profileType: null,
      error: null,
    };
  }

  try {
    const profiles = await listWiseProfiles();
    const profile = profiles.find((entry) => entry.id === profileId) ?? null;
    await listWiseBalances(profileId);

    return {
      configured: true,
      profileId,
      connected: true,
      profileName: profile?.businessName ?? (profile ? `Profile ${profile.id}` : null),
      profileType: profile?.type ?? null,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      profileId,
      connected: false,
      profileName: null,
      profileType: null,
      error: error instanceof Error ? error.message : "Unable to connect to Wise.",
    };
  }
}

export function getConfiguredWiseProfileId() {
  return readWiseProfileId();
}

type WiseMoney = { value?: number; currency?: string };

type WiseStatementTransaction = {
  type?: string;
  date?: string;
  amount?: WiseMoney;
  totalFees?: WiseMoney;
  runningBalance?: WiseMoney;
  referenceNumber?: string;
  details?: {
    type?: string;
    description?: string;
    paymentReference?: string;
    recipientName?: string;
    senderName?: string;
    merchant?: { name?: string };
    counterparty?: { name?: string };
    fee?: WiseMoney;
    sourceAmount?: WiseMoney;
    targetAmount?: WiseMoney;
    rate?: number;
  };
};

export type WiseStatementResult = {
  transactions: WiseStatementTransaction[];
  endOfStatementBalance?: WiseMoney;
  query?: {
    intervalStart?: string;
    intervalEnd?: string;
    currency?: string;
    accountId?: number;
  };
};

function resolveWiseProfileId(profileId?: number) {
  const resolved = profileId ?? readWiseProfileId();
  if (!resolved) throw new Error("WISE_PROFILE_ID is not configured.");
  return resolved;
}

function mapStatementTransaction(
  balanceId: number,
  currency: string,
  row: WiseStatementTransaction,
  index: number,
) {
  const amount = row.amount?.value ?? 0;
  const type = (row.type ?? row.details?.type ?? "").toUpperCase();
  const direction =
    type.includes("CREDIT") || amount > 0 ? ("incoming" as const) : ("outgoing" as const);

  const counterparty =
    row.details?.counterparty?.name ??
    row.details?.recipientName ??
    row.details?.senderName ??
    row.details?.merchant?.name ??
    "—";

  const description = row.details?.description ?? row.details?.type ?? "Transaction";
  const reference = row.referenceNumber ?? row.details?.paymentReference ?? "—";
  const fee = row.totalFees?.value ?? row.details?.fee?.value ?? null;

  return {
    id: `${balanceId}-${row.referenceNumber ?? row.date ?? index}-${index}`,
    balanceId,
    currency,
    date: row.date ?? new Date().toISOString(),
    direction,
    description,
    reference,
    counterparty,
    amount,
    fee,
    runningBalance: row.runningBalance?.value ?? null,
    status: "completed" as const,
    raw: row as Record<string, unknown>,
  };
}

export async function getWiseBalanceStatement(input: {
  balanceId: number;
  currency: string;
  intervalStart: string;
  intervalEnd: string;
  profileId?: number;
  format?: "json" | "csv" | "pdf";
}) {
  const profileId = resolveWiseProfileId(input.profileId);
  const params = new URLSearchParams({
    currency: input.currency,
    intervalStart: input.intervalStart,
    intervalEnd: input.intervalEnd,
    type: "COMPACT",
  });

  const extension = input.format ?? "json";
  const path = `/v1/profiles/${profileId}/balance-statements/${input.balanceId}/statement.${extension}?${params.toString()}`;

  if (extension === "json") {
    const statement = await wiseApiRequest<WiseStatementResult>(path, { requiresSca: true });
    return {
      format: "json" as const,
      source: "statement" as const,
      statement,
      transactions: (statement.transactions ?? []).map((row, index) =>
        mapStatementTransaction(input.balanceId, input.currency, row, index),
      ),
    };
  }

  const content = await wiseApiRequest<string>(path, { responseType: "text", requiresSca: true });
  return {
    format: extension,
    source: "statement" as const,
    content,
    transactions: [],
  };
}

type WiseActivityRow = {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  primaryAmount?: string;
  secondaryAmount?: string;
  status?: string;
  createdOn?: string;
  updatedOn?: string;
  resource?: { type?: string; id?: string };
};

type WiseActivitiesResponse = {
  cursor?: string | null;
  activities?: WiseActivityRow[];
};

function parseWiseFormattedAmount(text: string | undefined) {
  if (!text?.trim()) return { amount: 0, currency: null as string | null, incoming: null as boolean | null };

  const lowered = text.toLowerCase();
  const incoming =
    lowered.includes("<pos>") || lowered.includes("received") || lowered.includes("topping up");
  const outgoing =
    lowered.includes("<neg>") || lowered.includes("sent ") || lowered.includes("deducted");

  const stripped = text.replace(/<\/?[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const match = stripped.match(/(-?\d[\d,]*(?:\.\d+)?)\s*([A-Z]{3})\b/);
  if (!match) {
    return { amount: 0, currency: null, incoming: incoming ? true : outgoing ? false : null };
  }

  const signedAmount = Number(match[1].replace(/,/g, ""));
  return {
    amount: Math.abs(signedAmount),
    currency: match[2],
    incoming: signedAmount > 0 ? true : signedAmount < 0 ? false : incoming ? true : outgoing ? false : null,
  };
}

function mapWiseActivityStatus(status: string | undefined): TreasuryTransactionStatus {
  switch ((status ?? "").toUpperCase()) {
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "IN_PROGRESS":
    case "UPCOMING":
    case "REQUIRES_ATTENTION":
      return "pending";
    default:
      return "unknown";
  }
}

function mapActivityToTransaction(
  balanceId: number,
  currency: string,
  row: WiseActivityRow,
  index: number,
): TreasuryTransaction | null {
  const primary = parseWiseFormattedAmount(row.primaryAmount);
  const secondary = parseWiseFormattedAmount(row.secondaryAmount);
  const resolvedCurrency = primary.currency ?? secondary.currency ?? currency;
  if (resolvedCurrency !== currency) return null;

  const amount = primary.amount || secondary.amount;
  if (amount <= 0) return null;

  const incoming = primary.incoming ?? secondary.incoming;
  const direction: TreasuryTransferDirection =
    incoming === false ? "outgoing" : incoming === true ? "incoming" : "outgoing";

  return {
    id: row.id ?? `activity-${balanceId}-${index}`,
    balanceId,
    currency: resolvedCurrency,
    date: row.createdOn ?? row.updatedOn ?? new Date().toISOString(),
    direction,
    description: row.description?.trim() || row.title?.replace(/<\/?[^>]+>/g, "") || row.type || "Activity",
    reference: row.resource?.id ?? row.id ?? "—",
    counterparty: row.title?.replace(/<\/?[^>]+>/g, "").trim() || "—",
    amount,
    fee: null,
    runningBalance: null,
    status: mapWiseActivityStatus(row.status),
    raw: row as Record<string, unknown>,
  };
}

export async function listWiseProfileActivities(input: {
  profileId?: number;
  since: string;
  until: string;
  size?: number;
  maxPages?: number;
}) {
  const profileId = resolveWiseProfileId(input.profileId);
  const pageSize = Math.min(Math.max(input.size ?? 100, 1), 100);
  const maxPages = input.maxPages ?? 20;
  const activities: WiseActivityRow[] = [];
  let nextCursor: string | null | undefined = null;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      since: input.since,
      until: input.until,
      size: String(pageSize),
      status: "COMPLETED",
    });
    if (nextCursor) params.set("nextCursor", nextCursor);

    const response = await wiseApiRequest<WiseActivitiesResponse>(
      `/v1/profiles/${profileId}/activities?${params.toString()}`,
    );

    activities.push(...(response.activities ?? []));
    nextCursor = response.cursor;
    if (!nextCursor) break;
  }

  return activities;
}

export async function getWiseBalanceTransactions(input: {
  balanceId: number;
  currency: string;
  intervalStart: string;
  intervalEnd: string;
  profileId?: number;
}) {
  try {
    const statement = await getWiseBalanceStatement({ ...input, format: "json" });
    return {
      source: "statement" as const,
      statementWarning: null as string | null,
      transactions: statement.transactions,
      statement: statement.statement,
    };
  } catch (error) {
    if (!isWiseStatementAccessError(error)) throw error;

    const activities = await listWiseProfileActivities({
      profileId: input.profileId,
      since: input.intervalStart,
      until: input.intervalEnd,
    });

    const transactions = activities
      .map((row, index) => mapActivityToTransaction(input.balanceId, input.currency, row, index))
      .filter((row): row is TreasuryTransaction => row !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      source: "activities" as const,
      statementWarning:
        "Balance statements are blocked by Wise SCA for this profile/token. Showing completed activities instead.",
      transactions,
      statement: null,
    };
  }
}

export type WiseRecipient = {
  id: number;
  profileId: number;
  currency: string;
  country: string;
  type: string;
  accountHolderName: string;
  legalType: string;
  active: boolean;
  ownedByCustomer: boolean;
  accountSummary: string | null;
  longAccountSummary: string | null;
  bankName: string | null;
  maskedAccount: string | null;
  raw: Record<string, unknown>;
};

function mapWiseRecipient(row: Record<string, unknown>): WiseRecipient {
  const details = (row.details as Record<string, unknown> | undefined) ?? {};
  const bankName =
    (details.bankName as string | undefined) ??
    (details.bankCode as string | undefined) ??
    null;
  const accountNumber =
    (details.accountNumber as string | undefined) ??
    (details.iban as string | undefined) ??
    (details.abartn as string | undefined) ??
    null;

  return {
    id: Number(row.id),
    profileId: Number(row.profileId ?? row.profile ?? 0),
    currency: String(row.currency ?? ""),
    country: String(row.country ?? details.country ?? ""),
    type: String(row.type ?? ""),
    accountHolderName: String(row.accountHolderName ?? row.name ?? "Recipient"),
    legalType: String(row.legalType ?? details.legalType ?? ""),
    active: row.active !== false,
    ownedByCustomer: Boolean(row.ownedByCustomer),
    accountSummary: (row.accountSummary as string | null | undefined) ?? null,
    longAccountSummary: (row.longAccountSummary as string | null | undefined) ?? null,
    bankName,
    maskedAccount: accountNumber ? `****${String(accountNumber).slice(-4)}` : null,
    raw: row,
  };
}

export async function listWiseRecipients(input?: {
  profileId?: number;
  currency?: string;
  search?: string;
}) {
  const profileId = resolveWiseProfileId(input?.profileId);
  const params = new URLSearchParams({
    profileId: String(profileId),
    size: "100",
  });
  if (input?.currency) params.set("currency", input.currency);

  const response = await wiseApiRequest<{ content?: Array<Record<string, unknown>> }>(
    `/v2/accounts?${params.toString()}`,
  );

  let recipients = (response.content ?? []).map(mapWiseRecipient);
  if (input?.search) {
    const term = input.search.toLowerCase();
    recipients = recipients.filter((recipient) =>
      [
        recipient.accountHolderName,
        recipient.currency,
        recipient.country,
        recipient.bankName,
        recipient.accountSummary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  return recipients;
}

export async function createWiseRecipient(input: {
  currency: string;
  type: string;
  accountHolderName: string;
  legalType: "PRIVATE" | "BUSINESS";
  details: Record<string, unknown>;
  ownedByCustomer?: boolean;
}) {
  const created = await wiseApiRequest<Record<string, unknown>>("/v1/accounts", {
    method: "POST",
    body: {
      currency: input.currency,
      type: input.type,
      profile: resolveWiseProfileId(),
      accountHolderName: input.accountHolderName,
      legalType: input.legalType,
      ownedByCustomer: input.ownedByCustomer ?? false,
      details: input.details,
    },
  });
  return mapWiseRecipient(created);
}

export async function deleteWiseRecipient(recipientId: number) {
  await wiseApiRequest(`/v1/accounts/${recipientId}`, { method: "DELETE" });
  return { ok: true };
}

export type WiseQuote = {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  estimatedDelivery: string | null;
  payIn: string | null;
  payOut: string | null;
  raw: Record<string, unknown>;
};

function pickBalancePaymentOption(quote: Record<string, unknown>) {
  const options = (quote.paymentOptions as Array<Record<string, unknown>> | undefined) ?? [];
  return (
    options.find((option) => option.payIn === "BALANCE") ??
    options[0] ??
    null
  );
}

export async function createWiseQuote(input: {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
  targetAccount?: number;
  profileId?: number;
}) {
  const profileId = resolveWiseProfileId(input.profileId);
  const quote = await wiseApiRequest<Record<string, unknown>>(`/v3/profiles/${profileId}/quotes`, {
    method: "POST",
    body: {
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      sourceAmount: input.sourceAmount,
      targetAmount: input.targetAmount,
      targetAccount: input.targetAccount,
      preferredPayIn: "BALANCE",
    },
  });

  const option = pickBalancePaymentOption(quote);
  const fee =
    ((option?.fee as Record<string, number> | undefined)?.total ??
      (option?.fee as Record<string, number> | undefined)?.transferwise ??
      0) as number;

  return {
    id: String(quote.id ?? ""),
    sourceCurrency: String(quote.sourceCurrency ?? input.sourceCurrency),
    targetCurrency: String(quote.targetCurrency ?? input.targetCurrency),
    sourceAmount: Number(quote.sourceAmount ?? input.sourceAmount ?? 0),
    targetAmount: Number(quote.targetAmount ?? option?.targetAmount ?? input.targetAmount ?? 0),
    rate: Number(quote.rate ?? option?.rate ?? 0),
    fee,
    estimatedDelivery: (option?.estimatedDelivery as string | null | undefined) ?? null,
    payIn: (option?.payIn as string | null | undefined) ?? null,
    payOut: (option?.payOut as string | null | undefined) ?? null,
    raw: quote,
  } satisfies WiseQuote;
}

export type WiseTransfer = {
  id: number;
  status: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceValue: number;
  targetValue: number;
  rate: number;
  reference: string | null;
  customerTransactionId: string | null;
  created: string;
  raw: Record<string, unknown>;
};

export async function createWiseTransfer(input: {
  targetAccount: number;
  quoteUuid: string;
  customerTransactionId: string;
  reference?: string;
  details?: Record<string, unknown>;
}) {
  const created = await wiseApiRequest<Record<string, unknown>>("/v1/transfers", {
    method: "POST",
    body: {
      targetAccount: input.targetAccount,
      quoteUuid: input.quoteUuid,
      customerTransactionId: input.customerTransactionId,
      details: {
        reference: input.reference,
        ...(input.details ?? {}),
      },
    },
  });

  return {
    id: Number(created.id),
    status: String(created.status ?? "incoming_payment_waiting"),
    sourceCurrency: String(created.sourceCurrency ?? ""),
    targetCurrency: String(created.targetCurrency ?? ""),
    sourceValue: Number(created.sourceValue ?? 0),
    targetValue: Number(created.targetValue ?? 0),
    rate: Number(created.rate ?? 0),
    reference: (created.details as Record<string, unknown> | undefined)?.reference as
      | string
      | null
      | undefined ?? null,
    customerTransactionId: (created.customerTransactionId as string | null | undefined) ?? null,
    created: String(created.created ?? new Date().toISOString()),
    raw: created,
  } satisfies WiseTransfer;
}

export async function verifyWiseBalanceStatementAccess(input?: {
  profileId?: number;
  balanceId?: number;
  currency?: string;
}) {
  const profileId = resolveWiseProfileId(input?.profileId);
  const balances = await listWiseBalances(profileId);
  const balance = input?.balanceId
    ? balances.find((entry) => entry.id === input.balanceId) ?? balances[0]
    : balances[0];

  if (!balance) {
    throw new Error("No Wise balances available to verify statement access.");
  }

  const intervalEnd = new Date().toISOString();
  const intervalStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const result = await getWiseBalanceTransactions({
    balanceId: balance.id,
    currency: input?.currency ?? balance.currency,
    intervalStart,
    intervalEnd,
    profileId,
  });

  return {
    balanceId: balance.id,
    currency: balance.currency,
    transactionCount: result.transactions.length,
    source: result.source,
    statementWarning: result.statementWarning,
    scaPrivateKeyConfigured: isWiseScaPrivateKeyConfigured(),
  };
}

export async function fundWiseTransfer(input: {
  transferId: number;
  balanceId: number;
  profileId?: number;
}) {
  const profileId = resolveWiseProfileId(input.profileId);
  return wiseApiRequest<Record<string, unknown>>(
    `/v3/profiles/${profileId}/transfers/${input.transferId}/payments`,
    {
      method: "POST",
      body: {
        type: "BALANCE",
        balanceId: input.balanceId,
      },
    },
  );
}

export async function getWiseTransfer(transferId: number) {
  const transfer = await wiseApiRequest<Record<string, unknown>>(`/v1/transfers/${transferId}`);
  return {
    id: Number(transfer.id),
    status: String(transfer.status ?? "unknown"),
    sourceCurrency: String(transfer.sourceCurrency ?? ""),
    targetCurrency: String(transfer.targetCurrency ?? ""),
    sourceValue: Number(transfer.sourceValue ?? 0),
    targetValue: Number(transfer.targetValue ?? 0),
    rate: Number(transfer.rate ?? 0),
    reference: (transfer.details as Record<string, unknown> | undefined)?.reference as
      | string
      | null
      | undefined ?? null,
    customerTransactionId: (transfer.customerTransactionId as string | null | undefined) ?? null,
    created: String(transfer.created ?? new Date().toISOString()),
    raw: transfer,
  } satisfies WiseTransfer;
}

export function mapWiseTransferStage(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("cancel") || normalized.includes("fail") || normalized.includes("bounce")) {
    return "failed" as const;
  }
  if (normalized.includes("outgoing_payment_sent") || normalized.includes("funds_converted")) {
    return "completed" as const;
  }
  if (
    normalized.includes("processing") ||
    normalized.includes("converted") ||
    normalized.includes("charged")
  ) {
    return "processing" as const;
  }
  if (normalized.includes("waiting") || normalized.includes("incoming_payment_waiting")) {
    return "awaiting_funding" as const;
  }
  return "draft" as const;
}

