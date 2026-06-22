import type { SupabaseClient } from "@supabase/supabase-js";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { normalizeCaptureTimeAnchor } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import {
  hashTrendBridgeActor,
  resolveTrendBridgeLocationDong,
} from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export type TrendBridgeContributionRow = {
  id: string;
  user_id: string;
  actor_hash: string;
  bridge_id: string;
  location_dong: string;
  category_label: string;
  capture_at: string;
  day_segment: "weekday" | "weekend";
  day_of_week: number;
  hour_bucket: number;
  lat: number | null;
  lng: number | null;
  sentiment: string | null;
  source_capture_id: string;
  created_at: string;
};

export type InsertTrendBridgeContributionInput = {
  userId: string;
  bridgeId: string;
  captureAtIso: string;
  placeLabel: string;
  sourceCaptureId: string;
  lat?: number | null;
  lng?: number | null;
  sentiment?: string | null;
};

export async function insertTrendBridgeContribution(
  supabase: SupabaseClient,
  input: InsertTrendBridgeContributionInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const feature = getTrendBridgeFeature(input.bridgeId);
  if (!feature) {
    return { ok: false, reason: "invalid_bridge_id" };
  }

  const locationDong = resolveTrendBridgeLocationDong(input.placeLabel);
  if (!locationDong) {
    return { ok: false, reason: "location_required" };
  }

  const anchor = normalizeCaptureTimeAnchor({
    timestamp: input.captureAtIso,
    timeZone: "Asia/Seoul",
  });
  if (!anchor) {
    return { ok: false, reason: "invalid_capture_time" };
  }

  const sourceCaptureId = input.sourceCaptureId.trim();
  if (!sourceCaptureId) {
    return { ok: false, reason: "capture_id_required" };
  }

  const { error } = await supabase.from("trend_bridge_contributions").insert({
    user_id: input.userId,
    actor_hash: hashTrendBridgeActor(input.userId),
    bridge_id: feature.bridgeId,
    location_dong: locationDong,
    category_label: feature.displayName,
    capture_at: input.captureAtIso,
    day_segment: anchor.daySegment,
    day_of_week: anchor.dayOfWeek,
    hour_bucket: anchor.hourStart,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    sentiment: input.sentiment?.trim() || null,
    source_capture_id: sourceCaptureId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    throw error;
  }

  return { ok: true };
}
