import { NextResponse } from "next/server";
import { resolveMarketQuestionEngine } from "@/lib/globe/market/question-engine";
import type { MarketCategoryId, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketIntentDetail } from "@/lib/globe/market/market-intent-detail";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const row = body as Record<string, unknown>;
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const role: MarketIntentRole =
    row.role === "seeking" || row.role === "listing" ? row.role : "seeking";

  const productName = typeof row.productName === "string" ? row.productName.trim() : undefined;
  const categoryId =
    typeof row.categoryId === "string" ? (row.categoryId as MarketCategoryId) : undefined;

  const existingDetail =
    row.existingDetail && typeof row.existingDetail === "object"
      ? (row.existingDetail as Pick<MarketIntentDetail, "prioritySlots" | "conditionId" | "detailNote">)
      : undefined;

  const result = resolveMarketQuestionEngine({
    text,
    productName,
    categoryId,
    role,
    existingDetail,
    priceMinKrw: typeof row.priceMinKrw === "number" ? row.priceMinKrw : null,
    priceMaxKrw: typeof row.priceMaxKrw === "number" ? row.priceMaxKrw : null,
    maxQuestions: typeof row.maxQuestions === "number" ? row.maxQuestions : undefined,
  });

  return NextResponse.json(result);
}
