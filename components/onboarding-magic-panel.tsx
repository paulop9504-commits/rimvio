"use client";

import { CalendarDays, UtensilsCrossed, Sparkles } from "lucide-react";
import {
  COLD_START_DINING_SEED,
  COLD_START_SCHEDULE_SEED,
  markColdStartComplete,
  markColdStartSeedSent,
} from "@/lib/onboarding/cold-start-magic";
import { ACTION_CHAT } from "@/lib/ui/action-chat-theme";
import { cn } from "@/lib/utils";

type OnboardingMagicPanelProps = {
  onSendSeed: (message: string) => void;
  onDismiss?: () => void;
  className?: string;
};

export function OnboardingMagicPanel({ onSendSeed, onDismiss, className }: OnboardingMagicPanelProps) {
  return (
    <section
      className={cn(
        "mx-4 mb-3 overflow-hidden rounded-2xl border border-[#E9E5FF] bg-white shadow-[0_12px_32px_-24px_rgba(123,97,255,0.65)]",
        className
      )}
    >
      <div
        className="px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${ACTION_CHAT.accentSoft}, #fff)` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[#7B61FF]" />
          <p className="text-sm font-semibold text-[#1F2937]">30초 온보딩</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
          일정 1개와 맛집 1개만 던져보세요. 비서가 바로 세팅해 드릴게요.
        </p>
      </div>

      <div className="grid gap-2 p-3">
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl bg-[#F7F6FF] px-3 py-3 text-left transition active:scale-[0.99]"
          onClick={() => {
            markColdStartSeedSent("schedule");
            onSendSeed(COLD_START_SCHEDULE_SEED);
          }}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white text-[#7B61FF]">
            <CalendarDays className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#1F2937]">일정 1개</span>
            <span className="block truncate text-xs text-[#6B7280]">
              {COLD_START_SCHEDULE_SEED}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl bg-[#F7F6FF] px-3 py-3 text-left transition active:scale-[0.99]"
          onClick={() => {
            markColdStartSeedSent("dining");
            onSendSeed(COLD_START_DINING_SEED);
          }}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white text-[#7B61FF]">
            <UtensilsCrossed className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#1F2937]">맛집 1개</span>
            <span className="block truncate text-xs text-[#6B7280]">
              {COLD_START_DINING_SEED}
            </span>
          </span>
        </button>
      </div>

      <div className="border-t border-[#F3F4F6] px-3 py-2">
        <button
          type="button"
          className="w-full py-1 text-[11px] font-medium text-[#9CA3AF]"
          onClick={() => {
            markColdStartComplete();
            onDismiss?.();
          }}
        >
          나중에 할게요
        </button>
      </div>
    </section>
  );
}
