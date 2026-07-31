import { NextResponse } from "next/server";
import {
  buildPlaceBriefFromFacts,
  enrichPlaceBriefWithLlm,
  writePlaceBriefCache,
  type PlaceBriefFactPack,
} from "@/lib/context-workspace/place-brief";

export const runtime = "nodejs";

type Body = {
  pack?: PlaceBriefFactPack;
  allowLlm?: boolean;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const pack = body.pack;
  if (!pack?.placeId?.trim() || !pack.title?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_pack" }, { status: 400 });
  }

  const base = buildPlaceBriefFromFacts(pack);
  if (body.allowLlm === false) {
    writePlaceBriefCache(base);
    return NextResponse.json({ ok: true, brief: base });
  }

  const brief = await enrichPlaceBriefWithLlm({ pack, base });
  writePlaceBriefCache(brief);
  return NextResponse.json({ ok: true, brief });
}
