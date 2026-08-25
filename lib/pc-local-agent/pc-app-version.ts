import { RIMVIO_PC_SETUP_VERSION } from "@/lib/pc-local-agent/setup-url";

export function parsePcAppVersion(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim();
  return /^\d+\.\d+\.\d+$/.test(value) ? value : null;
}

export function readReportedPcAppVersion(device: {
  app_version?: string | null;
  appVersion?: string | null;
  permissions?: unknown;
}): string | null {
  const direct = parsePcAppVersion(device.app_version ?? device.appVersion);
  if (direct) {
    return direct;
  }
  const perms = device.permissions;
  if (perms && typeof perms === "object" && "appVersion" in perms) {
    return parsePcAppVersion((perms as { appVersion?: unknown }).appVersion);
  }
  return null;
}

function parts(version: string): [number, number, number] {
  const [a, b, c] = version.split(".").map((n) => Number(n));
  return [a || 0, b || 0, c || 0];
}

/** Reported version is current when it equals or exceeds the shipped installer. */
export function isPcAppVersionCurrent(
  reported: string | null,
  expected = RIMVIO_PC_SETUP_VERSION,
): boolean {
  const have = parsePcAppVersion(reported);
  if (!have) {
    return false;
  }
  const [ha, hb, hc] = parts(have);
  const [ea, eb, ec] = parts(expected);
  if (ha !== ea) {
    return ha > ea;
  }
  if (hb !== eb) {
    return hb > eb;
  }
  return hc >= ec;
}

export function pcAppNeedsUpdate(
  reported: string | null,
  expected = RIMVIO_PC_SETUP_VERSION,
): boolean {
  return !isPcAppVersionCurrent(reported, expected);
}
