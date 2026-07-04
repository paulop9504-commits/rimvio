#!/usr/bin/env npx tsx

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { collectHealthReport } from "../lib/server/health-check";
import {
  isSupabaseConfigured,
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from "../lib/supabase/config";
import { missingSupabaseEnvKeys } from "../lib/auth/setup";
import { getAuthCallbackUrl } from "../lib/auth/redirect-url";
import { isGoogleCalendarOAuthConfigured } from "../lib/google-calendar/oauth-setup";
import { integrationOAuthCallbackUrl } from "../lib/integrations/oauth-providers";

function loadEnvFile(fileName: string) {
  const envPath = path.join(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return false;
  }
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  return true;
}

function isLocalSupabaseUrl(url: string | undefined): boolean {
  const value = url?.trim();
  if (!value) {
    return false;
  }
  return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/iu.test(value);
}

const args = new Set(process.argv.slice(2));
const useVercelEnv = args.has("--vercel-env");
const checkRemote = args.has("--remote");
const remoteUrl =
  process.env.DEPLOY_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://rimvio.vercel.app";
const envFileName = useVercelEnv ? ".env.vercel.production" : ".env.local";
const localSupabaseConfigPath = path.join(process.cwd(), "supabase", "config.toml");
const localSupabaseConfigExists = existsSync(localSupabaseConfigPath);

const envFileLoaded = loadEnvFile(envFileName);

type Check = { id: string; ok: boolean; detail: string };

const checks: Check[] = [];

checks.push({
  id: "env-file",
  ok: envFileLoaded,
  detail: envFileLoaded
    ? `${envFileName} loaded`
    : useVercelEnv
      ? `${envFileName} missing — pull or create deploy env file before local verify`
      : `${envFileName} missing — copy .env.example and fill deploy-safe values`,
});

const supabaseMissing = missingSupabaseEnvKeys();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const localSupabaseRequested = isLocalSupabaseUrl(supabaseUrl);
const resolvedSupabaseFallback =
  supabaseMissing.length > 0 &&
  Boolean(resolvePublicSupabaseUrl().trim()) &&
  Boolean(resolvePublicSupabaseAnonKey().trim());
const pulledEnvMasked =
  useVercelEnv &&
  supabaseMissing.length > 0 &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === "";
checks.push({
  id: "supabase-env",
  ok: supabaseMissing.length === 0 || pulledEnvMasked || resolvedSupabaseFallback,
  detail:
    supabaseMissing.length === 0
      ? "NEXT_PUBLIC_SUPABASE_URL + ANON_KEY set"
      : pulledEnvMasked
        ? "encrypted on Vercel (verify via --remote /api/health)"
        : resolvedSupabaseFallback
          ? "env missing locally — using baked-in Rimvio public fallback"
        : `missing: ${supabaseMissing.join(", ")} (${envFileName})`,
});

checks.push({
  id: "local-supabase-config",
  ok: !localSupabaseRequested || localSupabaseConfigExists,
  detail: !localSupabaseRequested
    ? "not using local Supabase URL"
    : localSupabaseConfigExists
      ? `found ${path.relative(process.cwd(), localSupabaseConfigPath)}`
      : "local Supabase URL is set, but supabase/config.toml is missing",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
const productionUrl = remoteUrl.replace(/\/$/, "");
const useProductionUrlFallback =
  pulledEnvMasked && productionUrl.length > 0 && !productionUrl.includes("localhost");

if (useProductionUrlFallback && (!appUrl || appUrl.includes("localhost"))) {
  process.env.NEXT_PUBLIC_APP_URL = productionUrl;
}

const effectiveAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

checks.push({
  id: "app-url",
  ok:
    (effectiveAppUrl.length > 0 && !effectiveAppUrl.includes("localhost")) ||
    useProductionUrlFallback,
  detail: effectiveAppUrl
    ? effectiveAppUrl.includes("localhost")
      ? `localhost only — set production URL for deploy in ${envFileName} (${effectiveAppUrl})`
      : effectiveAppUrl
    : useProductionUrlFallback
      ? `set on Vercel runtime (alias: ${productionUrl})`
      : `NEXT_PUBLIC_APP_URL empty — OAuth redirect will break on Vercel (${envFileName})`,
});

checks.push({
  id: "auth-callback",
  ok: Boolean(
    (effectiveAppUrl && !effectiveAppUrl.includes("localhost")) ||
      process.env.VERCEL_URL ||
      useProductionUrlFallback,
  ),
  detail: `callback: ${getAuthCallbackUrl()}`,
});

const googleOauthReady = isGoogleCalendarOAuthConfigured();
checks.push({
  id: "google-calendar-oauth",
  ok: true,
  detail: googleOauthReady
    ? `configured · ${integrationOAuthCallbackUrl()}`
    : "optional — GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET not set",
});

async function main(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const localHealth = await collectHealthReport();
    const reachable = localHealth.supabase.reachable;
    checks.push({
      id: "supabase-reachable",
      ok: reachable || useVercelEnv,
      detail: reachable
        ? "auth/v1/health OK"
        : localSupabaseRequested && !localSupabaseConfigExists
          ? "local Supabase URL points to localhost, but no local Supabase project is configured"
          : localSupabaseRequested
            ? "local Supabase not reachable — start it before deploy verification"
        : useVercelEnv
          ? "skipped locally — verify via --remote /api/health after deploy"
          : "Supabase unreachable from this machine",
    });
  }

  if (checkRemote) {
    try {
      const response = await fetch(`${remoteUrl.replace(/\/$/, "")}/api/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        supabase?: { configured?: boolean; reachable?: boolean };
      };
      checks.push({
        id: "remote-health",
        ok: response.ok && body.ok === true,
        detail: `${remoteUrl}/api/health → ${response.status} supabase.reachable=${body.supabase?.reachable ?? "?"}`,
      });
    } catch (error) {
      checks.push({
        id: "remote-health",
        ok: false,
        detail: `fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const failed = checks.filter((row) => !row.ok);
  console.log("\n=== Rimvio deploy readiness ===\n");
  for (const row of checks) {
    console.log(`${row.ok ? "✓" : "✗"} ${row.id}: ${row.detail}`);
  }

  if (failed.length > 0) {
    console.log("\nSuggested next steps:\n");
    if (failed.some((row) => row.id === "env-file")) {
      console.log(`- Create ${envFileName} from .env.example before running verify again.`);
    }
    if (failed.some((row) => row.id === "supabase-env")) {
      console.log(
        "- Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or run with --vercel-env/--remote if those values only exist in Vercel.",
      );
    }
    if (failed.some((row) => row.id === "local-supabase-config")) {
      console.log("- If you want local Supabase, initialize it and create supabase/config.toml before verification.");
    }
    if (failed.some((row) => row.id === "supabase-reachable")) {
      console.log("- If using local Supabase, start it first. If using a hosted project, verify the URL/key pair and network reachability.");
    }
    if (failed.some((row) => row.id === "app-url" || row.id === "auth-callback")) {
      console.log("- Set NEXT_PUBLIC_APP_URL to the real deploy origin when checking production readiness.");
    }
    console.log(`\nFAIL (${failed.length} check(s))\n`);
    return false;
  }

  console.log("\nOK — ready for production deploy\n");
  return true;
}

void main().then((ok) => {
  if (!ok) {
    process.exitCode = 1;
  }
});
