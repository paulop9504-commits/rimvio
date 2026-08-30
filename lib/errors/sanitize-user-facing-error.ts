import { copy } from "@/lib/copy/human-ko";

export type UserFacingErrorKind =
  | "quota"
  | "rate_limit"
  | "auth"
  | "network"
  | "unknown";

export type SanitizedUserFacingError = {
  readonly kind: UserFacingErrorKind;
  readonly messageKo: string;
};

const QUOTA_PATTERN =
  /quota has been exceeded|resource_exhausted|over_query_limit|daily limit|billing|insufficient_quota|rate limit|too many requests|429/u;

const AUTH_PATTERN =
  /invalid api key|api key not valid|unauthorized|permission denied|401|403/u;

const NETWORK_PATTERN =
  /failed to fetch|network error|networkrequestfailed|econnrefused|timeout/u;

function readErrorText(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  if (error && typeof error === "object") {
    const row = error as Record<string, unknown>;
    if (typeof row.message === "string" && row.message.trim()) {
      return row.message.trim();
    }
    if (typeof row.error === "string" && row.error.trim()) {
      return row.error.trim();
    }
  }
  return "";
}

export function classifyUserFacingError(error: unknown): UserFacingErrorKind {
  const text = readErrorText(error).toLowerCase();
  if (!text) return "unknown";
  if (QUOTA_PATTERN.test(text) || /\b429\b/u.test(text)) {
    return "quota";
  }
  if (RATE_LIMIT_ONLY(text)) {
    return "rate_limit";
  }
  if (AUTH_PATTERN.test(text)) {
    return "auth";
  }
  if (NETWORK_PATTERN.test(text)) {
    return "network";
  }
  return "unknown";
}

function RATE_LIMIT_ONLY(text: string): boolean {
  return /rate limit|too many requests/u.test(text) && !/quota/u.test(text);
}

export function sanitizeUserFacingError(
  error: unknown,
  fallback = copy.globe.ingestAttachFail,
): SanitizedUserFacingError {
  const kind = classifyUserFacingError(error);
  switch (kind) {
    case "quota":
      return { kind, messageKo: copy.globe.ingestQuotaExceeded };
    case "rate_limit":
      return { kind, messageKo: copy.globe.ingestRateLimited };
    case "auth":
      return { kind, messageKo: copy.globe.ingestApiAuthFail };
    case "network":
      return { kind, messageKo: copy.globe.ingestNetworkFail };
    default:
      return { kind, messageKo: fallback };
  }
}

/** Composer / toast — never leak raw English provider errors. */
export function resolveComposerErrorKo(
  error: unknown,
  fallback = copy.globe.ingestAttachFail,
): string {
  const raw = readErrorText(error);
  if (!raw) {
    return fallback;
  }
  const kind = classifyUserFacingError(raw);
  if (kind === "unknown" && /^[\x00-\x7F]+$/u.test(raw)) {
    return fallback;
  }
  return sanitizeUserFacingError(raw, fallback).messageKo;
}
