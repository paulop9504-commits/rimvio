import { NextResponse } from "next/server";
import { searchShopProducts } from "@/lib/sandbox/shop-catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "5");
  const products = searchShopProducts(query, Number.isFinite(limit) ? limit : 5);

  return NextResponse.json({
    query,
    count: products.length,
    products,
  });
}
