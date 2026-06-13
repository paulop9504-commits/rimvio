import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { PIN_DOMAIN_SHIP_PHASE } from "@/lib/globe/pin-domain-registry";
import type { GlobePinsIndexResponse } from "@/lib/globe/pin-projection-index-types";
import {
  parseGlobePinsQuery,
  queryPinProjectionIndex,
} from "@/lib/globe/query-pin-projection-index";
import { fetchPersonalGlobePinsIndexForUser } from "@/lib/globe/server-personal-globe-pins-index";
import { fetchExternalGlobePinsIndexInBbox } from "@/lib/globe/server-external-globe-pins-index";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/** Platform pin projection index — personal (owner) + optional external layer in viewport. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      personal: [],
      external: [],
      bbox: null,
      source: "index",
    } satisfies GlobePinsIndexResponse);
  }

  try {
    const user = await requireAuthUser();
    const params = request.nextUrl.searchParams;
    const parsed = parseGlobePinsQuery({
      bbox: params.get("bbox"),
      lat: params.get("lat"),
      lng: params.get("lng"),
      radiusM: params.get("radiusM"),
    });

    const includeExternal =
      params.get("includeExternal") === "1" ||
      params.get("includeExternal") === "true";
    const bbox =
      parsed.mode === "bbox"
        ? parsed.bbox
        : parsed.mode === "near"
          ? parsed.bbox
          : null;

    const personalRemote = await fetchPersonalGlobePinsIndexForUser({
      userId: user.id,
      bbox,
    });
    const personalSlice = queryPinProjectionIndex({
      records: personalRemote,
      bbox,
    });

    let external: GlobePinsIndexResponse["external"] = [];
    if (includeExternal && PIN_DOMAIN_SHIP_PHASE >= 2 && bbox) {
      external = await fetchExternalGlobePinsIndexInBbox({
        bbox,
        excludeUserId: user.id,
      });
    }

    return NextResponse.json({
      personal: personalSlice.records,
      external,
      bbox,
      source: "index",
    } satisfies GlobePinsIndexResponse);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "fetch_failed";
    const status = message.includes("auth") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
