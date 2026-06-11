import {
  RIMVIO_SUPABASE_ANON_KEY,
  RIMVIO_SUPABASE_URL,
} from "@/lib/supabase/rimvio-supabase-public";

function looksValidAnonKey(value: string | undefined): value is string {
  const key = value?.trim();
  return Boolean(key && key.startsWith("eyJ") && key.length > 100);
}

function looksValidUrl(value: string | undefined): value is string {
  const url = value?.trim();
  return Boolean(url && url.includes(".supabase.co"));
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
  if (looksValidAnonKey(fromEnv)) {
    return fromEnv;
  }
  return RIMVIO_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured() {
  return Boolean(
    resolvePublicSupabaseUrl() && resolvePublicSupabaseAnonKey(),
  );
}
