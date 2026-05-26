"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearDemoLinks, seedDemoLinks } from "@/lib/demo/seed";

const PREVIEWS = [
  {
    label: "🧪 Action 실험 — 지도 + 카카오T",
    href: "/now?url=https://map.naver.com/p/search/%EA%B0%95%EB%A6%89",
    desc: "🚕 카카오T · 🗺 검색 · 📋 강릉 복사",
  },
  {
    label: "🧪 Action 실험 — YouTube t=",
    href: "/now?url=https://www.youtube.com/watch?v=yfHasxI_s2A&t=90s",
    desc: "▶️ 재생 · 📱 앱 · ⏱ 1:30 복사",
  },
  {
    label: "🧪 Action 실험 — 쿠팡 + 앱",
    href: "/now?url=https://www.coupang.com/vp/products/123456",
    desc: "🛒 쿠팡 · 📱 앱 · 📋 복사",
  },
  {
    label: "🧪 Action 실험 — 야놀자 + 카카오T",
    href: "/now?url=https://www.yanolja.com/",
    desc: "🏨 숙소 · 🚕 카카오T · 📋 복사",
  },
  {
    label: "🧪 Action 실험 — 코레일",
    href: "/now?url=https://www.letskorail.com/",
    desc: "🚄 기차 예매 · 🚕 카카오T",
  },
  {
    label: "🧪 Action 실험 — T맵",
    href: "/now?url=https://www.tmap.co.kr/",
    desc: "🚗 T맵 길찾기 · 📱 앱",
  },
  {
    label: "Feed (Shorts)",
    href: "/",
    desc: "↑↓ 스와이프 — 쇼츠처럼 넘기기",
  },
  {
    label: "Stack",
    href: "/stack",
    desc: "맨 위 1장 + ghost stack",
  },
  {
    label: "Inbox (전체)",
    href: "/inbox",
    desc: "데모 링크 6개 카드",
  },
  {
    label: "YouTube Now",
    href: "/now?url=https://www.youtube.com/watch?v=yfHasxI_s2A",
    desc: "▶️ 영상 바로 재생 pill",
  },
  {
    label: "yo-go Now",
    href: "/now?url=https://yo-go.co.kr/",
    desc: "🛒 타임딜 enricher",
  },
  {
    label: "Kakao Now",
    href: "/now?url=https://open.kakao.com/o/gsXxUJui",
    desc: "💬 오픈채팅 입장 pill",
  },
  {
    label: "Share → Feed pin",
    href: "/share?url=https://www.youtube.com/watch?v=yfHasxI_s2A",
    desc: "공유 → Now → Done → Feed 맨 위 👀",
  },
  {
    label: "Archive",
    href: "/archive",
    desc: "만료 링크 1개",
  },
];

export function DemoLauncher() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const links = seedDemoLinks();
    setCount(links.length);
  }, []);

  const reseed = () => {
    const links = seedDemoLinks(true);
    setCount(links.length);
    router.refresh();
  };

  const reset = () => {
    clearDemoLinks();
    setCount(0);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Demo
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {count}개 샘플 링크가 sessionStorage에 로드됨 (YouTube · 지도 ·
          요고 · Figma · Linear · Archive)
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="rounded-2xl" onClick={reseed}>
            다시 채우기
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={reset}>
            초기화
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {PREVIEWS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl bg-card px-5 py-4 shadow-sm transition-transform active:scale-[0.98]"
          >
            <p className="font-semibold tracking-tight">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
