/**
 * Parse KRW-ish labels for Simulation budget deltas.
 * Grounded only — returns null when unparseable (never invent).
 */

export function parseWonAmount(label: string | null | undefined): number | null {
  if (!label?.trim()) return null;
  const raw = label.trim();

  // 272,350원 / ₩120,000 / 120000원
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) {
    // ₩₩ band only — approximate mid of priceBand-like repeats
    const bands = (raw.match(/₩|￦/g) ?? []).length;
    if (bands >= 1 && bands <= 4) {
      return bands * 40_000;
    }
    return null;
  }

  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;

  // "12만" / "₩12만/박"
  if (/만/u.test(raw) && n < 1000) {
    return Math.round(n * 10_000);
  }

  return Math.round(n);
}

export function formatWonDelta(delta: number): string {
  if (delta === 0) return "가격 변동 없음";
  const abs = Math.abs(delta).toLocaleString("ko-KR");
  return delta < 0 ? `-${abs}원` : `+${abs}원`;
}

export function formatMinutesDelta(delta: number, emptyKo = "변동 없음"): string {
  if (delta === 0) return emptyKo;
  return delta > 0 ? `+${delta}분` : `${delta}분`;
}
