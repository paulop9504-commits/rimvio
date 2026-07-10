import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { createHubPgSession } from "@/lib/globe/hub-checkout/pg/create-hub-pg-session";
import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";

type Body = {
  sessionId?: string;
  contextEventId?: string;
  resourceId?: string;
  paymentMethod?: HubCheckoutPaymentMethod;
  amountKrw?: number;
  orderName?: string;
};

function isPaymentMethod(value: string): value is HubCheckoutPaymentMethod {
  return value === "in_app_card" || value === "kakaopay" || value === "tosspay";
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const contextEventId = body.contextEventId?.trim();
  const resourceId = body.resourceId?.trim();
  const paymentMethod = body.paymentMethod?.trim() ?? "";
  const amountKrw = body.amountKrw;
  const orderName = body.orderName?.trim() || "Rimvio lodging";

  if (!sessionId || !contextEventId || !resourceId || !isPaymentMethod(paymentMethod)) {
    return NextResponse.json({ error: "invalid_checkout_session" }, { status: 400 });
  }
  if (typeof amountKrw !== "number" || !Number.isFinite(amountKrw) || amountKrw <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const successUrl = `${appUrl}/?hub_pg=success&provider=${paymentMethod}`;
  const failUrl = `${appUrl}/?hub_pg=fail&provider=${paymentMethod}`;

  try {
    const wire = await createHubPgSession({
      sessionId,
      contextEventId,
      resourceId,
      paymentMethod,
      amountKrw: Math.round(amountKrw),
      orderName,
      successUrl,
      failUrl,
    });
    return NextResponse.json(wire);
  } catch (error) {
    const message = error instanceof Error ? error.message : "pg_session_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
