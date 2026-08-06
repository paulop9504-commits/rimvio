import { NextResponse } from "next/server";
import {
  buildPlaceBriefFromFacts,
  type PlaceBriefFactPack,
} from "@/lib/context-workspace/place-brief";
import { enrichPlaceListBlurbsWithLlm } from "@/lib/context-workspace/place-list/enrich-place-list-blurbs-llm";

export const runtime = "nodejs";

type Body = {
  packs?: PlaceBriefFactPack[];
  destinationKo?: string | null;
  queryHintKo?: string | null;
  allowLlm?: boolean;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const packs = (body.packs ?? [])
    .filter((p) => p?.placeId?.trim() && p?.title?.trim())
    .slice(0, 12);

  if (packs.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_packs" }, { status: 400 });
  }

  if (body.allowLlm === false) {
    const blurbs = packs.map((pack) => {
      const brief = buildPlaceBriefFromFacts(pack);
      return {
        placeId: pack.placeId,
        blurbKo: brief.introKo?.trim() || pack.summaryKo?.trim() || pack.title,
        source: "facts" as const,
      };
    });
    return NextResponse.json({ ok: true, blurbs });
  }

  const blurbs = await enrichPlaceListBlurbsWithLlm({
    packs,
    destinationKo: body.destinationKo,
    queryHintKo: body.queryHintKo,
  });
  return NextResponse.json({ ok: true, blurbs });
}
