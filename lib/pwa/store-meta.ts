import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  /** Google / HTML meta · Twitter — keep SEO keywords early. */
  shortDescription:
    "Rimvio는 현실 세계의 장소와 경험을 AI가 이해하는 Context 기반 Experience OS입니다. Reality Graph와 AI Agent를 통해 탐색, 비교, 예약, 다음 행동까지 연결합니다.",
  /** Open Graph · store full listing. */
  longDescription:
    "Rimvio(림비오)는 현실 세계를 이해하는 AI Experience OS입니다. 사용자의 Context를 중심으로 장소·경험·일정·관계·데이터를 Reality Graph로 연결하고, Context AI Agent가 Workspace에서 후보 탐색·비교·일정 구성·예약 준비·다음 행동까지 이어 줍니다. 3D Globe에서 장소(Object)·진행 중 작업(Capsule)·AI 분석이 같은 공간에 연결되며, \"지난번 오사카 여행 이어서\"처럼 Context Resume로 이전 작업을 그대로 이어갑니다. Reality Commit은 당신이 승인할 때만 실행됩니다.",
  keywords: [
    "Rimvio",
    "림비오",
    "AI Experience OS",
    "Experience OS",
    "Context",
    "Reality Graph",
    "AI Agent",
    "Workspace",
    "Context Resume",
    "Globe",
    "맥락",
    "여행",
    "예약",
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
