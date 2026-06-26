import type { RegionalProfile } from "@/lib/preferences/regional-profile";

export function formatRegionalMeetAtLabel(
  iso: string,
  profile: RegionalProfile,
  now = new Date(),
): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) {
    return "";
  }

  const useHour12 = profile.countryCode === "US" || profile.countryCode === "PH";

  return new Intl.DateTimeFormat(profile.numberLocale, {
    timeZone: profile.timeZone,
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: useHour12,
  }).format(at);
}

export function formatRegionalCountdownLabel(
  meetAtIso: string,
  profile: RegionalProfile,
  now = new Date(),
): string | null {
  const meetAt = new Date(meetAtIso).getTime();
  if (!Number.isFinite(meetAt)) {
    return null;
  }
  const diffMs = meetAt - now.getTime();
  if (diffMs <= 0) {
    return null;
  }

  const totalMin = Math.round(diffMs / 60_000);
  const locale = profile.numberLocale.split("-")[0] ?? "en";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (totalMin < 60) {
    return rtf.format(totalMin, "minute");
  }

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) {
    return rtf.format(hours, "hour");
  }

  if (profile.numberLocale.startsWith("ko")) {
    return `${hours}시간 ${mins}분 남음`;
  }
  return `${hours}h ${mins}m left`;
}

export function formatRegionalPinDateLabel(
  iso: string | null | undefined,
  profile: RegionalProfile,
): string | null {
  const raw = iso?.trim();
  if (!raw) {
    return null;
  }
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    return null;
  }

  return new Intl.DateTimeFormat(profile.numberLocale, {
    timeZone: profile.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(ms))
    .replace(/\//g, ".");
}
