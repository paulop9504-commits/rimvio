import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

/** Open focused day stops in Google Maps directions (mobile-safe https fallback). */
export function openWorkspaceItineraryRoute(
  nodes: readonly Pick<ContextWorkspaceNode, "lat" | "lng">[],
): boolean {
  if (typeof window === "undefined" || nodes.length === 0) {
    return false;
  }

  const stops = nodes.filter(
    (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
  );
  if (stops.length === 0) {
    return false;
  }

  const origin = stops[0]!;
  const destination = stops[stops.length - 1]!;
  const params = new URLSearchParams({
    api: "1",
    travelmode: "transit",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
  });

  if (stops.length > 2) {
    params.set(
      "waypoints",
      stops
        .slice(1, -1)
        .map((n) => `${n.lat},${n.lng}`)
        .join("|"),
    );
  }

  window.open(
    `https://www.google.com/maps/dir/?${params.toString()}`,
    "_blank",
    "noopener,noreferrer",
  );
  return true;
}
