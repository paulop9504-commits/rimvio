/** Map focus hero — compact coordinate line (matches personal replay bubble). */
export function formatMapFocusCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}
