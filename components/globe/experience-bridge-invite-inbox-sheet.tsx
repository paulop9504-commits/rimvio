"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { ExperienceBridgePreviewCollage } from "@/components/globe/experience-bridge-preview-collage";
import { copy } from "@/lib/copy/human-ko";
import { projectBridgePreviewMedia } from "@/lib/globe/project-bridge-preview-media";
import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import { useAuth } from "@/hooks/use-auth";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioEmptyStateClass,
  rimvioGhostCtaClass,
  rimvioInboxItemCardClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ExperienceBridgeInviteTopChipProps = {
  invites: readonly PendingBridgeInvite[];
  onOpenInbox: () => void;
  className?: string;
};

/** Globe home — compact chip when pending shared-context invites exist. */
export function ExperienceBridgeInviteTopChip({
  invites,
  onOpenInbox,
  className,
}: ExperienceBridgeInviteTopChipProps) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpenInbox}
      className={cn(
        rimvioSurfaceCardClass(
          "flex w-full items-center gap-2 rounded-[1.15rem] border-0 p-3.5 text-left backdrop-blur-md active:scale-[0.99]",
        ),
        className,
      )}
      data-experience-bridge-invite-chip
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Inbox className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-foreground">
          {copy.globe.bridgeInviteInboxChip(invites.length)}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {copy.globe.bridgeInviteInboxChipHint}
        </span>
      </span>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {invites.length}
      </span>
    </button>
  );
};

export type ExperienceBridgeInviteInboxSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invites: readonly PendingBridgeInvite[];
  onAccepted?: (eventId: string) => void;
  onDeclined?: (eventId: string) => void;
};

/** Full inbox — accept or decline every pending shared-context invite. */
export function ExperienceBridgeInviteInboxSheet({
  open,
  onOpenChange,
  invites,
  onAccepted,
  onDeclined,
}: ExperienceBridgeInviteInboxSheetProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleAccept = async (invite: PendingBridgeInvite) => {
    const eventId = invite.state.bridge.eventId;
    setBusyEventId(eventId);
    try {
      const data = await acceptExperienceBridgeRemote(eventId);
      await completeBridgeInviteAccept({
        state: data.state,
        peerThreadId: data.pinSpec.peerThreadId,
        viewerUserId: user?.id,
      });
      toast.success(copy.globe.bridgeInviteAccepted);
      onAccepted?.(eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDecline = async (invite: PendingBridgeInvite) => {
    const eventId = invite.state.bridge.eventId;
    setBusyEventId(eventId);
    try {
      const data = await declineExperienceBridgeRemote(eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onDeclined?.(eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusyEventId(null);
    }
  };

  if (!mounted) {
    return null;
  }

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
            className={cn(rimvioSheetBackdropClass(), "z-[10070]")}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.bridgeInviteInboxTitle}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(rimvioBottomSheetClass(), "z-[10071]")}
            data-experience-bridge-invite-inbox
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn("flex items-center gap-1.5", RIMVIO_TYPE.headline)}>
                    <Inbox className="size-4 text-primary" aria-hidden />
                    {copy.globe.bridgeInviteInboxTitle}
                  </p>
                  <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
                    {copy.globe.bridgeInviteInboxSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={rimvioSheetCloseBtnClass()}
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {invites.length === 0 ? (
                <p className={cn(rimvioEmptyStateClass(), RIMVIO_TYPE.body)}>
                  {copy.globe.bridgeInviteInboxEmpty}
                </p>
              ) : (
                <ul className="space-y-3">
                  {invites.map((invite) => {
                    const { bridge } = invite.state;
                    const host = invite.state.participants.find((row) => row.role === "host");
                    const hostName =
                      host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
                    const busy = busyEventId === bridge.eventId;

                    const previewMedia = projectBridgePreviewMedia(
                      invite.state.bridge.eventSnapshot,
                      3,
                    );

                    return (
                      <li
                        key={bridge.eventId}
                        className={cn(rimvioInboxItemCardClass(), "overflow-hidden p-0")}
                      >
                        <ExperienceBridgePreviewCollage
                          media={previewMedia}
                          className="rounded-none ring-0"
                        />
                        <div className="space-y-2 p-3.5">
                        <p className={RIMVIO_TYPE.eyebrow}>{copy.globe.bridgeInviteEyebrow}</p>
                        <p className={RIMVIO_TYPE.headline}>
                          {copy.globe.bridgeInviteTitle(hostName, bridge.title)}
                        </p>
                        <p className={RIMVIO_TYPE.caption}>{copy.globe.bridgeInviteBody}</p>
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                            <Users className="size-3" aria-hidden />
                            {bridge.placeLabel || copy.globe.bridgeInvitePlaceFallback}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAccept(invite)}
                            className={rimvioCompactPrimaryCtaClass()}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : null}
                            {copy.globe.bridgeInviteAcceptCta}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDecline(invite)}
                            className={rimvioGhostCtaClass()}
                          >
                            {copy.globe.bridgeInviteDeclineCta}
                          </button>
                        </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
