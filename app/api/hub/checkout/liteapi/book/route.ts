import { NextResponse, type NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { bookLiteApiRate } from "@/lib/globe/context-hub/providers/liteapi/book-liteapi-rate";
import type { LiteApiGuestPayload } from "@/lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload";
import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";
export const maxDuration = 60;

/** LiteAPI book — after Payment SDK success on return URL. */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  if (!isLiteApiConfigured()) {
    return NextResponse.json({ error: "liteapi_not_configured" }, { status: 503 });
  }

  let body: {
    prebookId?: string;
    transactionId?: string;
    guest?: LiteApiGuestPayload;
  };
  try {
    body = (await request.json()) as {
      prebookId?: string;
      transactionId?: string;
      guest?: LiteApiGuestPayload;
    };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prebookId = body.prebookId?.trim();
  const transactionId = body.transactionId?.trim();
  if (!prebookId || !transactionId || !body.guest?.holder?.email) {
    return NextResponse.json({ error: "invalid_booking_payload" }, { status: 400 });
  }

  const booked = await bookLiteApiRate({
    prebookId,
    transactionId,
    guest: body.guest,
  });

  if (!booked) {
    return NextResponse.json({ error: "book_failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    bookingId: booked.bookingId,
    hotelConfirmationCode: booked.hotelConfirmationCode,
    status: booked.status,
  });
}
