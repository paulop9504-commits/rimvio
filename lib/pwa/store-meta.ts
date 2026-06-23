import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  shortDescription:
    "일상의 맥락을 경험으로 구조화하고, 다음 행동까지 연결하는 Experience OS",
  longDescription:
    "Rimvio(림비오)는 시간·장소·사람·행동으로 흩어진 하루를 하나의 경험으로 엮습니다. 지나온 장소와 사진, 대화가 지구 위에 남고, 쌓인 맥락에서 길찾기·일정·공유 등 필요한 다음 행동을 제안합니다. 대화만 하는 앱이 아닙니다. 당신이 고르고, 한 번의 실행으로 이어집니다.",
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
      label: "경험은 남기고, 실행은 한 번에",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${RIMVIO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
