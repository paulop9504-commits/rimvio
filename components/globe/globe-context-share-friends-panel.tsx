"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Share2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  shareGlobeContextWithFriends,
  type GlobeContextShareFriend,
} from "@/lib/experience-bridge/share-context-with-friends";
import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { listPeersForTalk } from "@/lib/peer-chat/list-peers-for-talk";
import { resolvePeerPartnerUserId } from "@/lib/peer-chat/resolve-peer-partner-user-id";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextShareFriendsPanelProps = {
  event: EventCandidate;
  className?: string;
};

type ShareRow = GlobeContextShareFriend & {
  rimvioId?: string | null;
};

/** Pin sheet — tap a friend profile to send a bridge invite immediately. */
export function GlobeContextShareFriendsPanel({
  event,
  className,
}: GlobeContextShareFriendsPanelProps) {
  const { user, configured } = useAuth();
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!configured || !user?.id) {
      setRows([]);
      setFetching(false);
      return;
    }

    let active = true;
    void (async () => {
      setFetching(true);
      const contacts = listPeersForTalk();
      const resolved: ShareRow[] = [];
      for (const contact of contacts) {
        const userId = await resolvePeerPartnerUserId(contact.peerThreadId);
        if (!userId || userId === user.id) {
          continue;
        }
        resolved.push({
          userId,
          peerThreadId: contact.peerThreadId,
          displayName:
            contact.profileDisplayName?.trim() ||
            contact.displayName.trim() ||
            contact.roomDisplayName?.trim() ||
            "친구",
          rimvioId: contact.rimvioId,
        });
      }
      if (active) {
        setRows(resolved);
        setFetching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  useEffect(() => {
    if (!configured || !event.id.trim()) {
      return;
    }
    let active = true;
    void fetchExperienceBridgeRemote(event.id)
      .then((data) => {
        if (!active || !data.state) {
          return;
        }
        writeLocalBridgeState(data.state);
        const pendingOrJoined = new Set(
          data.state.participants
            .filter(
              (row) =>
                row.role !== "host" &&
                row.status !== "declined" &&
                row.status !== "left",
            )
            .map((row) => row.userId),
        );
        setInvitedUserIds(pendingOrJoined);
      })
      .catch(() => {
        /* bridge may not exist yet */
      });
    return () => {
      active = false;
    };
  }, [configured, event.id]);

  const sorted = useMemo(
    () =>
      [...rows].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "ko"),
      ),
    [rows],
  );

  const inviteFriend = useCallback(
    async (friend: ShareRow) => {
      if (busyUserId || invitedUserIds.has(friend.userId)) {
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
        });
        setInvitedUserIds((prev) => new Set([...prev, friend.userId]));
        toast.success(copy.globe.bridgeShareSent(friend.displayName));
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : copy.globe.bridgeShareFail,
        );
      } finally {
        setBusyUserId(null);
      }
    },
    [busyUserId, event, invitedUserIds, user?.email],
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
      </section>
    );
  }

  return (
    <section
      className={cn("space-y-2 rounded-2xl bg-muted/40 p-4", className)}
      data-globe-context-share-panel
    >
      <div className="flex items-start gap-2">
        <Share2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">
            {copy.globe.bridgeShareSectionTitle}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.bridgeShareSectionHint}
          </p>
        </div>
      </div>

      {fetching ? (
        <p className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          친구 목록 불러오는 중…
        </p>
      ) : sorted.length === 0 ? (
        <p className="rounded-xl bg-background/70 px-3 py-4 text-center text-[12px] leading-relaxed text-muted-foreground">
          아직 친구가 없어요.
          <br />
          친구 탭에서 추가한 뒤 다시 공유해 보세요.
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sorted.map((row) => {
            const invited = invitedUserIds.has(row.userId);
            const busy = busyUserId === row.userId;
            return (
              <li key={row.userId} className="shrink-0">
                <button
                  type="button"
                  disabled={Boolean(busyUserId) || invited}
                  onClick={() => void inviteFriend(row)}
                  className={cn(
                    "flex w-[5.5rem] flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 transition active:scale-[0.98]",
                    invited
                      ? "bg-primary/10 ring-1 ring-primary/25"
                      : "bg-background/80 ring-1 ring-border",
                    busyUserId && !busy && "opacity-50",
                  )}
                  aria-label={
                    invited
                      ? `${row.displayName} — 초대 보냄`
                      : `${row.displayName}에게 공유`
                  }
                >
                  <span
                    className={cn(
                      "relative flex size-11 items-center justify-center rounded-full",
                      invited ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <UserRound className="size-5" aria-hidden />
                    )}
                  </span>
                  <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-foreground">
                    {row.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {invited ? "초대됨" : "탭해서 공유"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
