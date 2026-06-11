import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  bootstrapExperienceBridgeRemote,
  inviteExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";

export type GlobeContextShareFriend = {
  userId: string;
  displayName: string;
  peerThreadId: string;
};

/** Host: bootstrap bridge + invite selected friends. */
export async function shareGlobeContextWithFriends(input: {
  event: EventCandidate;
  hostDisplayName: string;
  friends: readonly GlobeContextShareFriend[];
}): Promise<{ invited: number }> {
  const friends = input.friends.filter(
    (row) => row.userId.trim() && row.displayName.trim(),
  );
  if (friends.length === 0) {
    return { invited: 0 };
  }

  const primaryThreadId = friends[0]!.peerThreadId.trim();
  const bootstrap = await bootstrapExperienceBridgeRemote({
    event: input.event,
    peerThreadId: primaryThreadId,
    hostDisplayName: input.hostDisplayName,
  });
  writeLocalBridgeState(bootstrap.state);

  let invited = 0;
  for (const friend of friends) {
    const result = await inviteExperienceBridgeRemote({
      eventId: input.event.id,
      event: input.event,
      peerThreadId: friend.peerThreadId,
      hostDisplayName: input.hostDisplayName,
      participantUserId: friend.userId,
      participantDisplayName: friend.displayName,
    });
    writeLocalBridgeState(result.state);
    invited += 1;
  }

  return { invited };
}
