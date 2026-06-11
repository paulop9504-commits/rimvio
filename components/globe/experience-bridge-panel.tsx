"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listReadableBridgeParticipants } from "@/lib/experience-bridge";
import {
  fetchPeerThreadMembers,
  type PeerThreadMemberPublic,
} from "@/lib/peer-chat/peer-chat-client";
import { useExperienceBridge } from "@/hooks/use-experience-bridge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type ExperienceBridgePanelProps = {
  event: EventCandidate;
  peerThreadId?: string | null;
  className?: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "초대됨";
    case "accepted":
      return "함께 보는 중";
    case "declined":
      return "거절";
    case "left":
      return "나감";
    case "removed":
      return "제외됨";
    default:
      return status;
  }
}

/** Shared experience — invite · accept · merged participants (v1). */
export function ExperienceBridgePanel({
  event,
  peerThreadId,
  className,
}: ExperienceBridgePanelProps) {
  const { user, configured } = useAuth();
  const bridge = useExperienceBridge({ event, peerThreadId, enabled: configured });
  const [members, setMembers] = useState<PeerThreadMemberPublic[]>([]);
  const [busy, setBusy] = useState(false);

  const threadId = peerThreadId?.trim() || bridge.state?.bridge.peerThreadId?.trim() || "";

  useEffect(() => {
    if (!threadId || !configured) {
      return;
    }
    void fetchPeerThreadMembers(threadId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [threadId, configured]);

  const myParticipant = bridge.state?.participants.find(
    (row) => row.userId === user?.id,
  );
  const canInvite = bridge.isHost;
  const pendingInvite = myParticipant?.status === "pending";
  const activeParticipants = useMemo(
    () => listReadableBridgeParticipants(bridge.state?.participants ?? []),
    [bridge.state?.participants],
  );

  const inviteCandidates = members.filter(
    (member) =>
      member.userId !== user?.id &&
      !bridge.state?.participants.some(
        (row) =>
          row.userId === member.userId &&
          row.status !== "declined" &&
          row.status !== "left",
      ),
  );

  const handleInvite = async (member: PeerThreadMemberPublic) => {
    const displayName =
      member.displayName?.trim() || member.rimvioId?.trim() || "친구";
    setBusy(true);
    try {
      await bridge.invite({
        userId: member.userId,
        displayName,
      });
      toast.success(`${displayName}님을 초대했어요`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "초대하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      await bridge.accept();
      toast.success("여행이 연결됐어요 · 내 지도에도 핀이 생겼어요");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "수락하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await bridge.decline();
      toast.message("초대를 거절했어요");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "거절하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await bridge.leave();
      toast.message("공유 보기에서 나왔어요 · 내 추억은 그대로 남아요");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "나가지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return null;
  }

  return (
    <section
      className={cn("space-y-3 rounded-2xl bg-muted/40 p-4", className)}
      data-experience-bridge
    >
      <div className="space-y-1">
        <p className="text-[12px] font-semibold text-muted-foreground">함께하는 경험</p>
        <p className="text-[13px] leading-snug text-foreground">
          같은 여행 · 각자 지도 · 한 타임라인. 상대 사진은 Rimvio 안에서만 볼 수 있어요.
        </p>
      </div>

      {pendingInvite ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAccept()}
            className="flex-1 rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-background shadow-sm disabled:opacity-60"
          >
            함께 보기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDecline()}
            className="rounded-xl px-4 py-3 text-[14px] font-medium text-muted-foreground"
          >
            거절
          </button>
        </div>
      ) : null}

      {activeParticipants.length > 0 ? (
        <ul className="space-y-1.5">
          {activeParticipants.map((row) => (
            <li
              key={row.userId}
              className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-[13px]"
            >
              <span className="font-medium text-foreground">{row.displayName}</span>
              <span className="text-muted-foreground">{statusLabel(row.status)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {canInvite && inviteCandidates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-muted-foreground">초대하기</p>
          <div className="flex flex-wrap gap-2">
            {inviteCandidates.map((member) => (
              <button
                key={member.userId}
                type="button"
                disabled={busy}
                onClick={() => void handleInvite(member)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm disabled:opacity-60"
              >
                + {member.displayName}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canInvite && !bridge.state && threadId ? (
        <button
          type="button"
          disabled={busy || bridge.loading}
          onClick={() => void bridge.bootstrap()}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-sm disabled:opacity-60"
        >
          함께하기 시작
        </button>
      ) : null}

      {myParticipant?.status === "accepted" && myParticipant.role !== "host" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleLeave()}
          className="text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          공유 보기에서 나가기
        </button>
      ) : null}

      {bridge.timeline.length > 0 ? (
        <p className="text-[12px] text-muted-foreground">
          합쳐진 순간 {bridge.timeline.length}개 · 상대 사진은 저장할 수 없어요
        </p>
      ) : null}
    </section>
  );
}
