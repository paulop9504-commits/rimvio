"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Share2, UserRound } from "lucide-react";
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

export type GlobeContextShareFriendsPanelProps = {
  event: EventCandidate;
  delivery?: GlobeContextShareDelivery | null;
  className?: string;
};

/** Bridge context tab — tap a friend to send immediately. */
export function GlobeContextShareFriendsPanel({
  event,
  delivery = null,
  className,
}: GlobeContextShareFriendsPanelProps) {
  const router = useRouter();
  const { user, configured, signInWithGoogle } = useAuth();
  const { fetching, visible, invitedUserIds } = useGlobeContextShareCandidates({
    event,
    maxVisible: 12,
  });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [localSentIds, setLocalSentIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const sentIds = mergeSentUserIds(invitedUserIds, localSentIds);

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
          delivery: delivery ?? undefined,
        });
        setLocalSentIds((prev) => new Set([...prev, friend.userId]));
        toast.success(copy.globe.bridgeShareSent(friend.displayName), {
          action: {
            label: copy.globe.bridgeShareSentOpenChat,
            onClick: () => router.push(`/peers/${friend.peerThreadId}`),
          },
        });
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : copy.globe.bridgeShareFail,
        );
      } finally {
        setBusyUserId(null);
      }
    },
    [busyUserId, delivery, event, router, user?.email],
  );

  if (!configured) {
    return null;
  }

  if (!user?.id) {
    return (
      <section
        className={cn("rounded-2xl bg-muted/40 px-4 py-3", className)}
        data-globe-context-share-panel
      >
        <p className="text-[13px] text-muted-foreground">
          {copy.globe.bridgeShareLoginRequired}
        </p>
        <button
          type="button"
          onClick={() =>
            void signInWithGoogle("/?recallEvent=" + encodeURIComponent(event.id))
          }
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
        >
          {copy.globe.inboxSignInCta}
        </button>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.25rem] border border-border/80 bg-gradient-to-b from-card to-muted/30 shadow-sm",
        className,
      )}
      data-globe-context-share-panel
    >
      <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Share2 className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">
            {copy.globe.bridgeShareSectionTitle}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.bridgeShareSectionHint}
          </p>
        </div>
      </div>

      <div className="px-4 py-3">
        {fetching ? (
          <p className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {copy.globe.bridgeShareRailLoading}
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-xl bg-background/70 px-3 py-4 text-center">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {copy.globe.bridgeShareNoFriends}
            </p>
            <Link
              href="/peers"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground active:opacity-90"
            >
              {copy.globe.bridgeShareAddFriendsCta}
            </Link>
          </div>
        ) : (
          <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visible.map((row) => {
              const sent = sentIds.has(row.userId);
              const busy = busyUserId === row.userId;
              return (
                <li key={row.userId} className="shrink-0">
                  <button
                    type="button"
                    disabled={Boolean(busyUserId)}
                    onClick={() => void sendToFriend(row)}
                    className={cn(
                      "flex w-[4.75rem] flex-col items-center gap-2 rounded-2xl px-1 py-2 transition active:scale-[0.98]",
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
                        <span className="flex size-14 items-center justify-center rounded-full bg-muted">
                          <Loader2
                            className="size-5 animate-spin text-primary"
                            aria-hidden
                          />
                        </span>
                      ) : row.avatarUrl || row.instantAvatarSrc ? (
                        <PeerProfileAvatar
                          displayName={row.displayName}
                          avatarUrl={row.avatarUrl}
                          instantSrc={row.instantAvatarSrc}
                          size="lg"
                          className="size-14"
                        />
                      ) : (
                        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <UserRound className="size-6" aria-hidden />
                        </span>
                      )}
                      {sent ? (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-px text-[8px] font-bold text-primary-foreground">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight text-foreground">
                      {row.displayName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function mergeSentUserIds(
  invitedUserIds: ReadonlySet<string>,
  localSentIds: ReadonlySet<string>,
): ReadonlySet<string> {
  if (localSentIds.size === 0) {
    return invitedUserIds;
  }
  return new Set([...invitedUserIds, ...localSentIds]);
}
