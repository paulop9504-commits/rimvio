import { resolveAlignmentPortalCategoryId } from "@/lib/globe/market/resolve-alignment-portal-category";
import { resolveOtherPartyMarketRole, resolveViewerMarketRole } from "@/lib/globe/market/market-intent-role";
import {
  marketHandshakeRowToRecord,
  type MarketHandshakeDbRow,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import type { AlignmentChatListItem } from "@/lib/peer-chat/alignment-chat-types";
import { dedupeAlignmentChatsByThread } from "@/lib/peer-chat/dedupe-alignment-chats";
import { fetchPeerPublicProfileByUserId } from "@/lib/peer-chat/peer-public-profile";
import { copy } from "@/lib/copy/human-ko";
import type { SupabaseClient } from "@supabase/supabase-js";

const ACTIVE_ALIGNMENT_PHASES = ["pending_buyer_start", "active"] as const;

export async function listActiveAlignmentChatsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AlignmentChatListItem[]> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .or(`seeking_user_id.eq.${userId},listing_user_id.eq.${userId}`)
    .in("phase", [...ACTIVE_ALIGNMENT_PHASES])
    .not("thread_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(48);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MarketHandshakeDbRow[];
  const items: AlignmentChatListItem[] = [];

  for (const row of rows) {
    const handshake = marketHandshakeRowToRecord(row);
    const threadId = handshake.threadId?.trim();
    if (!threadId) {
      continue;
    }

    const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
    const otherUserId =
      userId === handshake.seekingUserId
        ? handshake.listingUserId
        : handshake.seekingUserId;
    const profile = await fetchPeerPublicProfileByUserId(supabase, otherUserId);

    const title =
      listingIntent?.detail.productName?.trim() ||
      listingIntent?.title?.trim() ||
      copy.globe.marketAlignBridgeThreadLabel;

    const viewerRole = resolveViewerMarketRole({
      viewerUserId: userId,
      seekingUserId: handshake.seekingUserId,
      listingUserId: handshake.listingUserId,
    });
    const otherRole = resolveOtherPartyMarketRole(viewerRole);
    if (!otherRole) {
      continue;
    }

    items.push({
      handshakeId: handshake.id,
      threadId,
      phase: handshake.phase,
      portalCategoryId: resolveAlignmentPortalCategoryId(),
      title,
      placeLabel: listingIntent?.placeLabel?.trim() || "",
      otherUserId,
      otherDisplayName:
        profile?.displayName?.trim() ||
        copy.globe.marketAlignBridgeThreadLabel,
      otherAvatarUrl: profile?.avatarUrl ?? null,
      otherRole,
      updatedAtIso: handshake.updatedAtIso,
    });
  }

  return dedupeAlignmentChatsByThread(items);
}
