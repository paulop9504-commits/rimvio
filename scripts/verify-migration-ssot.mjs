#!/usr/bin/env node
/**
 * Ensures supabase/migrations/ is the SSOT — sql-editor/*.sql must mirror or be archived.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(ROOT, "supabase", "migrations");
const sqlEditorDir = path.join(ROOT, "supabase", "sql-editor");

/** sql-editor stem → migrations filename (when names differ). */
const ALIASES = new Map([
  ["01-experience-bridge-core", "038_experience_bridge.sql"],
  ["02-experience-bridge-contributions", "041_experience_bridge_contributions.sql"],
  ["03-experience-bridge-media-storage", "042_experience_bridge_media_storage.sql"],
  ["04-experience-bridge-contribution-delete", "043_experience_bridge_contribution_delete.sql"],
  ["05-user-personal-vault", "046_user_personal_vault.sql"],
  ["06-user-personal-vault-fix", "047_fix_vault_objects_rls.sql"],
  ["07-bridge-contribution-spacetime", "048_bridge_contribution_spacetime.sql"],
  ["08-trend-bridge-anonymous", "049_trend_bridge_anonymous.sql"],
  ["09-market-intents", "050_market_intents.sql"],
  ["10-market-intent-detail", "051_market_intent_detail_json.sql"],
  ["11-market-alignment-handshakes", "052_market_alignment_handshakes.sql"],
  ["12-market-handshake-completion", "053_market_handshake_completion.sql"],
  ["12-user-profile-decor", "054_user_profile_decor.sql"],
  ["13-market-trade-session", "055_market_trade_session.sql"],
  ["14-market-trade-host-mode", "056_market_trade_host_mode.sql"],
  ["15-market-trade-schedule-v1", "057_market_trade_schedule_v1.sql"],
  ["16-market-trade-schedule-v2", "058_market_trade_schedule_v2.sql"],
  ["17-market-trade-cancel", "059_market_trade_cancel.sql"],
  ["18-market-trade-chat-status", "060_market_trade_chat_status.sql"],
  ["19-market-trade-orphan-scheduling", "061_market_trade_orphan_scheduling.sql"],
  ["20-market-trade-post-bootstrap", "062_market_trade_post_bootstrap.sql"],
]);

const IGNORE = new Set([
  "README.md",
  "RUN-MARKET-ALL.sql",
  "99-verify-experience-bridge.sql",
]);

function normalizeSql(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/--[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function migrationFiles() {
  return new Set(
    readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.toLowerCase()),
  );
}

const migrations = migrationFiles();
const sqlEditorFiles = readdirSync(sqlEditorDir).filter(
  (f) => f.endsWith(".sql") && !IGNORE.has(f),
);

const missing = [];
const drift = [];

for (const file of sqlEditorFiles) {
  const stem = file.replace(/\.sql$/i, "");
  const alias = ALIASES.get(stem);
  const expectedName =
    alias ??
    (() => {
      const num = stem.match(/^(\d+)/)?.[1];
      if (!num) return null;
      const match = [...migrations].find((m) => m.startsWith(`${num.padStart(3, "0")}_`));
      return match ?? null;
    })();

  if (!expectedName) {
    missing.push(`${file} → no migrations mapping`);
    continue;
  }

  if (!migrations.has(expectedName.toLowerCase())) {
    missing.push(`${file} → missing migration ${expectedName}`);
    continue;
  }

  const editorSql = readFileSync(path.join(sqlEditorDir, file), "utf8");
  const migrationSql = readFileSync(path.join(migrationsDir, expectedName), "utf8");
  const editorNorm = normalizeSql(editorSql);
  const migrationNorm = normalizeSql(migrationSql);

  if (!migrationNorm.includes(editorNorm.slice(0, Math.min(editorNorm.length, 120)))) {
    drift.push(`${file} ↔ ${expectedName} (content may differ — review manually)`);
  }
}

let failed = false;
if (missing.length > 0) {
  failed = true;
  console.error("migration-ssot: missing mappings\n" + missing.map((m) => `  - ${m}`).join("\n"));
}
if (drift.length > 0) {
  console.warn("migration-ssot: review drift\n" + drift.map((m) => `  - ${m}`).join("\n"));
}

if (failed) {
  process.exit(1);
}

console.log(
  `migration-ssot: ok (${sqlEditorFiles.length} sql-editor files mapped to supabase/migrations/)`,
);
process.exit(0);
