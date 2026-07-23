/**
 * Apple MapKit JS config for Context Workspace (2D).
 * Token is issued server-side — never put Maps private key in the client.
 *
 * Setup (when ready):
 * 1. Apple Developer → Maps ID + MapKit JS key
 * 2. Set APPLE_MAPKIT_TEAM_ID · APPLE_MAPKIT_KEY_ID · APPLE_MAPKIT_PRIVATE_KEY
 * 3. NEXT_PUBLIC_APPLE_MAPKIT_ENABLED=true
 * 4. Client loads JWT from GET /api/apple-mapkit-token
 */

export type AppleMapKitClientConfig = {
  readonly enabled: boolean;
  readonly tokenUrl: string;
  readonly libraryUrl: string;
  /** Shown in Settings / diagnostics only. */
  readonly statusKo: string;
};

export function readAppleMapKitServerEnv(): {
  readonly teamId: string | null;
  readonly keyId: string | null;
  readonly privateKeyPem: string | null;
  readonly configured: boolean;
} {
  const teamId = process.env.APPLE_MAPKIT_TEAM_ID?.trim() || null;
  const keyId = process.env.APPLE_MAPKIT_KEY_ID?.trim() || null;
  const privateKeyPem =
    process.env.APPLE_MAPKIT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || null;
  return {
    teamId,
    keyId,
    privateKeyPem,
    configured: Boolean(teamId && keyId && privateKeyPem),
  };
}

export function readAppleMapKitClientConfig(): AppleMapKitClientConfig {
  const enabled =
    process.env.NEXT_PUBLIC_APPLE_MAPKIT_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_APPLE_MAPKIT_ENABLED === "true";
  const serverReadyHint = enabled
    ? "MapKit JS 켜짐 · 토큰 API 확인"
    : "MapKit 대기 · placeholder 맵 사용 중";
  return {
    enabled,
    tokenUrl: "/api/apple-mapkit-token",
    libraryUrl: "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js",
    statusKo: serverReadyHint,
  };
}
