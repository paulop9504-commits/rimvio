import { type NextRequest, NextResponse } from "next/server";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import {
  buildMarketVolumeZoneRollup,
  filterRealizedPricesForVolumeZone,
} from "@/lib/globe/market/price-guide/rollup-realized-volume-zone";
import { fetchMarketRealizedPriceRows } from "@/lib/globe/market/server/fetch-market-realized-price-rows";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const productName = request.nextUrl.searchParams.get("product")?.trim() || "";
  const batteryRaw = request.nextUrl.searchParams.get("battery")?.trim() || "";
  const categoryId =
    request.nextUrl.searchParams.get("categoryId")?.trim() || "market.phone";

  const batteryPercent = Number.parseInt(batteryRaw.replace(/\D/g, ""), 10);
  if (!isValidMarketProductName(productName) || !Number.isFinite(batteryPercent)) {
    return NextResponse.json({ ok: true, rollup: null });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, rollup: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rows = await fetchMarketRealizedPriceRows(supabase);
    const prices = filterRealizedPricesForVolumeZone({
      rows,
      productName,
      batteryPercent,
      categoryId,
    });
    const rollup = buildMarketVolumeZoneRollup(prices);
    return NextResponse.json({ ok: true, rollup });
  } catch {
    return NextResponse.json({ ok: true, rollup: null });
  }
}
