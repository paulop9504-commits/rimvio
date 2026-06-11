import {
  RIMVIO_SUPABASE_ANON_KEY,
  RIMVIO_SUPABASE_URL,
} from "@/lib/supabase/rimvio-supabase-public";

const RIMVIO_PROJECT_REF = extractSupabaseRef(RIMVIO_SUPABASE_URL);

function looksValidAnonKey(value: string | undefined): value is string {
  const key = value?.trim();
  return Boolean(key && key.startsWith("eyJ") && key.length > 100);
}

function looksValidUrl(value: string | undefined): value is string {
  const url = value?.trim();
  return Boolean(url && url.includes(".supabase.co"));
}

function extractSupabaseRef(url: string): string | null {
  const match = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function extractJwtRef(token: string): string | null {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(normalized)
        : Buffer.from(normalized, "base64").toString("utf8");
    const payload = JSON.parse(json) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function anonKeyMatchesUrl(key: string, url: string): boolean {
  if (!looksValidAnonKey(key)) return false;
  const urlRef = extractSupabaseRef(url);
  const keyRef = extractJwtRef(key);
  return Boolean(urlRef && keyRef && urlRef === keyRef);
}

function isRimvioProjectUrl(url: string): boolean {
  const ref = extractSupabaseRef(url);
  return Boolean(ref && RIMVIO_PROJECT_REF && ref === RIMVIO_PROJECT_REF);
}

/** Prefer Vercel env; fall back to baked-in public project credentials. */
export function resolvePublicSupabaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (looksValidUrl(fromEnv)) {
    return fromEnv;
  }
  return RIMVIO_SUPABASE_URL;
}

export function resolvePublicSupabaseAnonKey(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const url = resolvePublicSupabaseUrl();

  if (!fromEnv) {
    return RIMVIO_SUPABASE_ANON_KEY;
  }

  if (fromEnv === RIMVIO_SUPABASE_ANON_KEY) {
    return fromEnv;
  }

  // Rimvio prod: Vercel often has a mistyped anon key — use known-good fallback.
  if (isRimvioProjectUrl(url)) {
    return RIMVIO_SUPABASE_ANON_KEY;
  }

  if (anonKeyMatchesUrl(fromEnv, url)) {
    return fromEnv;
  }

  return RIMVIO_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured() {
  return Boolean(
    resolvePublicSupabaseUrl() && resolvePublicSupabaseAnonKey(),
  );
}
