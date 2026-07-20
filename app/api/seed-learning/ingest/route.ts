import { NextResponse, type NextRequest } from "next/server";
import {
  ingestSeedLearningSharedDeltas,
} from "@/lib/seed-learning/shared-aggregate-store";
import type { SeedLearningSharedDelta } from "@/lib/seed-learning/types";
import { isSeedLearningSectorId } from "@/lib/seed-learning/sector-registry";
import {
  isSeedLearningTokenWorthy,
  normalizeSeedLearningToken,
} from "@/lib/seed-learning/normalize-seed-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IngestBody = {
  deltas?: unknown;
};

function parseDeltas(raw: unknown): SeedLearningSharedDelta[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SeedLearningSharedDelta[] = [];
  for (const row of raw.slice(0, 40)) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const rec = row as Record<string, unknown>;
    const sectorId = String(rec.sectorId ?? "");
    const token = normalizeSeedLearningToken(String(rec.token ?? ""));
    if (!isSeedLearningSectorId(sectorId) || !isSeedLearningTokenWorthy(token)) {
      continue;
    }
    out.push({
      sectorId,
      token,
      hitDelta: Number(rec.hitDelta) || 0,
      missDelta: Number(rec.missDelta) || 0,
      domain:
        typeof rec.domain === "string" ? rec.domain.slice(0, 32) : null,
    });
  }
  return out;
}

/**
 * Community seed ingest — anonymous sector/token count deltas only.
 * No utterance, no user id, no session.
 */
export async function POST(request: NextRequest) {
  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const deltas = parseDeltas(body.deltas);
  if (deltas.length === 0) {
    return NextResponse.json({ ok: true, persisted: 0, backend: "memory" });
  }

  try {
    const result = await ingestSeedLearningSharedDeltas(deltas);
    return NextResponse.json({
      ok: true,
      persisted: result.persisted,
      backend: result.backend,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingest_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
