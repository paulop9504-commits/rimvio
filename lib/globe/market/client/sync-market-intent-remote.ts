import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
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

export async function fetchMarketAlignmentOfferRemote(input: {
  focusEventId?: string | null;
}): Promise<import("@/lib/globe/market/market-intent-types").MarketAlignmentOffer | null> {
  const params = new URLSearchParams();
  if (input.focusEventId?.trim()) {
    params.set("focusEventId", input.focusEventId.trim());
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
  };
  if (!response.ok || !body.threadId) {
    throw new Error(body.error ?? "accept_failed");
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
  const body = (await response.json()) as { threadId?: string; error?: string };
  if (!response.ok || !body.threadId) {
    throw new Error(body.error ?? "start_failed");
  }
  return { threadId: body.threadId };
}

export type MarketHandshakeRoomState = {
  id: string;
  phase: string;
  threadId: string | null;
  priorityHint: string;
  viewerRole: "seeking" | "listing" | null;
  chatLocked: boolean;
  canStartChat: boolean;
  product: {
    title: string;
    priceLine: string;
    category: string;
    placeLabel: string;
    photoCount: number;
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
