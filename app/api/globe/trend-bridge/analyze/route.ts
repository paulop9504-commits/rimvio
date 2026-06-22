import { type NextRequest, NextResponse } from "next/server";
import { runTrendCaptureAnalysisPipeline } from "@/lib/globe/trend-bridge/analysis";
import type { TrendCaptureRecord } from "@/lib/globe/trend-bridge/analysis/trend-capture-types";

function parseRecords(body: unknown): TrendCaptureRecord[] | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const rows = (body as { records?: unknown }).records;
  if (!Array.isArray(rows)) {
    return null;
  }
  const parsed: TrendCaptureRecord[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as Partial<TrendCaptureRecord>;
    if (
      typeof record.actorHash !== "string" ||
      typeof record.location !== "string" ||
      typeof record.category !== "string" ||
      typeof record.timestamp !== "string"
    ) {
      continue;
    }
    parsed.push({
      actorHash: record.actorHash.trim(),
      location: record.location.trim(),
      category: record.category.trim(),
      timestamp: record.timestamp.trim(),
      sentiment:
        typeof record.sentiment === "string" ? record.sentiment.trim() : null,
    });
  }
  return parsed.length > 0 ? parsed : null;
}

/** Anonymous EXIF-capture trend rollup — deterministic engine (LLM prompts optional downstream). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const records = parseRecords(body);
  if (!records) {
    return NextResponse.json({ error: "invalid_records" }, { status: 400 });
  }

  const delivery = (body as { delivery?: unknown }).delivery;
  const userCaptureTimestamp =
    delivery &&
    typeof delivery === "object" &&
    typeof (delivery as { userCaptureTimestamp?: unknown }).userCaptureTimestamp ===
      "string"
      ? (delivery as { userCaptureTimestamp: string }).userCaptureTimestamp
      : null;
  const userLocation =
    delivery &&
    typeof delivery === "object" &&
    typeof (delivery as { userLocation?: unknown }).userLocation === "string"
      ? (delivery as { userLocation: string }).userLocation
      : null;

  const minContributors =
    typeof (body as { minContributors?: unknown }).minContributors === "number"
      ? Math.max(3, (body as { minContributors: number }).minContributors)
      : 5;

  const pipeline = runTrendCaptureAnalysisPipeline({
    records,
    options: { minContributors, timeZone: "Asia/Seoul" },
    delivery: { userCaptureTimestamp, userLocation },
  });

  if (!pipeline.analysis) {
    return NextResponse.json(
      {
        ok: false,
        reason: "insufficient_k_anonymity",
        filteredCount: pipeline.filteredCount,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    analysis: {
      hotspot_area: pipeline.analysis.hotspot_area,
      category: pipeline.analysis.category,
      day_segment: pipeline.analysis.day_segment,
      day_of_week: pipeline.analysis.day_of_week,
      peak_hour: pipeline.analysis.peak_hour,
      trend_velocity: pipeline.analysis.trend_velocity,
      context_summary: pipeline.analysis.context_summary,
      total_contributors: pipeline.analysis.total_contributors,
    },
    context_message: pipeline.contextMessage,
    llm: {
      analysis: pipeline.analysisLlm,
      delivery: pipeline.contextLlm,
    },
  });
}
