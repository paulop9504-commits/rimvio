"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { rankGlobeContextShareFriends } from "@/lib/experience-bridge/rank-globe-context-share-friends";
import type { GlobeContextShareFriend } from "@/lib/experience-bridge/share-context-with-friends";
import { listPeersForTalk } from "@/lib/peer-chat/list-peers-for-talk";
import {
  primePeerAvatarCache,
  readCachedPeerAvatar,
  readCachedPeerAvatarData,
} from "@/lib/peer-chat/peer-profile-avatar-cache";
import { resolvePeerPartnerUserId } from "@/lib/peer-chat/resolve-peer-partner-user-id";
import { useAuth } from "@/hooks/use-auth";

export type GlobeContextShareCandidate = GlobeContextShareFriend & {
  rimvioId?: string | null;
  avatarUrl?: string | null;
  instantAvatarSrc?: string | null;
};

export function useGlobeContextShareCandidates(input: {
  event: EventCandidate | null;
  maxVisible?: number;
}): {
  configured: boolean;
  fetching: boolean;
  visible: GlobeContextShareCandidate[];
  overflowCount: number;
  invitedUserIds: ReadonlySet<string>;
} {
  const { user, configured } = useAuth();
  const maxVisible = input.maxVisible ?? 5;
  const [rows, setRows] = useState<GlobeContextShareCandidate[]>([]);
  const [fetching, setFetching] = useState(true);
  const [invitedUserIds, setInvitedUserIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [avatarRevision, setAvatarRevision] = useState(0);

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
      const resolved: GlobeContextShareCandidate[] = [];
      for (const contact of contacts) {
        const userId = await resolvePeerPartnerUserId(
          contact.peerThreadId,
          user.id,
        );
        if (!userId || userId === user.id) {
          continue;
        }
        const instantAvatarSrc = readCachedPeerAvatarData(userId);
        const avatarUrl = readCachedPeerAvatar(userId);
        if (!instantAvatarSrc && avatarUrl) {
          void primePeerAvatarCache({ userId, avatarUrl }).then(() => {
            if (active) {
              setAvatarRevision((value) => value + 1);
            }
          });
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
          avatarUrl,
          instantAvatarSrc,
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
  }, [configured, user?.id, avatarRevision]);

  useEffect(() => {
    const eventId = input.event?.id.trim() ?? "";
    if (!configured || !eventId) {
      setInvitedUserIds(new Set());
      return;
    }
    let active = true;
    void fetchExperienceBridgeRemote(eventId)
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
  }, [configured, input.event?.id]);

  const ranked = useMemo(() => {
    if (!input.event) {
      return rows;
    }
    return rankGlobeContextShareFriends({
      friends: rows,
      event: input.event,
    });
  }, [input.event, rows]);

  const visible = ranked.slice(0, maxVisible);
  const overflowCount = Math.max(0, ranked.length - maxVisible);

  return {
    configured,
    fetching,
    visible,
    overflowCount,
    invitedUserIds,
  };
}
