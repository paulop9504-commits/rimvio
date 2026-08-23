"use client";

import { useMemo, useState } from "react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { PeerTalkContactBubbles } from "@/components/action-chat/peer-talk-contact-bubbles";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { composePeerSendMessage } from "@/lib/jarvis-peer-send/compose-peer-send-message";
import type { InlineChatPeerSendWire } from "@/lib/jarvis-peer-send/inline-chat-peer-send";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type InlineChatPeerSendChipProps = {
  wire: InlineChatPeerSendWire;
  className?: string;
  onConfirmSend?: (messageId?: string) => void;
  onPickContact?: (contact: PeerContact, messageBody: string) => void;
  busy?: boolean;
};

function RecipientHeader({
  displayName,
  peerThreadId,
}: {
  displayName: string;
  peerThreadId: string;
}) {
  const phoneDm = isRegisteredPeerDmThread(peerThreadId);
  const { profile, loading } = useDmPeerProfile(peerThreadId, phoneDm);
  const name = profile?.displayName?.trim() || displayName;

  if (loading) {
    return <p className="text-[12px] text-white/55">프로필 불러오는 중…</p>;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <PeerProfileAvatar
        displayName={name}
        avatarUrl={profile?.avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {profile?.rimvioId ? (
          <p className="truncate text-[12px] text-[#FEE500]/90">@{profile.rimvioId}</p>
        ) : null}
      </div>
    </div>
  );
}

export function InlineChatPeerSendChip({
  wire,
  className,
  onConfirmSend,
  onPickContact,
  busy = false,
}: InlineChatPeerSendChipProps) {
  const { user, configured } = useAuth();
  const canUse = Boolean(configured && user && isSupabaseConfigured());
  const [picked, setPicked] = useState<PeerContact | null>(null);

  const activeContact = useMemo(() => {
    if (picked) {
      return picked;
    }
    if (wire.disambiguation?.length === 1) {
      return wire.disambiguation[0]!;
    }
    return null;
  }, [picked, wire.disambiguation]);

  const displayName =
    activeContact?.displayName.trim() ||
    wire.recipientDisplayName.trim() ||
    wire.recipientQuery;
  const threadId = activeContact?.peerThreadId ?? wire.peerThreadId;
  const previewBody =
    activeContact != null
      ? composePeerSendMessage({
          recipientDisplayName: displayName,
          intentText: wire.intentText,
          shareTripLabel: wire.shareTrip ? wire.shareTripLabel ?? "여행" : null,
          tripScheduleLines: wire.tripScheduleLines,
        })
      : wire.messageBody;

  const brand = resolveMainActionBrandStyle({
    label: "전송하기",
    deeplink: "",
  });

  if (!canUse) {
    return (
      <p className={cn("text-[12px] text-amber-200/90", className)}>
        메신저 전송은 로그인 후에 쓸 수 있어요.
      </p>
    );
  }

  if (wire.status === "sent") {
    return (
      <p className={cn("text-[12px] text-emerald-300/90", className)}>
        전송 완료 · 메신저 탭에서 확인하세요.
      </p>
    );
  }

  if (wire.status === "cancelled") {
    return (
      <p className={cn("text-[12px] text-white/45", className)}>전송 취소됨</p>
    );
  }

  if (wire.status === "failed") {
    return (
      <p className={cn("text-[12px] text-red-300/90", className)}>
        {wire.errorKo ?? "전송에 실패했어요"}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {wire.disambiguation && wire.disambiguation.length > 1 && !activeContact ? (
        <div className="space-y-2">
          <p className="text-[12px] text-white/55">누구에게 보낼까요?</p>
          <PeerTalkContactBubbles
            contacts={wire.disambiguation}
            onPick={(contact) => {
              setPicked(contact);
              const body = composePeerSendMessage({
                recipientDisplayName: contact.displayName,
                intentText: wire.intentText,
                shareTripLabel: wire.shareTrip ? wire.shareTripLabel ?? "여행" : null,
                tripScheduleLines: wire.tripScheduleLines,
              });
              onPickContact?.(contact, body);
            }}
          />
        </div>
      ) : (
        <RecipientHeader displayName={displayName} peerThreadId={threadId} />
      )}

      <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          보낼 메시지
        </p>
        {wire.shareTrip && wire.tripScheduleLines && wire.tripScheduleLines.length > 0 ? (
          <div className="mt-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-2">
            <p className="text-[11px] font-semibold text-cyan-200/90">
              📅 {wire.shareTripLabel ?? "여행"} 일정
            </p>
            <ul className="mt-1 space-y-0.5">
              {wire.tripScheduleLines.slice(0, 5).map((line) => (
                <li key={line} className="text-[12px] text-white/70">
                  · {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
          {previewBody}
        </p>
      </div>

      <p className="text-[12px] text-white/55">메시지를 전송할까요?</p>

      <MainActionButton
        label={busy ? "전송 중…" : "전송하기"}
        brand={brand}
        compact
        onClick={() => onConfirmSend?.()}
        disabled={busy || Boolean(wire.disambiguation?.length && !activeContact)}
      />
    </div>
  );
}
