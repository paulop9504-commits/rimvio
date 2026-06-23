import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketRealizedPriceRow } from "@/lib/globe/market/price-guide/rollup-realized-volume-zone";
import { readBatteryFromIntentDetail } from "@/lib/globe/market/price-guide/rollup-realized-volume-zone";
import { marketIntentRowToRecord, type MarketIntentDbRow } from "@/lib/globe/market/server/market-intent-row";

type HandshakeRollupRow = {
  realized_price_krw: number | null;
  listing_intent_id: string;
};

const ROLLUP_LIMIT = 180;

export async function fetchMarketRealizedPriceRows(
  supabase: SupabaseClient,
): Promise<MarketRealizedPriceRow[]> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("realized_price_krw, listing_intent_id")
    .eq("phase", "completed")
    .not("realized_price_krw", "is", null)
    .order("completed_at", { ascending: false })
    .limit(ROLLUP_LIMIT);

  if (error) {
    throw error;
  }

  const handshakes = (data ?? []) as HandshakeRollupRow[];
  if (handshakes.length === 0) {
    return [];
  }

  const intentIds = [...new Set(handshakes.map((row) => row.listing_intent_id))];
  const { data: intents, error: intentError } = await supabase
    .from("market_intents")
    .select("*")
    .in("id", intentIds);

  if (intentError) {
    throw intentError;
  }

  const intentById = new Map(
    ((intents ?? []) as MarketIntentDbRow[]).map((row) => [
      row.id,
      marketIntentRowToRecord(row),
    ]),
  );

  const out: MarketRealizedPriceRow[] = [];
  for (const handshake of handshakes) {
    const price = handshake.realized_price_krw;
    if (price === null || price <= 0) {
      continue;
    }
    const intent = intentById.get(handshake.listing_intent_id);
    if (!intent) {
      continue;
    }
    out.push({
      realizedPriceKrw: price,
      productName: intent.detail.productName || intent.title,
      batteryPercent: readBatteryFromIntentDetail(intent.detail),
      categoryId: intent.categoryId,
    });
  }

  return out;
}
