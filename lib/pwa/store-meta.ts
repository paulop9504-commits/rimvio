import { RIMVIO } from "@/lib/brand/rimvio";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  shortDescription:
    "Your Life, Operable. 말·링크·사진 → Action Dock으로 바로 실행.",
  longDescription:
    "Rimvio(림비오)는 Human Intent를 위한 Action OS입니다. 대화가 아니라 실행 — 말·링크·사진·일정을 Action Dock과 Custom Trigger로 operable하게 만듭니다. 카톡·브라우저 공유는 ingress 중 하나이며, NAVIGATE·REGISTER_ACTION·correction까지 이어지는 개인 automation 레이어입니다.",
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
    feed: {
      path: "/store/feed-mobile.png",
      width: 390,
      height: 844,
      label: "실행 — Action Dock 피드",
    },
    welcome: {
      path: "/store/welcome-mobile.png",
      width: 390,
      height: 844,
      label: "시작하기 — Your Life, Operable.",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${RIMVIO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
