"use client";

import { MessageCircle } from "lucide-react";
import { GlobeContextPhotoButton } from "@/components/globe/globe-context-photo-button";
import { GlobeContextSendRail } from "@/components/globe/globe-context-send-rail";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeContextShareDelivery } from "@/lib/experience-bridge/deliver-globe-context-to-peer-chat";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type BridgePinSheetFooterProps = {
  event: EventCandidate;
  eventId: string;
  eventTitle: string;
  delivery: GlobeContextShareDelivery;
  talkOpening: boolean;
  showTalk: boolean;
  onOpenTalk: () => void;
  onOpenShareMore: () => void;
  onPhotoIngested: () => void;
  className?: string;
};

/** Bridge pin footer — IG-style compact send rail + paired pill actions. */
export function BridgePinSheetFooter({
  event,
  eventId,
  eventTitle,
  delivery,
  talkOpening,
  showTalk,
  onOpenTalk,
  onOpenShareMore,
  onPhotoIngested,
  className,
}: BridgePinSheetFooterProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/50 bg-background/92 px-3.5 py-2.5 backdrop-blur-xl",
        "pb-[max(0.65rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-bridge-pin-sheet-footer
    >
      <GlobeContextSendRail
        event={event}
        delivery={delivery}
        onOpenMore={onOpenShareMore}
        compact
        className="mb-2"
      />
      <div className="flex items-stretch gap-2">
        {showTalk ? (
          <button
            type="button"
            onClick={onOpenTalk}
            disabled={talkOpening}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#3182f6] px-4 text-[14px] font-semibold text-white active:opacity-90 disabled:opacity-50"
            data-pin-open-talk
          >
            <MessageCircle className="size-[18px] shrink-0" aria-hidden />
            <span className="truncate">
              {talkOpening
                ? copy.globe.bridgeContextTalkOpening
                : copy.globe.bridgeContextTalkCta}
            </span>
          </button>
        ) : null}
        <GlobeContextPhotoButton
          eventId={eventId}
          eventTitle={eventTitle}
          variant="secondary"
          layout={showTalk ? "compact" : "full"}
          className={showTalk ? "min-h-[44px] flex-1" : "w-full min-h-[44px]"}
          onIngested={onPhotoIngested}
        />
      </div>
    </div>
  );
}
