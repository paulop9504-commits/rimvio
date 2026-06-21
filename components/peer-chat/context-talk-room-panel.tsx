"use client";

import { useEffect, useRef } from "react";
import { ContextTalkDiscussionList } from "@/components/peer-chat/context-talk-discussion-list";
import { ContextTalkMapBackdrop } from "@/components/peer-chat/context-talk-map-backdrop";
import { ContextTalkSegmentStrip } from "@/components/peer-chat/context-talk-segment-strip";
import {
  useContextTalkRoom,
  useContextTalkScrollSync,
} from "@/hooks/use-context-talk-room";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import { cn } from "@/lib/utils";

export type ContextTalkRoomPanelProps = {
  eventId: string | null;
  tripTitle?: string | null;
  policyInput: PeerThreadPolicyInput;
  messages: readonly PeerMessage[];
  speakerNameFor: (author: PeerMessage["author"]) => string;
  composer: React.ReactNode;
  className?: string;
};

/** Context Talk — map backdrop + scroll-sync segment + glass thread. */
export function ContextTalkRoomPanel({
  eventId,
  tripTitle,
  policyInput,
  messages,
  speakerNameFor,
  composer,
  className,
}: ContextTalkRoomPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const talk = useContextTalkRoom({
    eventId,
    peerThreadId: policyInput.settings.peerThreadId,
    messages,
    tripTitle,
    enabled: true,
  });

  useContextTalkScrollSync({
    scrollRootRef: scrollRef,
    enabled: true,
    onMessageVisible: talk.onMessageVisible,
  });

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      data-context-talk-room
    >
      <ContextTalkMapBackdrop view={talk.mapView} pins={talk.mapPins} />
      <ContextTalkSegmentStrip segment={talk.activeSegment} />

      <div
        ref={scrollRef}
        className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ContextTalkDiscussionList
          messages={messages}
          segments={talk.segments}
          speakerNameFor={speakerNameFor}
        />
      </div>

      <div className="relative z-[2] shrink-0 border-t border-border/70 bg-background/88 backdrop-blur-md">
        {composer}
      </div>
    </div>
  );
}
