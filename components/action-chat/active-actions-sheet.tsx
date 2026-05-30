"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  Calendar,
  Link2,
  MapPin,
  Navigation,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { ActionCountdownStrip } from "@/components/action-chat/action-countdown-strip";
import type {
  ActiveActionEntry,
  ActiveActionKind,
} from "@/lib/action-chat/active-actions-registry";
import { cn } from "@/lib/utils";

type ActiveActionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ActiveActionEntry[];
  onCancelScheduled: (messageId: string) => void;
  onFireScheduledNow: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onCancelLinkReminder?: (linkId: string) => void;
  onOpenLink?: (linkId: string) => void;
  onDemoteToPool?: (linkId: string) => void;
};

function kindIcon(kind: ActiveActionKind) {
  switch (kind) {
    case "scheduled_nav":
      return Navigation;
    case "link_reminder":
      return Bell;
    case "pending_confirm":
      return MapPin;
    default:
      return Sparkles;
  }
}

function kindLabel(kind: ActiveActionKind) {
  switch (kind) {
    case "scheduled_nav":
      return "예약된 이동";
    case "link_reminder":
      return "링크 알림";
    case "pending_confirm":
      return "확인 대기";
    default:
      return "활성 액션";
  }
}

export function ActiveActionsSheet({
  open,
  onOpenChange,
  actions,
  onCancelScheduled,
  onFireScheduledNow,
  onScrollToMessage,
  onCancelLinkReminder,
  onOpenLink,
  onDemoteToPool,
}: ActiveActionsSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[80] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="액션 스트림"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(78vh,640px)] max-w-lg flex-col rounded-t-[24px] border border-black/5 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.04] px-5 pb-3 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#10B981]/12 text-[#10B981]">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1F2937]">액션 스트림</p>
                  <p className="text-[11px] text-[#6B7280]">
                    {actions.length > 0
                      ? `${actions.length}건 · 시간 트리거 활성`
                      : "예약·알림·확인 대기 중인 항목"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-black/[0.04]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {actions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAFB] px-4 py-8 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#10B981]/10 text-[#10B981]">
                    <Timer className="size-5" />
                  </div>
                  <p className="text-[14px] font-medium text-[#374151]">액션 스트림이 비어 있어요</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#9CA3AF]">
                    링크 카드의 시간 아이콘을 누르거나 &quot;3시에 확인해줘&quot;라고 말하면
                    여기에 쌓여요.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {actions.map((entry) => {
                    const Icon = kindIcon(entry.kind);
                    const showCountdown =
                      entry.fireAt &&
                      (entry.kind === "scheduled_nav" || entry.kind === "link_reminder");

                    return (
                      <li
                        key={entry.id}
                        className="rounded-2xl border border-black/[0.06] bg-[#F9FAFB] p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#10B981] shadow-sm">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[14px] font-semibold text-[#1F2937]">
                                {entry.title}
                              </p>
                              <span className="shrink-0 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-semibold text-[#059669]">
                                {kindLabel(entry.kind)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">
                              {entry.subtitle}
                            </p>
                            {showCountdown ? (
                              <div className="mt-2">
                                <ActionCountdownStrip
                                  targetIso={entry.fireAt!}
                                  phase="scheduled"
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.messageId ? (
                            <button
                              type="button"
                              onClick={() => {
                                onScrollToMessage(entry.messageId!);
                                onOpenChange(false);
                              }}
                              className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151]"
                            >
                              메시지로 이동
                            </button>
                          ) : null}

                          {entry.linkId ? (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenLink?.(entry.linkId!);
                                onOpenChange(false);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151]"
                            >
                              <Link2 className="size-3.5" />
                              링크로 이동
                            </button>
                          ) : null}

                          {entry.kind === "scheduled_nav" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onFireScheduledNow(entry.messageId!)}
                                className={cn(
                                  "rounded-xl px-3 py-2 text-[12px] font-semibold text-white",
                                  "bg-[#10B981] hover:bg-[#059669]"
                                )}
                              >
                                지금 길찾기
                              </button>
                              <button
                                type="button"
                                onClick={() => onCancelScheduled(entry.messageId!)}
                                className="rounded-xl border border-[#FCA5A5]/60 bg-[#FEF2F2] px-3 py-2 text-[12px] font-semibold text-[#DC2626]"
                              >
                                예약 취소
                              </button>
                            </>
                          ) : null}

                          {entry.kind === "link_reminder" && entry.linkId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onDemoteToPool?.(entry.linkId!)}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#6366F1]/30 bg-[#EEF2FF] px-3 py-2 text-[12px] font-semibold text-[#4F46E5]"
                              >
                                <Bookmark className="size-3.5" />
                                리소스로
                              </button>
                              <button
                                type="button"
                                onClick={() => onCancelLinkReminder?.(entry.linkId!)}
                                className="rounded-xl border border-[#FCA5A5]/60 bg-[#FEF2F2] px-3 py-2 text-[12px] font-semibold text-[#DC2626]"
                              >
                                알림 끄기
                              </button>
                            </>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
