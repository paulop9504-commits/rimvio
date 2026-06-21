"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { projectBridgePreviewMedia } from "@/lib/globe/project-bridge-preview-media";
import { ExperienceBridgePreviewCollage } from "@/components/globe/experience-bridge-preview-collage";
import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { useAuth } from "@/hooks/use-auth";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioEmptyStateClass,
  rimvioGhostCtaClass,
  rimvioHeroCtaClass,
  rimvioInboxItemCardClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ExperienceBridgeGhostSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invite: PendingBridgeInvite | null;
  cluster: PinCluster | null;
  onAccepted?: (eventId: string) => void;
  onDismissed?: (eventId: string) => void;
};

/** Ghost pin tap — accept shared experience onto personal globe. */
export function ExperienceBridgeGhostSheet({
  open,
  onOpenChange,
  invite,
  cluster,
  onAccepted,
  onDismissed,
}: ExperienceBridgeGhostSheetProps) {
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  if (!invite || !cluster) {
    return null;
  }

  const { bridge } = invite.state;
  const host = invite.state.participants.find((row) => row.role === "host");
  const hostName = host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
  const previewMedia = projectBridgePreviewMedia(
    invite.state.bridge.eventSnapshot,
    3,
  );

  const handleAccept = async () => {
    setBusy(true);
    try {
      const data = await acceptExperienceBridgeRemote(bridge.eventId);
      await completeBridgeInviteAccept({
        state: data.state,
        peerThreadId: data.pinSpec.peerThreadId,
        viewerUserId: user?.id,
      });
      toast.success(copy.globe.bridgeInviteAccepted);
      onAccepted?.(bridge.eventId);
      onDismissed?.(bridge.eventId);
      onOpenChange(false);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      const data = await declineExperienceBridgeRemote(bridge.eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onDismissed?.(bridge.eventId);
      onOpenChange(false);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(rimvioSheetBackdropClass(), "z-[10060]")}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(rimvioBottomSheetClass("z-[10061] overflow-hidden p-0"), "max-h-none")}
            data-experience-bridge-ghost-sheet
          >
            <ExperienceBridgePreviewCollage
              media={previewMedia}
              className="w-full rounded-none ring-0"
            />
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={RIMVIO_TYPE.eyebrow}>{copy.globe.bridgeInviteEyebrow}</p>
                <p className={cn("mt-0.5", RIMVIO_TYPE.headline)}>
                  {copy.globe.bridgeInviteTitle(hostName, bridge.title)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={rimvioSheetCloseBtnClass()}
                aria-label="닫기"
              >
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            <p className={RIMVIO_TYPE.body}>{copy.globe.bridgeGhostSheetBody}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground">
              <MapPin className="size-3.5 text-primary" aria-hidden />
              {cluster.placeLabel}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAccept()}
                className={cn(rimvioHeroCtaClass("flex-1"), "disabled:opacity-60")}
              >
                {copy.globe.bridgeGhostAcceptCta}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDecline()}
                className={cn(rimvioGhostCtaClass(), "disabled:opacity-60")}
              >
                {copy.globe.bridgeInviteDeclineCta}
              </button>
            </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
