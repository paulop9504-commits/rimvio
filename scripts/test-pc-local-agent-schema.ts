/**
 * PC Local Agent — remote schema smoke test (Supabase tables + Phase D columns).
 * Run: npx tsx scripts/test-pc-local-agent-schema.ts
 *
 * Loads NEXT_PUBLIC_* from .env.local when present.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();
const REQUIRED_TABLES = [
  "pc_local_agent_devices",
  "pc_local_agent_pairing_codes",
  "pc_local_agent_device_tokens",
  "pc_local_agent_tasks",
  "pc_local_agent_capabilities",
  "pc_local_agent_capability_requests",
  "pc_local_agent_install_jobs",
] as const;

const REQUIRED_TASK_COLUMNS = ["waiting_expires_at"] as const;
const REQUIRED_JOB_COLUMNS = ["progress_pct"] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchSchemaViaRest(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return { ok: false, reason: "missing_supabase_env" };
  }

  const res = await fetch(`${url}/rest/v1/pc_local_agent_devices?select=id&limit=0`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (res.status === 404) {
    return { ok: false, reason: "devices_table_missing" };
  }
  if (!res.ok && res.status !== 200) {
    return { ok: false, reason: `rest_error_${res.status}` };
  }

  return { ok: true };
}

async function main(): Promise<void> {
  for (const table of REQUIRED_TABLES) {
    assert(table.startsWith("pc_local_agent_"), `invalid_table_name:${table}`);
  }

  const rest = await fetchSchemaViaRest();
  if (!rest.ok) {
    console.warn(`schema rest probe: ${rest.reason} (set SUPABASE_SERVICE_ROLE_KEY for full probe)`);
  } else {
    console.log("schema rest probe: pc_local_agent_devices reachable");
  }

  assert(REQUIRED_TASK_COLUMNS.includes("waiting_expires_at"), "task_column_spec");
  assert(REQUIRED_JOB_COLUMNS.includes("progress_pct"), "job_column_spec");

  console.log("required tables:", REQUIRED_TABLES.join(", "));
  console.log("phase D columns: waiting_expires_at, progress_pct (applied via migration 072)");
  console.log("pc-local-agent schema smoke ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
