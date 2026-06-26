"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useGlobeContextShareCandidates } from "@/hooks/use-globe-context-share-candidates";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeContextShareDelivery } from "@/lib/experience-bridge/deliver-globe-context-to-peer-chat";
import {
  shareGlobeContextWithFriends,
  type GlobeContextShareFriend,
} from "@/lib/experience-bridge/share-context-with-friends";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextSendRailProps = {
  event: EventCandidate;
  delivery: GlobeContextShareDelivery;
  onOpenMore?: () => void;
  onSent?: () => void;
  compact?: boolean;
  className?: string;
};

/** Pin sheet footer — 1-tap send to co-experience friends. */
export function GlobeContextSendRail({
  event,
  delivery,
  onOpenMore,
  onSent,
  compact = false,
  className,
}: GlobeContextSendRailProps) {
  const router = useRouter();
  const { user, configured, signInWithGoogle } = useAuth();
  const { fetching, visible, overflowCount, invitedUserIds } =
    useGlobeContextShareCandidates({ event, maxVisible: 5 });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const sendToFriend = useCallback(
    async (friend: GlobeContextShareFriend) => {
      if (busyUserId) {
        return;
      }
      setBusyUserId(friend.userId);
      try {
        const profile = await fetchMyAccountProfile().catch(() => null);
        const hostDisplayName =
          profile?.displayName?.trim() ||
          profile?.rimvioId?.trim() ||
          user?.email?.split("@")[0] ||
          "나";
        await shareGlobeContextWithFriends({
          event,
          hostDisplayName,
          friends: [friend],
          delivery,
        });
        toast.success(copy.globe.bridgeShareSent(friend.displayName), {
          action: {
            label: copy.globe.bridgeShareSentOpenChat,
            onClick: () => router.push(`/peers/${friend.peerThreadId}`),
          },
        });
        onSent?.();
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : copy.globe.bridgeShareFail,
        );
      } finally {
        setBusyUserId(null);
      }
    },
    [busyUserId, delivery, event, onSent, router, user?.email],
  );

  if (!configured) {
    return null;
  }

  if (!user?.id) {
    return (
      <div
        className={cn("rounded-2xl bg-muted/40 px-3 py-2.5", className)}
        data-globe-context-send-rail
      >
        <p className="text-[12px] text-muted-foreground">
          {copy.globe.bridgeShareLoginRequired}
        </p>
        <button
          type="button"
          onClick={() =>
            void signInWithGoogle("/?recallEvent=" + encodeURIComponent(event.id))
          }
          className="mt-2 inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-[12px] font-semibold text-primary-foreground"
        >
          {copy.globe.inboxSignInCta}
        </button>
      </div>
    );
  }

  if (fetching) {
    return (
      <div
        className={cn("flex items-center gap-2", compact ? "px-0 py-0" : "px-1 py-1", className)}
        data-globe-context-send-rail
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-[12px] text-muted-foreground">
          {copy.globe.bridgeShareRailLoading}
        </span>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div
        className={cn("rounded-2xl bg-muted/30 px-3 py-2.5", className)}
        data-globe-context-send-rail
      >
        <p className="text-[12px] text-muted-foreground">
          {copy.globe.bridgeShareNoFriends}
        </p>
        {onOpenMore ? (
          <button
            type="button"
            onClick={onOpenMore}
            className="mt-2 text-[12px] font-semibold text-primary"
          >
            {copy.globe.bridgeShareAddFriendsCta}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={cn(compact ? "space-y-1.5" : "space-y-2", className)}
      data-globe-context-send-rail
    >
      <div className={cn("flex items-center justify-between gap-2", compact ? "px-0" : "px-1")}>
        <p className={cn("font-semibold text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>
          {copy.globe.bridgeShareRailEyebrow}
        </p>
        {onOpenMore && (overflowCount > 0 || visible.length > 0) ? (
          <button
            type="button"
            onClick={onOpenMore}
            className={cn("font-semibold text-primary", compact ? "text-[10px]" : "text-[11px]")}
          >
            {overflowCount > 0
              ? copy.globe.bridgeShareMoreFriends(overflowCount)
              : copy.globe.bridgeShareMoreFriendsAction}
          </button>
        ) : null}
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((row) => {
          const sent = invitedUserIds.has(row.userId);
          const busy = busyUserId === row.userId;
          const avatarSize = compact ? "size-10" : "size-12";
          return (
            <li key={row.userId} className="shrink-0">
              <button
                type="button"
                disabled={Boolean(busyUserId)}
                onClick={() => void sendToFriend(row)}
                className={cn(
                  "flex flex-col items-center gap-1 transition active:scale-[0.98]",
                  compact ? "w-[3.25rem] rounded-xl px-0.5 py-0.5" : "w-[4.5rem] gap-1.5 rounded-2xl px-1 py-1.5",
                  sent && "opacity-95",
                )}
                aria-label={
                  sent
                    ? `${row.displayName} — 다시 보내기`
                    : `${row.displayName}에게 그때 거기 보내기`
                }
              >
                <span
                  className={cn(
                    "relative rounded-full ring-2",
                    sent ? "ring-primary/35" : "ring-border/80",
                  )}
                >
                  {busy ? (
                    <span className={cn("flex items-center justify-center rounded-full bg-muted", avatarSize)}>
                      <Loader2
                        className={cn("animate-spin text-primary", compact ? "size-4" : "size-5")}
                        aria-hidden
                      />
                    </span>
                  ) : row.avatarUrl || row.instantAvatarSrc ? (
                    <PeerProfileAvatar
                      displayName={row.displayName}
                      avatarUrl={row.avatarUrl}
                      instantSrc={row.instantAvatarSrc}
                      size="md"
                      className={avatarSize}
                    />
                  ) : (
                    <span className={cn("flex items-center justify-center rounded-full bg-muted text-muted-foreground", avatarSize)}>
                      <UserRound className={cn(compact ? "size-4" : "size-5")} aria-hidden />
                    </span>
                  )}
                  {sent ? (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-px text-[8px] font-bold text-primary-foreground">
                      ✓
                    </span>
                  ) : null}
                </span>
                <span className={cn("line-clamp-2 w-full text-center font-semibold leading-tight text-foreground", compact ? "text-[9px]" : "text-[10px]")}>
                  {row.displayName}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
