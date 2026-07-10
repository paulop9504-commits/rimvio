const RRN_PATTERN =
  /\d{6}[-\s]?\d{7}|\d{13}|주민\s*(?:등록)?\s*번호|주민번호|resident\s*registration/iu;

/** Reject 주민번호 in default identity payloads (not sensitive opt-in kind). */
export function assertNoResidentIdInDefaultPool(
  payload: unknown,
  kindLabel: string,
): void {
  const text = JSON.stringify(payload ?? {});
  if (RRN_PATTERN.test(text)) {
    throw new Error(`identity_vault_rrn_forbidden_in_${kindLabel}`);
  }
}

export function isResidentIdLike(value: string): boolean {
  return RRN_PATTERN.test(value.trim());
}
