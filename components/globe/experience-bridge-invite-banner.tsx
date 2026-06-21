"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { buildExperienceRoomHref } from "@/lib/globe/project-experience-conversation";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import { useAuth } from "@/hooks/use-auth";
import {
  rimvioCompactPrimaryCtaClass,
  rimvioGhostCtaClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ExperienceBridgeInviteBannerProps = {
  invites: readonly PendingBridgeInvite[];
  onAccepted?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
  className?: string;
};

/** Globe home — pending shared experience invite (accept / decline). */
export function ExperienceBridgeInviteBanner({
  invites,
  onAccepted,
  onDismiss,
  className,
}: ExperienceBridgeInviteBannerProps) {
  const router = useRouter();
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const { user } = useAuth();

  if (invites.length === 0) {
    return null;
  }

  const primary = invites[0]!;
  const { bridge } = primary.state;
  const host = primary.state.participants.find((row) => row.role === "host");
  const hostName = host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
  const overflow = invites.length - 1;

  const handleAccept = async () => {
    setBusyEventId(bridge.eventId);
    try {
      const data = await acceptExperienceBridgeRemote(bridge.eventId);
      await completeBridgeInviteAccept({
        state: data.state,
        peerThreadId: data.pinSpec.peerThreadId,
        viewerUserId: user?.id,
      });
      toast.success(copy.globe.bridgeInviteAccepted, {
        action: data.pinSpec.peerThreadId
          ? {
              label: copy.globe.bridgeTalkContinueCta,
              onClick: () => {
                router.push(
                  buildExperienceRoomHref({
                    peerThreadId: data.pinSpec.peerThreadId!,
                    eventId: bridge.eventId,
                    title: bridge.title,
                    place: bridge.placeLabel ?? "",
                  }),
                );
              },
            }
          : undefined,
      });
      onAccepted?.(bridge.eventId);
      onDismiss?.(bridge.eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDecline = async () => {
    setBusyEventId(bridge.eventId);
    try {
      const data = await declineExperienceBridgeRemote(bridge.eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onDismiss?.(bridge.eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusyEventId(null);
    }
  };

  const busy = busyEventId === bridge.eventId;

  return (
    <div
      className={cn(rimvioSurfaceCardClass("p-3 backdrop-blur-md"), className)}
      data-experience-bridge-invite-banner
      role="status"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">
            {copy.globe.bridgeInviteTitle(hostName, bridge.title)}
          </p>
          {overflow > 0 ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {copy.globe.bridgeInviteOverflow(overflow)}
            </p>
          ) : null}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAccept()}
              className={cn(rimvioCompactPrimaryCtaClass(), "rounded-full py-2 text-[12px]")}
            >
              {copy.globe.bridgeInviteAcceptCta}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDecline()}
              className={cn(rimvioGhostCtaClass(), "rounded-full py-2 text-[12px]")}
            >
              {copy.globe.bridgeInviteDeclineCta}
            </button>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDismiss?.(bridge.eventId)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-60"
          aria-label={copy.globe.bridgeInviteDismissAria}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
