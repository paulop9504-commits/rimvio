import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  shortDescription:
    "살아본 맥락을 온톨로지로 붙이고, 에이전트가 비교·예약·다음 행동을 준비하는 Experience OS",
  longDescription:
    "Rimvio(림비오)는 시간·장소·사람·행동을 하나의 경험 온톨로지로 엮는 에이전틱 Experience OS입니다. 대화와 지구 위 Diff에 맥락이 쌓이면, 에이전트가 검색·가격 비교·예약 준비까지 맡습니다. 결제와 Reality Commit은 당신이 승인할 때만 실행됩니다. 챗봇이 아니라, 구조가 남고 행동이 이어지는 OS입니다.",
  keywords: [
    "Rimvio",
    "림비오",
    "Experience OS",
    "에이전틱",
    "온톨로지",
    "agentic",
    "ontology",
    "맥락",
    "여행",
    "예약",
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
      label: "온톨로지 위에 에이전트가 준비한다",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${RIMVIO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
