"use client";

import { Calendar, Loader2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { openMarketChatForListing } from "@/lib/globe/market/open-market-alignment-offer";
import { ensureSeekingIntentSynced } from "@/lib/globe/market/client/ensure-seeking-intent-synced";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { cn } from "@/lib/utils";

export type OpportunityFieldActionBarProps = {
  focusEventId: string;
  seeking: MarketIntentRecord;
  matchIntentId: string;
  peerDisplayName: string;
  /** Already in trade for this listing — skip bootstrap, go to trades tab. */
  hasActiveTrade?: boolean;
  navigate: (href: string) => void;
  onBeforeNavigate?: () => void;
  onChatOpened?: () => void;
  onScheduleStarted?: () => void;
  className?: string;
};

export function OpportunityFieldActionBar({
  focusEventId,
  seeking,
  matchIntentId,
  peerDisplayName,
  hasActiveTrade = false,
  navigate,
  onBeforeNavigate,
  onChatOpened,
  onScheduleStarted,
  className,
}: OpportunityFieldActionBarProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const auth = copy.auth;
  const { configured, user, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<"chat" | "schedule" | "login" | null>(null);

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
      await openMarketChatForListing({
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
      toast.success(copy.globe.marketTradeStartedToast);
      onScheduleStarted?.();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "open_chat_failed";
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

  return (
    <div
      className={cn(
        "shrink-0 border-t border-[#eef1f4] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
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

      <div className="flex gap-2 px-4">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runChat()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#e5e8eb] bg-white py-3.5 text-[16px] font-semibold text-[#191f28] active:bg-[#f8f9fb] disabled:opacity-50"
        >
          {busy === "chat" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="size-5 shrink-0 text-[#4e5968]" aria-hidden />
          )}
          {field.chatCta}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runSchedule()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#3182f6] py-3.5 text-[16px] font-semibold text-white active:bg-[#2563eb] disabled:opacity-50"
        >
          {busy === "schedule" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Calendar className="size-5 shrink-0" aria-hidden />
          )}
          {hasActiveTrade ? field.scheduleViewCta : field.scheduleCta}
        </button>
      </div>
    </div>
  );
}
