import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { isLiteApiConfigured, prebookLiteApiOffer } from "@/lib/globe/context-hub/providers/liteapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";
export const maxDuration = 60;

/** LiteAPI prebook — server-side; returns Payment SDK credentials to client. */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  if (!isLiteApiConfigured()) {
    return NextResponse.json({ error: "liteapi_not_configured" }, { status: 503 });
  }

  let body: {
    offerId?: string;
  };
  try {
    body = (await request.json()) as { offerId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const offerId = body.offerId?.trim();
  if (!offerId) {
    return NextResponse.json({ error: "offer_id_required" }, { status: 400 });
  }

  const prebook = await prebookLiteApiOffer({ offerId, usePaymentSdk: true });
  if (!prebook?.secretKey || !prebook.transactionId) {
    return NextResponse.json({ error: "prebook_failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    prebookId: prebook.prebookId,
    transactionId: prebook.transactionId,
    secretKey: prebook.secretKey,
    publicKey: prebook.publicKey,
  });
}
