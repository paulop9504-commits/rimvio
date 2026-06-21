"use client";

import { Camera } from "lucide-react";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { ContextTalkSegment } from "@/lib/experience-window/project-context-talk-segments";
import { isPeerGlobePinPayload } from "@/lib/peer-chat/globe-pin-types";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_RADIUS, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ContextTalkDiscussionListProps = {
  messages: readonly PeerMessage[];
  segments: readonly ContextTalkSegment[];
  speakerNameFor: (author: PeerMessage["author"]) => string;
  className?: string;
};

function messagesForSegment(
  messages: readonly PeerMessage[],
  segment: ContextTalkSegment,
): PeerMessage[] {
  const allow = new Set(segment.messageIds);
  return messages.filter((row) => allow.has(row.id));
}

/** Experience talk — glass list with segment dividers (no bubble chrome). */
export function ContextTalkDiscussionList({
  messages,
  segments,
  speakerNameFor,
  className,
}: ContextTalkDiscussionListProps) {
  const humanMessages = messages.filter((row) => row.author !== "ai");

  if (humanMessages.length === 0) {
    return (
      <p className={cn("py-10 text-center text-sm text-muted-foreground", className)}>
        {copy.globe.contextTalkEmpty}
      </p>
    );
  }

  return (
    <div className={cn("space-y-4 pb-4 pt-12", className)} data-context-talk-list>
      {segments.map((segment) => {
        const rows = messagesForSegment(humanMessages, segment);
        if (rows.length === 0) {
          return null;
        }

        return (
          <section
            key={segment.id}
            className="space-y-2"
            data-context-talk-segment={segment.id}
          >
            <div className="px-4">
              <p className={RIMVIO_TYPE.eyebrow}>{segment.label}</p>
              {segment.placeLabel?.trim() ? (
                <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                  {segment.placeLabel}
                </p>
              ) : null}
            </div>

            <ul
              className={cn(
                "mx-3 overflow-hidden border border-white/50 bg-white/78 shadow-sm backdrop-blur-md",
                RIMVIO_RADIUS.lg,
              )}
            >
              {rows.map((message) => {
                const body = message.body.trim();
                const imageUrl = message.imageUrl?.trim() || null;
                const globePin =
                  message.messageType === "system" &&
                  isPeerGlobePinPayload(message.aiPayload)
                    ? message.aiPayload
                    : null;
                if (!body && !imageUrl && !globePin) {
                  return null;
                }

                return (
                  <li
                    key={message.id}
                    data-context-talk-message={message.id}
                    className="border-b border-border/60 px-3.5 py-3 last:border-b-0"
                  >
                    <p className="text-[13px] font-semibold text-foreground">
                      {speakerNameFor(message.author)}
                    </p>
                    {body ? (
                      <p className="mt-0.5 text-[14px] leading-snug text-foreground/88">
                        &ldquo;{body}&rdquo;
                      </p>
                    ) : null}
                    {globePin ? (
                      <p className="mt-1 text-[13px] font-medium text-primary/90">
                        {globePin.placeLabel}
                      </p>
                    ) : null}
                    {(imageUrl || globePin?.imageUrl) ? (
                      <div className="relative mt-2 overflow-hidden rounded-xl ring-1 ring-black/[0.06]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(imageUrl || globePin?.imageUrl)!}
                          alt=""
                          className="max-h-48 w-full object-cover"
                          loading="lazy"
                        />
                        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Camera className="size-3" aria-hidden />
                          {copy.globe.contextTalkMediaPin}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
