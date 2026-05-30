import { GLANGO } from "@/lib/brand/glango";

/** App Store / Play Store / OG listing copy — single source of truth. */
export const STORE_META = {
  shortDescription:
    "카톡·브라우저 링크를 지금 할 일로 정리하고, 함께 볼 링크는 한 방에서.",
  longDescription:
    "Glango(글랑고)는 카카오톡·브라우저에서 받은 링크를 바로 '지금 할 일'로 정리해 주는 링크 companion 앱입니다. 스와이프로 정리하고, 함께하기 방에서 링크를 공유하세요. 처음 시작할 때 나만의 글랑고 색을 뽑을 수 있어요.",
  keywords: [
    "링크",
    "할일",
    "정리",
    "공유",
    "PWA",
    "글랑고",
    "Glango",
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
      label: "나의 링크 — 스와이프 피드",
    },
    welcome: {
      path: "/store/welcome-mobile.png",
      width: 390,
      height: 844,
      label: "시작하기 — 글랑고 색 뽑기",
    },
  },
} as const;

export function storeAbsoluteUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    `https://${GLANGO.domain}`;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
