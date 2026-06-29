import { NextResponse } from "next/server";

import { devOnlyApiGuard } from "@/lib/dev/assert-dev-only-api";
import { readLiveTurnLog } from "@/lib/dev/read-live-turn-log";
import { summarizeSelfLearning } from "@/lib/dev/summarize-self-learning";
import { readHitRunFeedbackEntries } from "@/lib/self-learning/read-interaction-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = devOnlyApiGuard();
  if (blocked) {
    return blocked;
  }

  const liveTurns = readLiveTurnLog(200);
  const feedbackEntries = readHitRunFeedbackEntries();
  const summary = summarizeSelfLearning({ liveTurns, feedbackEntries });

  return NextResponse.json({
    ok: true,
    summary,
    liveTurnCount: liveTurns.length,
    feedbackCount: feedbackEntries.length,
  });
}
