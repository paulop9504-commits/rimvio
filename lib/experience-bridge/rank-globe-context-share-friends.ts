import type { EventCandidate } from "@/lib/events/event-candidate";
import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { GlobeContextShareFriend } from "@/lib/experience-bridge/share-context-with-friends";

function splitPeerNameHints(raw: string): string[] {
  return raw
    .split(/[,·、/|&+와과랑\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function nameMatchesFriend(peerNames: readonly string[], displayName: string): boolean {
  const label = displayName.trim().toLowerCase();
  if (!label) {
    return false;
  }
  return peerNames.some((hint) => {
    const peer = hint.trim().toLowerCase();
    if (!peer) {
      return false;
    }
    return peer === label || label.includes(peer) || peer.includes(label);
  });
}

function scoreGlobeContextShareFriend(input: {
  friend: GlobeContextShareFriend;
  event: EventCandidate;
  peerNameHints: readonly string[];
  planThreadId: string | null;
  participantNames: readonly string[];
  participantThreadIds: readonly string[];
}): number {
  let score = 0;
  if (
    input.planThreadId &&
    input.friend.peerThreadId.trim() === input.planThreadId
  ) {
    score += 200;
  }
  if (nameMatchesFriend(input.peerNameHints, input.friend.displayName)) {
    score += 100;
  }
  if (
    input.participantThreadIds.includes(input.friend.peerThreadId.trim())
  ) {
    score += 150;
  }
  for (const name of input.participantNames) {
    if (nameMatchesFriend([name], input.friend.displayName)) {
      score += 80;
      break;
    }
  }
  return score;
}

/** Co-experience hints first — for pin send rail. */
export function rankGlobeContextShareFriends(input: {
  friends: readonly GlobeContextShareFriend[];
  event: EventCandidate;
}): GlobeContextShareFriend[] {
  const plan = readPlanContextFromEvent(input.event);
  const meta = input.event.metadata ?? {};
  const peerNameHints = [
    plan?.peerDisplayName ?? null,
    typeof meta.planPeerDisplayName === "string" ? meta.planPeerDisplayName : null,
    typeof meta.peerDisplayName === "string" ? meta.peerDisplayName : null,
  ].flatMap((row) => (row ? splitPeerNameHints(row) : []));

  const room = projectExperienceRoom({ primaryEvent: input.event });
  const participantNames = room.participants.map((row) => row.displayName);
  const participantThreadIds = room.participants
    .map((row) => row.peerThreadId?.trim() ?? "")
    .filter(Boolean);

  return [...input.friends]
    .map((friend) => ({
      friend,
      score: scoreGlobeContextShareFriend({
        friend,
        event: input.event,
        peerNameHints,
        planThreadId: plan?.peerThreadId?.trim() ?? null,
        participantNames,
        participantThreadIds,
      }),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.friend.displayName.localeCompare(right.friend.displayName, "ko"),
    )
    .map((row) => row.friend);
}
