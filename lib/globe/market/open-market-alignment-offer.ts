import { toast } from "sonner";
import {
  acceptMarketHandshakeRemote,
  startMarketHandshakeChatRemote,
} from "@/lib/globe/market/client/sync-market-intent-remote";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import { peerRoomPath } from "@/lib/peer-chat/navigate-peer-room-from-feed";

export type OpenMarketAlignmentOfferInput = {
  offer: MarketAlignmentOffer | null;
  copy: {
    bridgeFail: string;
    bridgeToast: string;
    handshakeListingAcceptedToast: string;
    handshakeSentWaiting: string;
    handshakeNoMatch: string;
  };
  navigate: (href: string) => void;
};

export async function openMarketAlignmentOffer(
  input: OpenMarketAlignmentOfferInput,
): Promise<boolean> {
  const { offer, copy, navigate } = input;
  if (!offer) {
    toast.message(copy.handshakeSentWaiting);
    return false;
  }

  if (offer.handshakeId && offer.viewerAction === "accept_listing") {
    try {
      const accepted = await acceptMarketHandshakeRemote({
        handshakeId: offer.handshakeId,
      });
      toast.success(copy.handshakeListingAcceptedToast);
      navigate(peerRoomPath(accepted.threadId));
      return true;
    } catch (error) {
      const message = readMarketHandshakeUserError(
        error instanceof Error ? error.message : copy.bridgeFail,
      );
      toast.error(message);
      return false;
    }
  }

  if (offer.handshakeId && offer.viewerAction === "open_preview") {
    try {
      const started = await startMarketHandshakeChatRemote({
        handshakeId: offer.handshakeId,
      });
      toast.success(copy.bridgeToast);
      navigate(peerRoomPath(started.threadId));
      return true;
    } catch (error) {
      const message = readMarketHandshakeUserError(
        error instanceof Error ? error.message : copy.bridgeFail,
      );
      toast.error(message);
      return false;
    }
  }

  if (offer.threadId && offer.viewerAction === "open_chat") {
    navigate(peerRoomPath(offer.threadId));
    return true;
  }

  toast.message(copy.handshakeSentWaiting);
  return false;
}

export async function openMarketChatForListing(input: {
  focusEventId: string;
  seekingIntentId?: string;
  matchIntentId: string;
  initialMessage?: string;
  initTradeSession?: boolean;
  requireTradeSession?: boolean;
  fromFieldDiscovery?: boolean;
  copy: { bridgeFail: string };
  navigate: (href: string) => void;
  onBeforeNavigate?: () => void;
  skipNavigate?: boolean;
  onThreadReady?: (threadId: string) => void;
}): Promise<{
  threadId: string;
  handshakeId: string;
  alreadyCompleted: boolean;
}> {
  const { openMarketChatRemote } = await import(
    "@/lib/globe/market/client/sync-market-intent-remote"
  );
  const result = await openMarketChatRemote({
    focusEventId: input.focusEventId,
    seekingIntentId: input.seekingIntentId,
    matchIntentId: input.matchIntentId,
    initialMessage: input.initialMessage,
    initTradeSession: input.initTradeSession,
    requireTradeSession: input.requireTradeSession,
    fromFieldDiscovery: input.fromFieldDiscovery,
  });
  if (!result.threadId) {
    throw new Error("open_chat_failed");
  }
  input.onThreadReady?.(result.threadId);
  if (!input.skipNavigate) {
    input.onBeforeNavigate?.();
    input.navigate(peerRoomPath(result.threadId));
  }
  return {
    threadId: result.threadId,
    handshakeId: result.handshakeId,
    alreadyCompleted: result.alreadyCompleted === true,
  };
}

export async function requestMarketHandshakeForListing(input: {
  focusEventId: string;
  matchIntentId: string;
  copy: OpenMarketAlignmentOfferInput["copy"];
  navigate: (href: string) => void;
}): Promise<boolean> {
  const { fetchMarketAlignmentOfferRemote } = await import(
    "@/lib/globe/market/client/sync-market-intent-remote"
  );
  const offer = await fetchMarketAlignmentOfferRemote({
    focusEventId: input.focusEventId,
    matchIntentId: input.matchIntentId,
  });
  return openMarketAlignmentOffer({
    offer,
    copy: input.copy,
    navigate: input.navigate,
  });
}
