import { NextResponse } from "next/server";
import { readAppleMapKitServerEnv } from "@/lib/context-workspace/map/apple-mapkit-config";
import { signAppleMapKitJwt } from "@/lib/context-workspace/map/sign-mapkit-jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MapKit JS JWT issuer for Context Workspace 2D map.
 */
export async function GET() {
  const env = readAppleMapKitServerEnv();
  if (!env.configured || !env.teamId || !env.keyId || !env.privateKeyPem) {
    return NextResponse.json(
      {
        ok: false,
        error: "apple_mapkit_not_configured",
        hintKo:
          "APPLE_MAPKIT_TEAM_ID · KEY_ID · PRIVATE_KEY 를 설정한 뒤 토큰을 발급하세요",
      },
      { status: 503 },
    );
  }

  try {
    const token = signAppleMapKitJwt({
      teamId: env.teamId,
      keyId: env.keyId,
      privateKeyPem: env.privateKeyPem,
    });
    return NextResponse.json({
      ok: true,
      token,
      expiresInSec: 30 * 60,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "jwt_sign_failed";
    return NextResponse.json(
      {
        ok: false,
        error: "apple_mapkit_jwt_failed",
        message,
        hintKo: "Private key PEM 형식을 확인하세요 (-----BEGIN PRIVATE KEY-----)",
      },
      { status: 500 },
    );
  }
}
