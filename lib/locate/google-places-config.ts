export type GooglePlacesApiKeyEnvName =
  | "GOOGLE_PLACES_API_KEY"
  | "GOOGLE_MAPS_API_KEY";

export type ResolvedGooglePlacesApiKey = {
  name: GooglePlacesApiKeyEnvName;
  value: string;
};

/**
 * Rimvio's existing Google API key setup is centered on Places/Maps env names.
 * Other Google APIs may reuse the same key only when that API is also enabled
 * for the same Google Cloud project.
 */
export function resolveGooglePlacesApiKey(): ResolvedGooglePlacesApiKey | null {
  const places = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (places) {
    return { name: "GOOGLE_PLACES_API_KEY", value: places };
  }

  const maps = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (maps) {
    return { name: "GOOGLE_MAPS_API_KEY", value: maps };
  }

  return null;
}

export function googlePlacesApiKey(): string {
  return resolveGooglePlacesApiKey()?.value ?? "";
}

export function isGooglePlacesConfigured(): boolean {
  return googlePlacesApiKey().length > 0;
}
