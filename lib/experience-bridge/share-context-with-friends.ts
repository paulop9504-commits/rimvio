import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  bootstrapExperienceBridgeRemote,
  inviteExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import {
  deliverGlobeContextToPeerChat,
  type GlobeContextShareDelivery,
} from "@/lib/experience-bridge/deliver-globe-context-to-peer-chat";
import { hydrateBridgeEventSnapshotForShare } from "@/lib/experience-bridge/hydrate-bridge-event-snapshot";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { publishBridgeEventCaptureContributions } from "@/lib/experience-bridge/publish-bridge-capture-contribution";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { isDmThreadId } from "@/lib/peer-chat/dm-thread";

export type GlobeContextShareFriend = {
  userId: string;
  displayName: string;
  peerThreadId: string;
};

export type { GlobeContextShareDelivery };

/** Host: bootstrap bridge + invite selected friends. */
export async function shareGlobeContextWithFriends(input: {
  event: EventCandidate;
  hostDisplayName: string;
  friends: readonly GlobeContextShareFriend[];
  delivery?: GlobeContextShareDelivery | null;
}): Promise<{ invited: number; peerThreadIds: string[] }> {
  const friends = input.friends.filter(
    (row) => row.userId.trim() && row.displayName.trim(),
  );
  if (friends.length === 0) {
    return { invited: 0, peerThreadIds: [] };
  }

  const primaryThreadId = friends[0]!.peerThreadId.trim();
  const { event: shareEvent, uploadWarnings } =
    await hydrateBridgeEventSnapshotForShare(input.event);
  if (uploadWarnings.length > 0) {
    toast.message(
      uploadWarnings.length === 1
        ? uploadWarnings[0]!
        : `${uploadWarnings.length}개 순간은 보내지 못했어요 · 나머지는 공유했어요`,
    );
  }
  const bootstrap = await bootstrapExperienceBridgeRemote({
    event: shareEvent,
    peerThreadId: primaryThreadId,
    hostDisplayName: input.hostDisplayName,
  });
  writeLocalBridgeState(bootstrap.state);
  stampBridgeEventMetadata({
    event: shareEvent,
    bridge: bootstrap.state.bridge,
    role: "host",
  });

  await publishBridgeEventCaptureContributions({
    event: shareEvent,
    authorDisplayName: input.hostDisplayName,
  });

  let invited = 0;
  for (const friend of friends) {
    const result = await inviteExperienceBridgeRemote({
      eventId: input.event.id,
      event: shareEvent,
      peerThreadId: friend.peerThreadId,
      hostDisplayName: input.hostDisplayName,
      participantUserId: friend.userId,
      participantDisplayName: friend.displayName,
      directDelivery:
        Boolean(input.delivery) && isDmThreadId(friend.peerThreadId),
    });
    writeLocalBridgeState(result.state);
    invited += 1;
  }

  const peerThreadIds: string[] = [];
  if (input.delivery) {
    for (const friend of friends) {
      try {
        await deliverGlobeContextToPeerChat({
          event: shareEvent,
          peerThreadId: friend.peerThreadId,
          hostDisplayName: input.hostDisplayName,
          delivery: input.delivery,
        });
        peerThreadIds.push(friend.peerThreadId.trim());
      } catch {
        /* bridge invite still landed — DM card is best-effort */
      }
    }
  }

  notifyBridgeSharedMediaUpdated();
  return { invited, peerThreadIds };
}
