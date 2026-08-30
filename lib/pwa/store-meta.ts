import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  /** Browser tab · Google title. */
  seoTitle: "Rimvio(림비오) — 원하는 일을 말하세요",
  /** Google snippet · HTML meta · Twitter. Keep identical so SERP/OG do not diverge. */
  shortDescription: "원하는 일을 말하세요. Rimvio가 만들고, AI가 실행합니다.",
  /** Open Graph · store full listing — same line as Google intro. */
  longDescription: "원하는 일을 말하세요. Rimvio가 만들고, AI가 실행합니다.",
  keywords: [
    "Rimvio",
    "림비오",
    "실행 AI",
    "Agent",
    "생산자",
    "참여자",
    "개발자",
    "맥락",
    "계획",
    "비교",
    "예약",
    "Hub",
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
