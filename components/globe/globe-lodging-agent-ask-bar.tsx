"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  buildLodgingAgentContainer,
  runLodgingAgentTurn,
  writeLodgingAgentSession,
  type LodgingAgentContainer,
  type LodgingAgentTurnResult,
} from "@/lib/globe/lodging-agent";
import { cn } from "@/lib/utils";

export type GlobeLodgingAgentAskBarProps = {
  event: EventCandidate;
  row: ContextLodgingInventoryRow;
  resourceId: string;
  userDisplayName?: string | null;
  onTurnComplete?: (result: LodgingAgentTurnResult) => void;
  className?: string;
};

/** Lodging pin context container — Host + Context RAG → tool call → Ghost Pin map feedback. */
export function GlobeLodgingAgentAskBar({
  event,
  row,
  resourceId,
  userDisplayName = null,
  onTurnComplete,
  className,
}: GlobeLodgingAgentAskBarProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [container] = useState<LodgingAgentContainer>(() => {
    const built = buildLodgingAgentContainer({
      event,
      row,
      resourceId,
      userDisplayName,
    });
    writeLodgingAgentSession(built);
    return built;
  });

  const handleSubmit = useCallback(async () => {
    const text = message.trim();
    if (!text || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await runLodgingAgentTurn({
        event,
        row,
        resourceId,
        message: text,
        container,
        userDisplayName,
      });
      setLastReply(result.replyText);
      setMessage("");
      if (result.mapPins.length > 0) {
        toast.success(result.replyText);
      } else {
        toast.message(result.replyText);
      }
      onTurnComplete?.(result);
    } catch {
      toast.error(copy.globe.lodgingAgentEmpty);
    } finally {
      setBusy(false);
    }
  }, [busy, container, event, message, onTurnComplete, resourceId, row, userDisplayName]);

  return (
    <div className={cn("space-y-2", className)} data-globe-lodging-agent-ask-bar>
      {lastReply ? (
        <p className="rounded-xl bg-[#f5f5f7] px-2.5 py-2 text-[11px] leading-relaxed text-[#515154]">
          {lastReply}
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-[#86868b]">
          {copy.globe.lodgingAgentHint}
        </p>
      )}
      <div className="flex items-center gap-2 rounded-2xl bg-white/90 p-2 shadow-sm ring-1 ring-black/[0.04]">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#007aff]/10 text-[10px] font-bold text-[#007aff]"
          aria-hidden
        >
          {copy.globe.lodgingAgentBadge}
        </span>
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={copy.globe.lodgingAgentPlaceholder}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none disabled:opacity-60"
          aria-label={copy.globe.lodgingAgentPlaceholder}
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy || !message.trim()}
          className="shrink-0 rounded-full bg-[#007aff] px-3 py-1.5 text-[12px] font-semibold text-white active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? copy.globe.lodgingAgentBusy : copy.globe.lodgingAgentSubmit}
        </button>
      </div>
    </div>
  );
}
