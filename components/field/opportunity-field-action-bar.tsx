"use client";

import { Calendar, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { openMarketChatForListing } from "@/lib/globe/market/open-market-alignment-offer";
import { ensureSeekingIntentSynced } from "@/lib/globe/market/client/ensure-seeking-intent-synced";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";
import {
  agentNegotiationRoomPath,
  bootstrapAgentNegotiationFromSession,
  getAgentNegotiationRoom,
  startAgentNegotiationRoom,
} from "@/lib/globe/market/coordination/agent-negotiation-store";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { cn } from "@/lib/utils";

export type OpportunityFieldActionBarProps = {
  focusEventId: string;
  seeking: MarketIntentRecord;
  matchIntentId: string;
  peerDisplayName: string;
  listingPriceLine?: string;
  /** Already in schedule pipeline for this listing — skip bootstrap, go to trades tab. */
  hasActiveTrade?: boolean;
  activeTradeSession?: MarketTradeSessionView | null;
  navigate: (href: string) => void;
  onBeforeNavigate?: () => void;
  onChatOpened?: () => void;
  onScheduleStarted?: () => void;
  onCoordinationStarted?: () => void;
  /** Seller listing reserved for another buyer — return to discovery list. */
  onListingReserved?: () => void;
  className?: string;
};

export function OpportunityFieldActionBar({
  focusEventId,
  seeking,
  matchIntentId,
  peerDisplayName,
  listingPriceLine = "",
  hasActiveTrade = false,
  activeTradeSession = null,
  navigate,
  onBeforeNavigate,
  onChatOpened,
  onScheduleStarted,
  onCoordinationStarted,
  onListingReserved,
  className,
}: OpportunityFieldActionBarProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const auth = copy.auth;
  const { configured, user, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<"chat" | "schedule" | "coordination" | "login" | null>(null);

  const runChat = async () => {
    if (busy) {
      return;
    }
    if (!configured) {
      toast.error(field.actionUnavailable);
      return;
    }
    if (!loading && !user) {
      toast.message(field.loginRequiredBody);
      return;
    }
    setBusy("chat");
    try {
      const syncedSeeking = await ensureSeekingIntentSynced(seeking);
      await openMarketChatForListing({
        focusEventId,
        seekingIntentId: syncedSeeking.id,
        matchIntentId,
        fromFieldDiscovery: true,
        initTradeSession: false,
        copy: { bridgeFail: copy.globe.marketAlignBridgeFail },
        navigate,
        onBeforeNavigate,
        skipNavigate: false,
        onThreadReady: (threadId) => {
          addPeerContact({
            peerThreadId: threadId,
            displayName: peerDisplayName.trim() || "친구",
          });
        },
      });
      onChatOpened?.();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "open_chat_failed";
      toast.error(readMarketHandshakeUserError(raw));
    } finally {
      setBusy(null);
    }
  };

  const runSchedule = async () => {
    if (busy) {
      return;
    }
    if (!configured) {
      toast.error(field.actionUnavailable);
      return;
    }
    if (!loading && !user) {
      toast.message(field.loginRequiredBody);
      return;
    }
    if (hasActiveTrade) {
      onScheduleStarted?.();
      return;
    }
    setBusy("schedule");
    try {
      const syncedSeeking = await ensureSeekingIntentSynced(seeking);
      const result = await openMarketChatForListing({
        focusEventId,
        seekingIntentId: syncedSeeking.id,
        matchIntentId,
        fromFieldDiscovery: true,
        initTradeSession: true,
        requireTradeSession: true,
        copy: { bridgeFail: copy.globe.marketAlignBridgeFail },
        navigate,
        onBeforeNavigate,
        skipNavigate: true,
      });
      if (result.alreadyCompleted) {
        toast.message(field.handshakeAlreadyCompleted);
      } else {
        toast.success(copy.globe.marketTradeStartedToast);
        onScheduleStarted?.();
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : "open_chat_failed";
      if (raw === "listing_meet_reserved") {
        toast.message(field.listingMeetReservedToast);
        onListingReserved?.();
        return;
      }
      toast.error(readMarketHandshakeUserError(raw));
    } finally {
      setBusy(null);
    }
  };

  const runCoordination = async () => {
    if (busy) {
      return;
    }
    if (!configured) {
      toast.error(field.actionUnavailable);
      return;
    }
    if (!loading && !user) {
      toast.message(field.loginRequiredBody);
      return;
    }
    if (activeTradeSession?.handshakeId) {
      await bootstrapAgentNegotiationFromSession(activeTradeSession, peerDisplayName);
      onBeforeNavigate?.();
      navigate(agentNegotiationRoomPath(activeTradeSession.handshakeId));
      onCoordinationStarted?.();
      return;
    }
    if (hasActiveTrade) {
      onCoordinationStarted?.();
      return;
    }
    setBusy("coordination");
    try {
      const syncedSeeking = await ensureSeekingIntentSynced(seeking);
      const result = await openMarketChatForListing({
        focusEventId,
        seekingIntentId: syncedSeeking.id,
        matchIntentId,
        fromFieldDiscovery: true,
        initTradeSession: true,
        requireTradeSession: true,
        copy: { bridgeFail: copy.globe.marketAlignBridgeFail },
        navigate,
        onBeforeNavigate,
        skipNavigate: true,
      });
      if (!result.handshakeId) {
        throw new Error("open_chat_failed");
      }
      await startAgentNegotiationRoom({
        handshakeId: result.handshakeId,
        threadId: result.threadId,
        productTitle: peerDisplayName.trim() || "거래",
        priceLine: listingPriceLine.trim(),
        peerDisplayName: peerDisplayName.trim() || "상대",
        viewerRole: "seeking",
      });
      onBeforeNavigate?.();
      navigate(agentNegotiationRoomPath(result.handshakeId));
      onCoordinationStarted?.();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "open_chat_failed";
      if (raw === "listing_meet_reserved") {
        toast.message(field.listingMeetReservedToast);
        onListingReserved?.();
        return;
      }
      toast.error(readMarketHandshakeUserError(raw));
    } finally {
      setBusy(null);
    }
  };

  const onSignIn = () => {
    setBusy("login");
    void signInWithGoogle("/")
      .catch(() => {
        toast.error(auth.loginFail, { description: auth.loginFailHint });
      })
      .finally(() => setBusy(null));
  };

  const showLoginStrip = configured && !loading && !user;
  const coordinationHandshakeId = activeTradeSession?.handshakeId ?? null;
  const hasOpenCoordinationRoom = coordinationHandshakeId
    ? Boolean(getAgentNegotiationRoom(coordinationHandshakeId))
    : false;
  const coordinationLabel =
    activeTradeSession || hasActiveTrade || hasOpenCoordinationRoom
      ? field.coordinationViewCta
      : field.coordinationCta;

  return (
    <div
      className={cn(
        "relative z-20 shrink-0 touch-manipulation border-t border-[#eef1f4] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]",
        className,
      )}
      data-opportunity-field-action-bar
    >
      {showLoginStrip ? (
        <div className="mx-4 mb-3 rounded-2xl bg-[#f8f9fb] px-4 py-3 ring-1 ring-black/[0.04]">
          <p className="text-[14px] font-semibold text-[#191f28]">{field.loginRequiredTitle}</p>
          <p className="mt-1 text-[13px] leading-snug text-[#6b7684]">{field.loginRequiredBody}</p>
          <GoogleSignInButton
            className="mt-3 w-full"
            label={auth.googleContinue}
            busy={busy === "login"}
            onClick={onSignIn}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 px-4">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runCoordination()}
          className="flex w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b from-[#3b8bfd] to-[#2563eb] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(49,130,246,0.35)] active:from-[#2563eb] active:to-[#1d4ed8] disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-2 text-[16px] font-semibold leading-tight">
            {busy === "coordination" ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-5 shrink-0" aria-hidden />
            )}
            {coordinationLabel}
          </span>
          {!hasActiveTrade ? (
            <span className="text-[12px] font-medium leading-tight text-white/85">
              {field.coordinationCtaHint}
            </span>
          ) : null}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runChat()}
            className="flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-2xl border border-[#e5e8eb] bg-[#fafbfc] py-3 text-[15px] font-semibold text-[#191f28] active:bg-[#f2f4f6] disabled:opacity-50"
          >
            {busy === "chat" ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="size-[18px] shrink-0 text-[#4e5968]" aria-hidden />
            )}
            {field.chatCta}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runSchedule()}
            className="flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-2xl border border-[#dbeafe] bg-white py-3 text-[15px] font-semibold text-[#1d4ed8] active:bg-[#eff6ff] disabled:opacity-50"
          >
            {busy === "schedule" ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Calendar className="size-[18px] shrink-0 text-[#3182f6]" aria-hidden />
            )}
            {hasActiveTrade ? field.scheduleViewCta : field.scheduleCta}
          </button>
        </div>
      </div>
    </div>
  );
}
