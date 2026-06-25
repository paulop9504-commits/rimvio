import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";

export async function fetchActiveMarketTradesRemote(): Promise<{
  sessions: MarketTradeSessionView[];
  migrationPending?: boolean;
}> {
  const response = await fetch("/api/globe/market-transaction/active", {
    cache: "no-store",
  });
  if (!response.ok) {
    return { sessions: [] };
  }
  const body = (await response.json()) as {
    sessions?: MarketTradeSessionView[];
    migrationPending?: boolean;
  };
  return {
    sessions: Array.isArray(body.sessions) ? body.sessions : [],
    migrationPending: body.migrationPending,
  };
}

export async function confirmMarketTradeScheduleRemote(input: {
  handshakeId: string;
  meetAtIso: string;
  meetPlaceLabel?: string;
}): Promise<MarketTradeSessionView | null> {
  const response = await fetch("/api/globe/market-transaction/confirm-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const body = (await response.json()) as { session?: MarketTradeSessionView | null };
  return body.session ?? null;
}

export async function departMarketTradeRemote(input: {
  handshakeId: string;
  lat: number;
  lng: number;
}): Promise<MarketTradeSessionView | null> {
  const response = await fetch("/api/globe/market-transaction/depart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const body = (await response.json()) as { session?: MarketTradeSessionView | null };
  return body.session ?? null;
}

export async function pingMarketTradeGuestLocationRemote(input: {
  handshakeId: string;
  lat: number;
  lng: number;
}): Promise<MarketTradeSessionView | null> {
  const response = await fetch("/api/globe/market-transaction/guest-location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const body = (await response.json()) as { session?: MarketTradeSessionView | null };
  return body.session ?? null;
}
