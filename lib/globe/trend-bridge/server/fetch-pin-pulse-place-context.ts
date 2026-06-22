import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCaptureTimeAnchor } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import { resolveTrendBridgeLocationDong } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";
import { listTrendBridgeRollupsNear } from "@/lib/globe/trend-bridge/server/run-trend-bridge-rollup-batch";

export type PinPulsePlaceContext = {
  locationDong: string | null;
  contributorCount: number | null;
  peakHour: string | null;
  contextSummary: string | null;
  trendVelocity: "low" | "medium" | "high" | null;
  userWeeklyContributions: number;
  tasteMatch: boolean;
};

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  return monday.toISOString();
}

export async function fetchPinPulsePlaceContext(
  supabase: SupabaseClient,
  input: {
    lat: number;
    lng: number;
    placeLabel?: string | null;
    bridgeId?: string | null;
    userId?: string | null;
    userCaptureTimestamp?: string | null;
  },
): Promise<PinPulsePlaceContext> {
  const locationDong = resolveTrendBridgeLocationDong(input.placeLabel);
  const daySegment =
    normalizeCaptureTimeAnchor({
      timestamp: new Date().toISOString(),
      timeZone: "Asia/Seoul",
    })?.daySegment ?? "weekday";

  const bridgeId = input.bridgeId?.trim() || "food";
  const rollups = await listTrendBridgeRollupsNear(supabase, {
    bridgeId,
    lat: input.lat,
    lng: input.lng,
    daySegment,
    radiusKm: 8,
    limit: 3,
  });

  const matched =
    rollups.find((row) =>
      locationDong ? row.location_dong === locationDong : true,
    ) ?? rollups[0] ?? null;

  let userWeeklyContributions = 0;
  const userId = input.userId?.trim();
  if (userId && locationDong) {
    const since = startOfWeekIso();
    const { count, error } = await supabase
      .from("trend_bridge_contributions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("location_dong", locationDong)
      .gte("capture_at", since);
    if (!error && typeof count === "number") {
      userWeeklyContributions = count;
    }
  }

  let tasteMatch = false;
  if (matched && input.userCaptureTimestamp?.trim()) {
    const userAnchor = normalizeCaptureTimeAnchor({
      timestamp: input.userCaptureTimestamp,
      timeZone: "Asia/Seoul",
    });
    tasteMatch = userAnchor?.hourStart === matched.peak_bucket_start;
  }

  return {
    locationDong,
    contributorCount: matched?.contributor_count ?? null,
    peakHour: matched?.peak_hour_label ?? null,
    contextSummary: matched?.context_summary ?? null,
    trendVelocity: matched?.trend_velocity ?? null,
    userWeeklyContributions,
    tasteMatch,
  };
}
