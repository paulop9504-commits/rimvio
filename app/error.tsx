"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RimvioLogo } from "@/components/rimvio-logo";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Root route error boundary — Globe home (`/`) and other app pages. */
export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error("[rimvio]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-rimvio-base px-6 py-10 text-center">
      <RimvioLogo size="md" appearance="white" />
      <div className="max-w-sm space-y-2">
        <h1 className="text-[17px] font-semibold text-white/90">페이지를 열지 못했어요</h1>
        <p className="text-[14px] leading-relaxed text-white/55">
          새로고침하면 대부분 해결됩니다. 브라우저 확장 프로그램이 콘솔에 오류를 띄울 수 있어요 — 시크릿
          창에서도 확인해 보세요.
        </p>
        {error.digest ? (
          <p className="font-mono text-[10px] text-white/25">ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-rimvio-base"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-medium text-white/80"
        >
          뒤로
        </button>
        <Link
          href="/feed"
          className="rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-medium text-white/80"
        >
          피드로
        </Link>
      </div>
    </div>
  );
}
