import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";

type Body = {
  orderId?: string;
  amountKrw?: number;
  orderName?: string;
  successUrl?: string;
  failUrl?: string;
};

/**
 * Kakao Pay Online — ready redirect URL.
 * Requires KAKAO_PAY_CID + KAKAO_PAY_SECRET (partner onboarding).
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const cid = process.env.KAKAO_PAY_CID?.trim();
  const secret = process.env.KAKAO_PAY_SECRET?.trim();
  if (!cid || !secret) {
    return NextResponse.json({ error: "kakao_pay_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const amountKrw = body.amountKrw;
  const orderName = body.orderName?.trim() || "Rimvio";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const approvalUrl =
    body.successUrl?.trim() ||
    `${appUrl}/?hub_pg=success&provider=kakaopay&order_id=${encodeURIComponent(orderId ?? "")}`;
  const cancelUrl =
    body.failUrl?.trim() ||
    `${appUrl}/?hub_pg=fail&provider=kakaopay&order_id=${encodeURIComponent(orderId ?? "")}`;

  if (!orderId || typeof amountKrw !== "number" || amountKrw <= 0) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const readyResponse = await fetch("https://open-api.kakaopay.com/online/v1/payment/ready", {
    method: "POST",
    headers: {
      Authorization: `SECRET_KEY ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cid,
      partner_order_id: orderId,
      partner_user_id: userId,
      item_name: orderName.slice(0, 100),
      quantity: 1,
      total_amount: Math.round(amountKrw),
      tax_free_amount: 0,
      approval_url: approvalUrl,
      cancel_url: cancelUrl,
      fail_url: cancelUrl,
    }),
  });

  if (!readyResponse.ok) {
    const text = await readyResponse.text();
    return NextResponse.json(
      { error: "kakao_ready_failed", detail: text.slice(0, 240) },
      { status: 502 },
    );
  }

  const payload = (await readyResponse.json()) as {
    next_redirect_pc_url?: string;
    next_redirect_mobile_url?: string;
  };
  const redirectUrl =
    payload.next_redirect_mobile_url?.trim() ||
    payload.next_redirect_pc_url?.trim() ||
    null;
  if (!redirectUrl) {
    return NextResponse.json({ error: "kakao_redirect_missing" }, { status: 502 });
  }

  return NextResponse.json({ redirectUrl, orderId });
}
