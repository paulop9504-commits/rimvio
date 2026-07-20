#!/usr/bin/env npx tsx
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(".env.vercel.production");
loadEnv(".env.local");

const url = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim();
const key = (
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();

const meta = {
  urlLen: url.length,
  keyLen: key.length,
  urlLooksHttps: /^https:\/\//i.test(url),
  keyKind: process.env.SUPABASE_ANON_KEY
    ? "anon"
    : process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "service_role"
      : "public_anon",
};

if (!meta.urlLooksHttps || meta.keyLen < 20) {
  writeFileSync(
    "reports/supabase-schema-audit.json",
    JSON.stringify({ ok: false, error: "bad_env", meta }, null, 2),
  );
  console.log("Wrote reports/supabase-schema-audit.json (bad env)");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const tableRe =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/giu;
const fnRe =
  /create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)/giu;

const tables = new Set<string>();
const functions = new Set<string>();
for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  for (const m of sql.matchAll(tableRe)) tables.add(m[1]!);
  for (const m of sql.matchAll(fnRe)) {
    if (!m[1]!.startsWith("_")) functions.add(m[1]!);
  }
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function probeTable(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from(name).select("*").limit(1);
  if (!error) return { name, ok: true as const, detail: "ok" };
  const msg = String(error.message || error.code || error);
  const missing = /could not find|does not exist|relation|schema cache|PGRST205|42P01/i.test(
    msg,
  );
  return {
    name,
    ok: !missing,
    detail: missing ? `MISSING: ${msg}` : msg,
  };
}

const RPC_STUBS: Record<string, Record<string, unknown>> = {
  bump_seed_learning_aggregate: {
    p_sector_id: "stations",
    p_token: "schema-audit",
    p_hit_delta: 0,
    p_miss_delta: 0,
    p_domain: null,
  },
  lookup_user_id_by_phone: { p_phone_e164: "+820000000000" },
  lookup_user_id_by_email: { p_email_lower: "audit@example.com" },
  lookup_user_id_by_rimvio_id: { p_rimvio_id: "audit0000" },
  rimvio_user_is_member: {
    p_user_id: "00000000-0000-0000-0000-000000000000",
  },
  rimvio_ensure_user_profile: {
    p_user_id: "00000000-0000-0000-0000-000000000000",
  },
  get_peer_public_profile: {
    p_target_user_id: "00000000-0000-0000-0000-000000000000",
  },
  get_friend_add_preview_profile: {
    p_target_user_id: "00000000-0000-0000-0000-000000000000",
  },
  ensure_dm_thread_partner_member: {
    p_thread_id: "00000000-0000-0000-0000-000000000000",
    p_partner_user_id: "00000000-0000-0000-0000-000000000000",
  },
  ensure_reciprocal_friend_connection: {
    p_friend_id: "00000000-0000-0000-0000-000000000000",
    p_thread_id: "00000000-0000-0000-0000-000000000000",
  },
  complete_dm_friend_add: {
    p_other_user_id: "00000000-0000-0000-0000-000000000000",
  },
  is_peer_thread_member: {
    p_thread_id: "00000000-0000-0000-0000-000000000000",
  },
  rimvio_rename_group_thread: {
    p_thread_id: "00000000-0000-0000-0000-000000000000",
    p_display_name: "audit",
  },
  match_users_by_phones: { p_phones: ["+820000000000"] },
  record_action_bin_event: {
    p_context_bin: "audit",
    p_action_key: "audit",
    p_event: "shown",
  },
  record_personalization_click: { p_session_id: "audit" },
  record_user_action_event: { p_session_id: "audit" },
  record_link_reopen: { p_session_id: "audit", p_link_id: "audit" },
  merge_guest_personalization: {
    p_session_id: "audit",
    p_user_id: "00000000-0000-0000-0000-000000000000",
  },
  rimvio_ensure_user_vault: {
    p_user_id: "00000000-0000-0000-0000-000000000000",
  },
  is_experience_bridge_host: {
    p_bridge_event_id: "audit",
    p_user_id: "00000000-0000-0000-0000-000000000000",
  },
  is_experience_bridge_member: {
    p_bridge_event_id: "audit",
    p_user_id: "00000000-0000-0000-0000-000000000000",
  },
};

async function probeRpc(name: string) {
  const args = RPC_STUBS[name] ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc(name, args);
  if (!error) return { name, ok: true as const, detail: "ok" };
  const msg = String(error.message || error.code || error);
  if (/does not exist|Could not find the function|PGRST202/i.test(msg)) {
    return { name, ok: false as const, detail: `MISSING: ${msg}` };
  }
  // Exists but rejected (auth/rls/validation) — still present in DB.
  return { name, ok: true as const, detail: `exists (${msg.slice(0, 120)})` };
}

async function main() {
  const tableResults = [];
  for (const name of [...tables].sort()) {
    tableResults.push(await probeTable(name));
  }
  const fnResults = [];
  for (const name of [...functions].sort()) {
    fnResults.push(await probeRpc(name));
  }

  const missingTables = tableResults.filter((r) => !r.ok);
  const missingFns = fnResults.filter((r) => !r.ok);

  const report = {
    ok: missingTables.length === 0 && missingFns.length === 0,
    meta: { ...meta, migrationFiles: files.length },
    tables: {
      expected: tableResults.length,
      ok: tableResults.filter((r) => r.ok).length,
      missing: missingTables,
    },
    functions: {
      expected: fnResults.length,
      ok: fnResults.filter((r) => r.ok).length,
      missing: missingFns,
    },
    checkedAt: new Date().toISOString(),
  };

  writeFileSync(
    "reports/supabase-schema-audit.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    `audit done → reports/supabase-schema-audit.json | tables ${report.tables.ok}/${report.tables.expected} | fns ${report.functions.ok}/${report.functions.expected} | missing_tables=${missingTables.length} missing_fns=${missingFns.length}`,
  );
  if (!report.ok) process.exitCode = 2;
}

void main();
