"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import { formatPeerMessageContextTime } from "@/lib/peer-chat/format-message-time";
import { cn } from "@/lib/utils";

export type PeerMessageLongPressSheetProps = {
  open: boolean;
  sentAt: string | null | undefined;
  onOpenChange: (open: boolean) => void;
};

/** 인스타 DM — 길게 누르면 보낸 시각만 드러나는 얇은 시트 */
export function PeerMessageLongPressSheet({
  open,
  sentAt,
  onOpenChange,
}: PeerMessageLongPressSheetProps) {
  const copy = useCopy();
  const dm = copy.peers.dmChat;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange, open]);

  if (!mounted || !open) {
    return null;
  }

  const label = sentAt ? formatPeerMessageContextTime(sentAt) : "";

  return createPortal(
    <>
      <button
        type="button"
        aria-label="닫기"
        className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-label={label || dm.longPressTimeAria}
        className={cn(
          "fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[81] mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]",
        )}
      >
        <p className="border-b border-black/[0.06] px-4 py-3 text-center text-[13px] font-medium text-[#8E8E8E]">
          {label}
        </p>
        <button
          type="button"
          className="w-full py-3.5 text-[15px] font-semibold text-[#262626] active:bg-black/[0.04]"
          onClick={() => onOpenChange(false)}
        >
          {dm.longPressClose}
        </button>
      </div>
    </>,
    document.body,
  );
}
