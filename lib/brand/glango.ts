/** Glango product brand — user-facing name & URLs */
export const GLANGO = {
  name: "Glango",
  nameKo: "글랑고",
  lockup: "Glango · 글랑고",
  tagline: "링크를 받는 순간, 바로 이어집니다",
  taglineShort: "받는 순간, 바로",
  domain: "glango.app",
  homeLabel: "Glango 홈",
} as const;

export function glangoBeamUrl(slug: string) {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : `https://${GLANGO.domain}`;

  return `${base}/s/${slug}`;
}

/** @deprecated use GLANGO */
export const GLANG = GLANGO;
/** @deprecated use glangoBeamUrl */
export const glangBeamUrl = glangoBeamUrl;
