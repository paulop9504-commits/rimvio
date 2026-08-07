import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  /** Google / HTML meta · Twitter — consumer line (no internal OS jargon). */
  shortDescription:
    "맥락을 하나로 잇고, AI와 함께 계획하고 비교하고 실행합니다.",
  /** Open Graph · store full listing. */
  longDescription:
    "Rimvio(림비오)는 맥락을 하나로 잇고, AI와 함께 계획하고 비교하고 실행합니다. 장소·경험·일정을 이어 두고 후보를 찾고 비교·일정·예약 준비까지 이어 주며, 실제 실행은 당신이 확인할 때만 진행됩니다.",
  keywords: [
    "Rimvio",
    "림비오",
    "맥락",
    "AI",
    "여행",
    "계획",
    "비교",
    "예약",
    "Experience OS",
    "Globe",
    "PWA",
  ],
  category: "productivity",
  ogImage: "/store/og-cover.png",
  icons: {
    p192: "/icons/icon-192.png",
    p512: "/icons/icon-512.png",
  },
  screenshots: {
    /** 스토어 1장: 대화 + Lens 말풍선 */
    peers: {
      path: "/store/peers-mobile.png",
      width: 390,
      height: 844,
      label: "친구 — 대화에서 실행 버튼",
    },
    /** 스토어 2장: 링크 Shorts → Dock */
    feed: {
      path: "/store/feed-mobile.png",
      width: 390,
      height: 844,
      label: "실행 — 링크를 실행 카드로",
    },
    /** 스토어 3장: 온보딩·한 문장 */
    welcome: {
      path: "/store/welcome-mobile.png",
      width: 390,
      height: 844,
      label: "Context AI가 Workspace에서 다음을 준비한다",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${RIMVIO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
