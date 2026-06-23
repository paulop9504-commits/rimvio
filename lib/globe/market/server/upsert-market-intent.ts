import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  marketIntentRowToRecord,
  marketIntentDetailToJson,
  type MarketIntentDbRow,
} from "@/lib/globe/market/server/market-intent-row";
import { filterPublishedMarketIntents } from "@/lib/globe/market/filter-published-market-intents";

export async function upsertMarketIntentRemote(
  supabase: SupabaseClient,
  userId: string,
  record: MarketIntentRecord,
): Promise<MarketIntentRecord> {
  const payload = {
    user_id: userId,
    client_event_id: record.eventId.trim(),
    role: record.role,
    category_id: record.categoryId,
    title: record.title.trim().slice(0, 160),
    price_min_krw: record.priceMinKrw,
    price_max_krw: record.priceMaxKrw,
    radius_km: record.radiusKm,
    anchor_lat: record.anchorLat,
    anchor_lng: record.anchorLng,
    place_label: record.placeLabel.trim().slice(0, 120),
    peak_hour: record.peakHour,
    active: true,
    confirmed_at: record.confirmedAtIso,
    updated_at: new Date().toISOString(),
    detail_json: marketIntentDetailToJson(record.detail),
  };

  const { data, error } = await supabase
    .from("market_intents")
    .upsert(payload, { onConflict: "user_id,client_event_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return marketIntentRowToRecord(data as MarketIntentDbRow);
}

export async function listActiveMarketIntentsForMatching(
  supabase: SupabaseClient,
  options?: { excludeUserId?: string; limit?: number; publishedOnly?: boolean },
): Promise<MarketIntentRecord[]> {
  let query = supabase
    .from("market_intents")
    .select("*")
    .eq("active", true)
    .order("confirmed_at", { ascending: false })
    .limit(options?.limit ?? 120);

  const exclude = options?.excludeUserId?.trim();
  if (exclude) {
    query = query.neq("user_id", exclude);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as MarketIntentDbRow[]).map(marketIntentRowToRecord);
  if (options?.publishedOnly) {
    return filterPublishedMarketIntents(rows);
  }
  return rows;
}

export async function listOwnMarketIntents(
  supabase: SupabaseClient,
  userId: string,
): Promise<MarketIntentRecord[]> {
  const { data, error } = await supabase
    .from("market_intents")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("confirmed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MarketIntentDbRow[]).map(marketIntentRowToRecord);
}

export async function deactivateMarketIntentRemote(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const key = eventId.trim();
  if (!key) {
    return;
  }

  const { error } = await supabase
    .from("market_intents")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("client_event_id", key);

  if (error) {
    throw error;
  }
}

export async function findMarketIntentById(
  supabase: SupabaseClient,
  intentId: string,
): Promise<MarketIntentRecord | null> {
  const { data, error } = await supabase
    .from("market_intents")
    .select("*")
    .eq("id", intentId.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return marketIntentRowToRecord(data as MarketIntentDbRow);
}
