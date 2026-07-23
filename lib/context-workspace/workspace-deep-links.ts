/**
 * Deep links — Apple / Google Maps are execution surfaces, not the editor.
 */

export function buildAppleMapsDeepLink(input: {
  lat: number;
  lng: number;
  label?: string | null;
}): string {
  const q = encodeURIComponent(
    input.label?.trim() || `${input.lat},${input.lng}`,
  );
  return `https://maps.apple.com/?ll=${input.lat},${input.lng}&q=${q}`;
}

export function buildGoogleMapsDeepLink(input: {
  lat: number;
  lng: number;
  label?: string | null;
}): string {
  const q = encodeURIComponent(
    input.label?.trim() || `${input.lat},${input.lng}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=`;
}

export function buildGoogleMapsDirectionsDeepLink(input: {
  lat: number;
  lng: number;
  mode?: "driving" | "walking" | "transit";
}): string {
  const mode = input.mode ?? "walking";
  return `https://www.google.com/maps/dir/?api=1&destination=${input.lat},${input.lng}&travelmode=${mode}`;
}
