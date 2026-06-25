import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketCompletionTraceDraft } from "@/lib/globe/market/market-handshake-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";

export async function syncMarketIntentRemote(
  record: MarketIntentRecord,
): Promise<MarketIntentRecord | null> {
  try {
    const response = await fetch(`${resolveAppOrigin()}/api/globe/market-intent`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { intent?: MarketIntentRecord };
    return body.intent ?? null;
  } catch {
    return null;
  }
}

export async function fetchOwnMarketIntentsRemote(): Promise<MarketIntentRecord[]> {
  try {
    const response = await fetch(`${resolveAppOrigin()}/api/globe/market-intent`, {
      credentials: "include",
    });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as { intents?: MarketIntentRecord[] };
    return body.intents ?? [];
  } catch {
    return [];
  }
}

export async function deactivateMarketIntentRemote(eventId: string): Promise<boolean> {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  try {
    const response = await fetch(`${resolveAppOrigin()}/api/globe/market-intent`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: key }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchMarketAlignmentOfferRemote(input: {
  focusEventId?: string | null;
  matchIntentId?: string | null;
}): Promise<import("@/lib/globe/market/market-intent-types").MarketAlignmentOffer | null> {
  const params = new URLSearchParams();
  if (input.focusEventId?.trim()) {
    params.set("focusEventId", input.focusEventId.trim());
  }
  if (input.matchIntentId?.trim()) {
    params.set("matchIntentId", input.matchIntentId.trim());
  }
  const qs = params.toString();
  try {
    const response = await fetch(
      `${resolveAppOrigin()}/api/globe/market-intent/matches${qs ? `?${qs}` : ""}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      offer?: import("@/lib/globe/market/market-intent-types").MarketAlignmentOffer | null;
    };
    return body.offer ?? null;
  } catch {
    return null;
  }
}

export async function fetchMarketAlignInboxRemote(): Promise<
  import("@/lib/globe/market/market-handshake-types").MarketHandshakeOffer[]
> {
  try {
    const response = await fetch(`${resolveAppOrigin()}/api/globe/market-alignment/inbox`, {
      credentials: "include",
    });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as {
      offers?: import("@/lib/globe/market/market-handshake-types").MarketHandshakeOffer[];
    };
    return body.offers ?? [];
  } catch {
    return [];
  }
}

export async function ensureMarketAlignmentBridgeRemote(input: {
  matchIntentId: string;
}): Promise<{ threadId: string; createdThread: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/globe/market-alignment/bridge`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchIntentId: input.matchIntentId }),
  });
  const body = (await response.json()) as {
    threadId?: string;
    createdThread?: boolean;
    error?: string;
  };
  if (!response.ok || !body.threadId) {
    throw new Error(body.error ?? "bridge_failed");
  }
  return {
    threadId: body.threadId,
    createdThread: Boolean(body.createdThread),
  };
}

export async function acceptMarketHandshakeRemote(input: {
  handshakeId: string;
}): Promise<{ threadId: string; handshakeId: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/globe/market-alignment/accept`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handshakeId: input.handshakeId }),
  });
  const body = (await response.json()) as {
    threadId?: string;
    handshakeId?: string;
    error?: string;
    message?: string;
  };
  if (!response.ok || !body.threadId) {
    const raw = body.message ?? body.error ?? "accept_failed";
    throw new Error(raw);
  }
  return {
    threadId: body.threadId,
    handshakeId: body.handshakeId ?? input.handshakeId,
  };
}

export async function startMarketHandshakeChatRemote(input: {
  handshakeId: string;
}): Promise<{ threadId: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/globe/market-alignment/start-chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handshakeId: input.handshakeId }),
  });
  const body = (await response.json()) as { threadId?: string; error?: string; message?: string };
  if (!response.ok || !body.threadId) {
    throw new Error(body.message ?? body.error ?? "start_failed");
  }
  return { threadId: body.threadId };
}

export async function openMarketChatRemote(input: {
  focusEventId: string;
  seekingIntentId?: string;
  matchIntentId: string;
  initialMessage?: string;
  initTradeSession?: boolean;
  requireTradeSession?: boolean;
  fromFieldDiscovery?: boolean;
}): Promise<{ threadId: string; handshakeId: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/globe/market-alignment/open-chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      focusEventId: input.focusEventId,
      seekingIntentId: input.seekingIntentId?.trim() || undefined,
      matchIntentId: input.matchIntentId,
      initialMessage: input.initialMessage?.trim() || undefined,
      initTradeSession: input.initTradeSession === true,
      requireTradeSession: input.requireTradeSession === true,
      fromFieldDiscovery: input.fromFieldDiscovery === true,
    }),
  });
  const body = (await response.json()) as {
    threadId?: string;
    handshakeId?: string;
    error?: string;
    message?: string;
  };
  if (!response.ok || !body.threadId) {
    throw new Error(body.error ?? body.message ?? "open_chat_failed");
  }
  return {
    threadId: body.threadId,
    handshakeId: body.handshakeId ?? "",
  };
}

export type MarketHandshakeRoomState = {
  id: string;
  phase: string;
  threadId: string | null;
  priorityHint: string;
  viewerRole: "seeking" | "listing" | null;
  chatLocked: boolean;
  canStartChat: boolean;
  canConfirmComplete: boolean;
  viewerConfirmed: boolean;
  otherPartyConfirmed: boolean;
  awaitingOtherParty: boolean;
  completed: boolean;
  trace: MarketCompletionTraceDraft | null;
  product: {
    title: string;
    priceLine: string;
    category: string;
    placeLabel: string;
    listingEventId: string;
    photoCount: number;
    photoUrls: string[];
    memoryPlaceLabel: string | null;
    memoryPreview: string | null;
    experienceTags: string[];
    matchMemoryPreview: string | null;
    matchExperienceTags: string[];
  };
};

export async function fetchMarketHandshakeRoomRemote(
  threadId: string,
): Promise<MarketHandshakeRoomState | null> {
  const params = new URLSearchParams({ threadId });
  try {
    const response = await fetch(
      `${resolveAppOrigin()}/api/globe/market-alignment/handshake?${params.toString()}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      handshake?: MarketHandshakeRoomState | null;
    };
    return body.handshake ?? null;
  } catch {
    return null;
  }
}

