import { NextResponse, type NextRequest } from "next/server";
import { listSeedLearningSharedRollup } from "@/lib/seed-learning/shared-aggregate-store";
import {
  evaluateSeedPromoteCandidates,
  listReadySeedPromoteCandidates,
} from "@/lib/seed-learning/evaluate-promote-candidates";
import {
  SEED_PROMOTE_SHARED_MIN_HIT_ALIAS,
  SEED_PROMOTE_SHARED_MIN_MENTIONS,
  SEED_PROMOTE_SHARED_MIN_MISS,
  filterCommunityPromoteReady,
} from "@/lib/seed-learning/community-promote-thresholds";
import { isSeedLearningSectorId } from "@/lib/seed-learning/sector-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Community promote board — aggregated across users (anonymous).
 * Higher thresholds than personal local promote.
 */
export async function GET(request: NextRequest) {
  const sectorRaw = request.nextUrl.searchParams.get("sectorId");
  const sectorId =
    sectorRaw && isSeedLearningSectorId(sectorRaw) ? sectorRaw : null;
  const readyOnly = request.nextUrl.searchParams.get("ready") !== "0";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  try {
    const { entries, backend } = await listSeedLearningSharedRollup({
      sectorId,
      limit,
    });
    const evaluated = evaluateSeedPromoteCandidates(entries);
    const ready = filterCommunityPromoteReady(evaluated);
    return NextResponse.json({
      ok: true,
      backend,
      thresholds: {
        minMentions: SEED_PROMOTE_SHARED_MIN_MENTIONS,
        minMiss: SEED_PROMOTE_SHARED_MIN_MISS,
        minHitAlias: SEED_PROMOTE_SHARED_MIN_HIT_ALIAS,
      },
      entryCount: entries.length,
      candidates: readyOnly ? ready : evaluated,
      readyCount: listReadySeedPromoteCandidates(entries).length,
      communityReadyCount: ready.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
