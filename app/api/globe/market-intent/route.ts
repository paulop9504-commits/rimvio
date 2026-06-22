import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { upsertMarketIntentRemote } from "@/lib/globe/market/server/upsert-market-intent";
import { scanMarketHandshakesForIntent } from "@/lib/globe/market/server/scan-market-handshakes";
import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

function parseRecord(body: unknown): MarketIntentRecord | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const row = body as Record<string, unknown>;
  const eventId = typeof row.eventId === "string" ? row.eventId.trim() : "";
  const role = row.role === "seeking" || row.role === "listing" ? row.role : null;
  const categoryId = typeof row.categoryId === "string" ? row.categoryId.trim() : "";
  if (!eventId || !role || !categoryId) {
    return null;
  }

  let detail = { ...DEFAULT_MARKET_INTENT_DETAIL };
  const detailRaw = row.detail;
  if (detailRaw && typeof detailRaw === "object" && !Array.isArray(detailRaw)) {
    const d = detailRaw as Record<string, unknown>;
    detail = {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      sourceText: typeof d.sourceText === "string" ? d.sourceText : "",
      productName: typeof d.productName === "string" ? d.productName : "",
      detailNote: typeof d.detailNote === "string" ? d.detailNote : "",
      conditionId:
        d.conditionId === "like_new" ||
        d.conditionId === "good" ||
        d.conditionId === "fair" ||
        d.conditionId === "for_parts"
          ? d.conditionId
          : null,
      includesBox: d.includesBox === true,
      includesReceipt: d.includesReceipt === true,
      meetPreference:
        d.meetPreference === "nearby" ||
        d.meetPreference === "flexible" ||
        d.meetPreference === "pickup_only"
          ? d.meetPreference
          : DEFAULT_MARKET_INTENT_DETAIL.meetPreference,
      priceNegotiable: d.priceNegotiable === true,
      photoCount: typeof d.photoCount === "number" ? d.photoCount : 0,
      prioritySchemaVersion: "market.v1.2",
      prioritySlots:
        d.prioritySlots && typeof d.prioritySlots === "object" && !Array.isArray(d.prioritySlots)
          ? (d.prioritySlots as typeof detail.prioritySlots)
          : {},
    };
  }

  return {
    id: typeof row.id === "string" ? row.id : `mi-local`,
    eventId,
    role,
    categoryId: categoryId as MarketIntentRecord["categoryId"],
    title: typeof row.title === "string" ? row.title : "",
    priceMinKrw: typeof row.priceMinKrw === "number" ? row.priceMinKrw : null,
    priceMaxKrw: typeof row.priceMaxKrw === "number" ? row.priceMaxKrw : null,
    radiusKm: typeof row.radiusKm === "number" ? row.radiusKm : 5,
    anchorLat: typeof row.anchorLat === "number" ? row.anchorLat : 0,
    anchorLng: typeof row.anchorLng === "number" ? row.anchorLng : 0,
    placeLabel: typeof row.placeLabel === "string" ? row.placeLabel : "",
    peakHour: typeof row.peakHour === "string" ? row.peakHour : null,
    confirmedAtIso:
      typeof row.confirmedAtIso === "string"
        ? row.confirmedAtIso
        : new Date().toISOString(),
    active: true,
    detail,
  };
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = parseRecord(body);
  if (!record) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const saved = await upsertMarketIntentRemote(supabase, user.id, record);
    try {
      await scanMarketHandshakesForIntent(supabase, { ...saved, userId: user.id });
    } catch {
      // handshake scan is best-effort
    }
    return NextResponse.json({ ok: true, intent: saved });
  } catch {
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }
}
