import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  shortDescription:
    "말하고, 공유하고 — 실행은 탭 한 번. 친구 대화·링크에서 실행만 골라요.",
  longDescription:
    "Rimvio(림비오)는 챗봇·북마크 앱이 아닌 Action OS입니다. 친구 대화(ROOM)에서는 AI Lens가 일정·길찾기 말풍선을 제안하고, 실행 탭(Feed)에서는 공유 링크가 Action Dock 카드로 바뀝니다. 자동 실행 없음 — Human decides, tap to run. 카톡·브라우저 공유는 ingress 중 하나입니다.",
  keywords: [
    "링크",
    "할일",
    "정리",
    "공유",
    "PWA",
    "림비오",
    "Rimvio",
    "bookmark",
    "productivity",
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
      label: "말하고, 공유하고 — 실행은 탭 한 번",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${RIMVIO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
