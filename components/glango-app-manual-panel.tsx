"use client";

import Link from "next/link";
import {
  AtSign,
  Calendar,
  FolderGit2,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

const MENTION_EXAMPLES = [
  { token: "@링크시트", desc: "시트 URL → 리소스풀 + 바로 열기" },
  { token: "@설명서", desc: "호출어 전체 목록" },
  { token: "@네비", desc: "길찾기 · 카카오맵/네이버" },
  { token: "@타이머", desc: "몇 분 타이머" },
  { token: "@복붙", desc: "클립보드 → 주소·링크·전화" },
  { token: "@송금", desc: "토스·카카오페이" },
  { token: "@더치", desc: "n빈 계산" },
  { token: "@배달", desc: "배민·쿠팡이츠" },
  { token: "@택배", desc: "송장 추적" },
  { token: "@출근", desc: "출근 길·일정" },
  { token: "@메모", desc: "리소스풀에 저장" },
] as const;

export function GlangoAppManualPanel({ className }: { className?: string }) {
  const copy = useCopy();

  return (
    <section className={cn("space-y-4 p-4", IOS.cardSm, className)}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-glango-neon-cyan">
          {copy.manual.eyebrow}
        </p>
        <h2 className="mt-1 text-base font-semibold tracking-tight">
          {copy.manual.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {copy.manual.summary}
        </p>
      </div>

      <ol className="space-y-3">
        <li className="flex gap-3 rounded-2xl bg-glango-surface-muted/80 px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-glango-neon-purple/15 text-glango-neon-purple">
            <MessageSquare className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{copy.manual.step1Title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {copy.manual.step1Body}
            </p>
          </div>
        </li>
        <li className="flex gap-3 rounded-2xl bg-glango-surface-muted/80 px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-glango-neon-cyan/15 text-glango-neon-cyan">
            <AtSign className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{copy.manual.step2Title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {copy.manual.step2Body}
            </p>
          </div>
        </li>
        <li className="flex gap-3 rounded-2xl bg-glango-surface-muted/80 px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-glango-neon-green/15 text-glango-neon-green">
            <Zap className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{copy.manual.step3Title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {copy.manual.step3Body}
            </p>
          </div>
        </li>
      </ol>

      <div>
        <p className="text-xs font-semibold text-foreground">{copy.manual.mentionsTitle}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{copy.manual.mentionsHint}</p>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {MENTION_EXAMPLES.map((row) => (
            <li
              key={row.token}
              className="flex items-center justify-between gap-2 rounded-xl bg-glango-surface-muted/60 px-2.5 py-2 text-[11px]"
            >
              <span className="font-semibold text-glango-neon-cyan">{row.token}</span>
              <span className="truncate text-muted-foreground">{row.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">{copy.manual.mentionsMore}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-glango-surface-muted/80 px-3 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-glango-neon-amber" />
            <p className="text-xs font-semibold">{copy.manual.calendarTitle}</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {copy.manual.calendarBody}
          </p>
        </div>
        <div className="rounded-2xl bg-glango-surface-muted/80 px-3 py-3">
          <div className="flex items-center gap-2">
            <FolderGit2 className="size-4 text-glango-neon-purple" />
            <p className="text-xs font-semibold">{copy.manual.poolTitle}</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {copy.manual.poolBody}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-glango-neon-purple/20 bg-glango-neon-purple/5 px-3 py-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-glango-neon-purple" />
          <p className="text-xs leading-relaxed text-foreground">{copy.manual.tagline}</p>
        </div>
      </div>

      <Link
        href="/"
        className={cn("block w-full text-center", IOS.primaryBtn)}
      >
        {copy.manual.tryCta}
      </Link>
    </section>
  );
}