export async function confirmMarketHandshakeCompleteRemote(input: {
  handshakeId: string;
}): Promise<{
  completed: boolean;
  awaitingOtherParty: boolean;
  trace: MarketCompletionTraceDraft | null;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/globe/market-alignment/complete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handshakeId: input.handshakeId }),
  });
  const body = (await response.json()) as {
    completed?: boolean;
    awaitingOtherParty?: boolean;
    trace?: MarketCompletionTraceDraft | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? "complete_failed");
  }
  return {
    completed: Boolean(body.completed),
    awaitingOtherParty: Boolean(body.awaitingOtherParty),
    trace: body.trace ?? null,
  };
}

export type MarketVolumeZoneRollupRemote = {
  sampleCount: number;
  bandMinMan: number;
  bandMaxMan: number;
  anchorMan: number;
};

export async function fetchMarketVolumeZoneRollupRemote(input: {
  productName: string;
  batteryPercent: number;
  categoryId: string;
}): Promise<MarketVolumeZoneRollupRemote | null> {
  const params = new URLSearchParams({
    product: input.productName,
    battery: String(input.batteryPercent),
    categoryId: input.categoryId,
  });
  try {
    const response = await fetch(
      `${resolveAppOrigin()}/api/globe/market-intent/volume-zone?${params.toString()}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      rollup?: MarketVolumeZoneRollupRemote | null;
    };
    return body.rollup ?? null;
  } catch {
    return null;
  }
}
