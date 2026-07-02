"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import {
  approveAgentNegotiationRoom,
  runAgentNegotiationTurn,
  submitAgentNegotiationSlotAnswer,
} from "@/lib/globe/market/coordination/agent-negotiation-store";
import { viewerHasApprovedCoordination } from "@/lib/globe/market/coordination/detect-agent-coordination-attention";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { peerRoomPath } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { openFieldTradesIngress } from "@/lib/nav/field-dashboard-ingress";
import { cn } from "@/lib/utils";

export type AgentNegotiationRoomPanelProps = {
  room: AgentNegotiationRoomRecord;
  onRoomChange: (room: AgentNegotiationRoomRecord) => void;
  onApprove?: (room: AgentNegotiationRoomRecord) => void;
  onRefresh?: () => Promise<void>;
  pollRemote?: boolean;
  className?: string;
};

export function AgentNegotiationRoomPanel({
  room,
  onRoomChange,
  onApprove,
  onRefresh,
  pollRemote = true,
  className,
}: AgentNegotiationRoomPanelProps) {
  const copy = useCopy();
  const ui = copy.globe.coordination;
  const [customValue, setCustomValue] = useState("");
  const [visibleCount, setVisibleCount] = useState(() => room.log.length);
  const tickRef = useRef<number | null>(null);

  const streamDone = visibleCount >= room.log.length;
  const negotiating =
    room.state === "NEGOTIATING" && streamDone && room.pendingQuestion == null;
  const canAnswerSlot = room.pendingQuestion?.ownerRole === room.viewerRole;
  const viewerApproved = viewerHasApprovedCoordination(room);

  useEffect(() => {
    setVisibleCount((count) => Math.min(count, room.log.length));
  }, [room.handshakeId, room.log.length]);

  useEffect(() => {
    if (visibleCount < room.log.length) {
      const timer = window.setTimeout(() => {
        setVisibleCount((count) => Math.min(count + 1, room.log.length));
      }, 420);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [room.log.length, visibleCount]);

  useEffect(() => {
    if (!negotiating) {
      return undefined;
    }
    tickRef.current = window.setTimeout(() => {
      void runAgentNegotiationTurn(room.handshakeId).then((next) => {
        if (next) {
          onRoomChange(next);
        }
      });
    }, 900);
    return () => {
      if (tickRef.current) {
        window.clearTimeout(tickRef.current);
      }
    };
  }, [negotiating, onRoomChange, room.handshakeId, room.turnCount, room.state]);

  useEffect(() => {
    if (!onRefresh || !pollRemote) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void onRefresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [onRefresh, pollRemote]);

  const onChipAnswer = useCallback(
    (value: string) => {
      if (!room.pendingQuestion || !canAnswerSlot) {
        return;
      }
      void submitAgentNegotiationSlotAnswer({
        handshakeId: room.handshakeId,
        slotKey: room.pendingQuestion.slotKey,
        valueKo: value,
      }).then((next) => {
        if (next) {
          setCustomValue("");
          onRoomChange(next);
        }
      });
    },
    [canAnswerSlot, onRoomChange, room.handshakeId, room.pendingQuestion],
  );

  const onCustomSubmit = () => {
    if (!room.pendingQuestion || !customValue.trim() || !canAnswerSlot) {
      return;
    }
    onChipAnswer(customValue.trim());
  };

  const onApproveProposal = () => {
    void approveAgentNegotiationRoom(room.handshakeId).then((approved) => {
      if (!approved) {
        return;
      }
      onRoomChange(approved);
      onApprove?.(approved);
      if (approved.state === "APPROVED") {
        toast.success(ui.approveSuccessToast);
        openFieldTradesIngress(approved.handshakeId);
        return;
      }
      toast.success(ui.approveWaitingPeerToast);
    });
  };

  const statusLabel = (() => {
    switch (room.state) {
      case "WAITING_USER_INPUT":
        return canAnswerSlot ? ui.stateWaitingYou : ui.waitingPeer;
      case "PAUSED":
        return canAnswerSlot ? ui.statePaused : ui.waitingPeer;
      case "AGREED":
        return viewerApproved ? ui.waitingPeerApproval : ui.stateAgreed;
      case "STUCK":
        return ui.stateStuck;
      case "APPROVED":
        return ui.stateApproved;
      default:
        return ui.stateNegotiating;
    }
  })();

  const visibleLog = room.log.slice(0, visibleCount);

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col bg-[#f8f9fb]", className)}
      data-agent-negotiation-room={room.handshakeId}
    >
      <div className="shrink-0 border-b border-[#eef1f4] bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8f3ff] to-[#dbeafe] text-[#2563eb]">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#191f28]">
                {room.productTitle}
              </p>
              <p className="text-[12px] text-[#6b7684]">{statusLabel}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#6b7684]">
            {ui.readOnlyBadge}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-2.5">
          {visibleLog.map((entry, index) => {
            if (entry.type === "system") {
              return (
                <li
                  key={`${entry.atIso}-${index}`}
                  className="text-center text-[12px] leading-relaxed text-[#8b95a1]"
                >
                  {entry.text}
                </li>
              );
            }
            if (entry.type === "user_injected") {
              return (
                <li
                  key={`${entry.atIso}-${index}`}
                  className="ml-6 rounded-2xl bg-[#fff7ed] px-3.5 py-2.5 text-[14px] leading-snug text-[#9a3412] ring-1 ring-[#fed7aa]/80"
                >
                  <span className="font-semibold">{entry.labelKo}</span>: {entry.valueKo}
                </li>
              );
            }
            const self =
              entry.type === "agent" &&
              (entry.role ? entry.role === room.viewerRole : entry.side === "self");
            return (
              <li
                key={`${entry.atIso}-${index}`}
                className={cn("flex", self ? "justify-end" : "justify-start")}
              >
                <p
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug",
                    self
                      ? "bg-[#3182f6] text-white"
                      : "bg-white text-[#191f28] ring-1 ring-black/[0.05]",
                  )}
                >
                  {entry.text}
                </p>
              </li>
            );
          })}
          {negotiating && streamDone ? (
            <li className="flex justify-start">
              <span className="rounded-2xl bg-white px-3 py-2 text-[13px] text-[#8b95a1] ring-1 ring-black/[0.05]">
                {ui.typingHint}
              </span>
            </li>
          ) : null}
        </ul>
      </div>

      {room.pendingQuestion &&
      (room.state === "WAITING_USER_INPUT" || room.state === "PAUSED") ? (
        <div className="shrink-0 border-t border-[#eef1f4] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {canAnswerSlot ? (
            <>
              <p className="text-[13px] font-semibold text-[#191f28]">
                {room.pendingQuestion.questionKo}
              </p>
              {room.state === "PAUSED" ? (
                <p className="mt-1 text-[12px] text-[#6b7684]">{ui.pausedHint}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {room.pendingQuestion.chips?.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onChipAnswer(chip)}
                    className="rounded-full bg-[#eff6ff] px-3.5 py-2 text-[13px] font-semibold text-[#1d4ed8] active:bg-[#dbeafe]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  placeholder={ui.customAnswerPlaceholder}
                  className="min-w-0 flex-1 rounded-xl border border-[#e5e8eb] bg-[#fafbfc] px-3 py-2.5 text-[14px] outline-none focus:border-[#3182f6]"
                />
                <button
                  type="button"
                  disabled={!customValue.trim()}
                  onClick={onCustomSubmit}
                  className="shrink-0 rounded-xl bg-[#191f28] px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  {ui.answerCta}
                </button>
              </div>
            </>
          ) : (
            <p className="text-[14px] leading-relaxed text-[#6b7684]">{ui.waitingPeer}</p>
          )}
        </div>
      ) : null}

      {room.state === "AGREED" && room.proposal ? (
        <div className="shrink-0 border-t border-[#eef1f4] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[13px] font-semibold text-[#8b95a1]">{ui.summaryTitle}</p>
          <ul className="mt-2 space-y-1.5 text-[15px] text-[#191f28]">
            <li>
              <span className="text-[#6b7684]">{ui.summaryPrice}</span> {room.proposal.priceKo}
            </li>
            <li>
              <span className="text-[#6b7684]">{ui.summaryTime}</span> {room.proposal.meetTimeKo}
            </li>
            <li>
              <span className="text-[#6b7684]">{ui.summaryPlace}</span> {room.proposal.meetPlaceKo}
            </li>
          </ul>
          <button
            type="button"
            onClick={onApproveProposal}
            disabled={viewerApproved}
            className="mt-4 w-full rounded-2xl bg-[#3182f6] py-3.5 text-[16px] font-semibold text-white active:bg-[#2563eb] disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]"
          >
            {viewerApproved ? ui.waitingPeerApproval : ui.approveCta}
          </button>
        </div>
      ) : null}

      {room.state === "APPROVED" && room.proposal ? (
        <div className="shrink-0 border-t border-[#eef1f4] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[13px] font-semibold text-[#8b95a1]">{ui.summaryTitle}</p>
          <ul className="mt-2 space-y-1.5 text-[15px] text-[#191f28]">
            <li>
              <span className="text-[#6b7684]">{ui.summaryPrice}</span> {room.proposal.priceKo}
            </li>
            <li>
              <span className="text-[#6b7684]">{ui.summaryTime}</span> {room.proposal.meetTimeKo}
            </li>
            <li>
              <span className="text-[#6b7684]">{ui.summaryPlace}</span> {room.proposal.meetPlaceKo}
            </li>
          </ul>
          <button
            type="button"
            onClick={() => openFieldTradesIngress(room.handshakeId)}
            className="mt-4 w-full rounded-2xl bg-[#3182f6] py-3.5 text-[16px] font-semibold text-white active:bg-[#2563eb]"
          >
            {ui.attentionOpenTrades}
          </button>
        </div>
      ) : null}

      {room.state === "STUCK" ? (
        <div className="shrink-0 border-t border-[#eef1f4] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[14px] leading-relaxed text-[#6b7684]">{ui.stuckBody}</p>
          {room.threadId ? (
            <button
              type="button"
              onClick={() => window.location.assign(peerRoomPath(room.threadId!))}
              className="mt-3 w-full rounded-2xl border border-[#e5e8eb] bg-white py-3 text-[15px] font-semibold text-[#191f28]"
            >
              {ui.openPeerChatCta}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
