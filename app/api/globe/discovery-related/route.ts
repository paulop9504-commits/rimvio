import { NextResponse } from "next/server";
import { inferReactiveDiscoveryRefinement } from "@/lib/globe/discovery/infer-reactive-discovery-refinement";
import type { ReactiveDiscoveryRouteRequest } from "@/lib/globe/discovery/live-discovery-reactive";

function isValidBody(value: unknown): value is ReactiveDiscoveryRouteRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const body = value as Partial<ReactiveDiscoveryRouteRequest>;
  return (
    (body.domain === "eatery" || body.domain === "lodging") &&
    typeof body.projectedResourceId === "string" &&
    !!body.projectedResourceId.trim() &&
    !!body.contextEvent &&
    typeof body.contextEvent.id === "string" &&
    typeof body.contextEvent.title === "string" &&
    Array.isArray(body.items)
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const refinement = await inferReactiveDiscoveryRefinement(body);
  return NextResponse.json(refinement);
}
