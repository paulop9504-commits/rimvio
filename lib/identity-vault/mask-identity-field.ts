/** Mask PII for HubAction logs, telemetry, and UI chips. */

export function maskPassportNumber(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "****";
  }
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function maskPhoneE164(value: string): string {
  const digits = value.replace(/\D/gu, "");
  if (digits.length <= 4) {
    return "****";
  }
  return `***${digits.slice(-4)}`;
}

export function maskEmail(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");
  if (at <= 1) {
    return "***@***";
  }
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}

export function maskLicenseNumber(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 3) {
    return "***";
  }
  return `***${trimmed.slice(-3)}`;
}

export function maskIdentityField(
  field: "passport" | "phone" | "email" | "license",
  value: string,
): string {
  switch (field) {
    case "passport":
      return maskPassportNumber(value);
    case "phone":
      return maskPhoneE164(value);
    case "email":
      return maskEmail(value);
    case "license":
      return maskLicenseNumber(value);
  }
}
