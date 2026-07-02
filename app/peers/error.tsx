"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RimvioLogo } from "@/components/rimvio-logo";

type PeersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Peers hub + thread segment error boundary — avoids blank white PWA shell. */
export default function PeersError({ error, reset }: PeersErrorProps) {
  useEffect(() => {
    console.error("[peers]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 py-10 text-center">
      <RimvioLogo size="md" appearance="dark" />
      <div className="max-w-sm space-y-2">
        <h1 className="text-[17px] font-semibold text-foreground">
          채팅을 불러오지 못했어요
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          새로고침 후 다시 시도해 주세요.
        </p>
        {error.digest ? (
          <p className="font-mono text-[10px] text-muted-foreground/60">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-2.5 text-[14px] font-semibold text-foreground"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
