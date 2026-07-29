/**
 * maps.navigate — Google Maps directions URL (handoff only, no Reality Commit).
 */

export type MapsTravelMode = "walking" | "driving" | "transit";

export function travelModeFromUtterance(text: string): MapsTravelMode {
  if (/택시|차로|driving|드라이브/iu.test(text)) {
    return "driving";
  }
  if (/지하철|전철|버스|transit|대중교통/iu.test(text)) {
    return "transit";
  }
  return "walking";
}

export function buildMapsNavigateUrl(input: {
  readonly lat: number;
  readonly lng: number;
  readonly label: string;
  readonly mode: MapsTravelMode;
}): string {
  const q = encodeURIComponent(input.label);
  return `https://www.google.com/maps/dir/?api=1&destination=${input.lat},${input.lng}&destination_place_id=&travelmode=${input.mode}&q=${q}`;
}
