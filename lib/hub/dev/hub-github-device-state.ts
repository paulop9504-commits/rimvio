import { createHmac, randomBytes } from "node:crypto";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";

const COOKIE_NAME = "rimvio_github_device";
const MAX_AGE_SEC = 900;

export type HubGitHubDeviceStatePayload = {
  deviceCode: string;
  userId: string;
  interval: number;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  return (
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    "rimvio-github-device-dev"
  );
}

function sign(payloadB64: string): string {
  return createHmac("sha256", stateSecret()).update(payloadB64).digest("base64url");
}

export function encodeHubGitHubDeviceState(
  payload: Omit<HubGitHubDeviceStatePayload, "nonce" | "exp">,
): string {
  const full: HubGitHubDeviceStatePayload = {
    ...payload,
    nonce: randomBytes(12).toString("hex"),
    exp: Date.now() + MAX_AGE_SEC * 1000,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeHubGitHubDeviceState(token: string): HubGitHubDeviceStatePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as HubGitHubDeviceStatePayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hubGitHubDeviceCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: resolveAppOrigin().startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function readHubGitHubDeviceCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export { COOKIE_NAME as HUB_GITHUB_DEVICE_COOKIE_NAME };
