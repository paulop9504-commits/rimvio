/**
 * Verify SQL 13→14→15 (migrations 055–057) on remote Supabase.
 * Requires SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL in .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/u)) {
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
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ??
  supabaseUrl?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ??
  null;

const COLUMNS_13 = [
  "trade_status",
  "meet_at",
  "meet_place_label",
  "meet_lat",
  "meet_lng",
  "schedule_candidates",
] as const;
const COLUMNS_14 = [
  "meet_mode",
  "guest_share_location",
  "guest_lat",
  "guest_lng",
  "guest_location_at",
] as const;
const COLUMNS_15 = ["preferred_meet_at", "scheduling_expires_at"] as const;
const COLUMNS_16 = ["preferred_meet_date"] as const;

async function runQuery(query: string): Promise<unknown> {
  if (!token || !projectRef) {
    throw new Error("missing token or project ref");
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text.slice(0, 800));
  }
  return JSON.parse(text) as unknown;
}

function checkMigration(name: string, required: readonly string[], found: Set<string>) {
  const missing = required.filter((column) => !found.has(column));
  return { name, ok: missing.length === 0, missing, found: required.filter((c) => found.has(c)) };
}

async function main() {
  if (!token) {
    console.log("❌ SUPABASE_ACCESS_TOKEN 없음 (.env.local)");
    process.exit(1);
  }
  if (!projectRef) {
    console.log("❌ project ref 없음");
    process.exit(1);
  }

  const tableCheck = (await runQuery(`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'market_alignment_handshakes'
    ) as table_exists;
  `)) as { table_exists?: boolean }[];

  const tableExists = tableCheck[0]?.table_exists === true;
  if (!tableExists) {
    console.log(`\nProject: ${projectRef}`);
    console.log("❌ market_alignment_handshakes 테이블 없음 — 11번 handshake SQL부터 필요\n");
    process.exit(1);
  }

  const allColumns = [...COLUMNS_13, ...COLUMNS_14, ...COLUMNS_15];
  const colList = allColumns.map((c) => `'${c}'`).join(", ");
  const cols = (await runQuery(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'market_alignment_handshakes'
      and column_name in (${colList})
    order by column_name;
  `)) as { column_name: string }[];

  const found = new Set(cols.map((row) => row.column_name));

  const constraints = (await runQuery(`
    select pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'market_alignment_handshakes'
      and c.conname = 'market_alignment_handshakes_trade_status_check';
  `)) as { def?: string }[];

  const def = constraints[0]?.def ?? "";
  const m13 = checkMigration("13 / 055 market-trade-session", COLUMNS_13, found);
  const m14 = checkMigration("14 / 056 market-trade-host-mode", COLUMNS_14, found);
  const m15 = checkMigration("15 / 057 market-trade-schedule-v1", COLUMNS_15, found);
  const m16 = checkMigration("16 / 058 market-trade-schedule-v2", COLUMNS_16, found);
  const hasEnRoute = def.includes("en_route");
  const hasExpired = def.includes("expired");
  const hasBuyerPickedDay = def.includes("buyer_picked_day");
  const hasSellerProposed = def.includes("seller_proposed");

  console.log(`\n=== Market trade migrations (${projectRef}) ===\n`);
  for (const row of [m13, m14, m15, m16]) {
    console.log(`${row.ok ? "✅" : "❌"} ${row.name}`);
    if (row.missing.length > 0) {
      console.log(`   missing: ${row.missing.join(", ")}`);
    }
  }
  console.log(`${hasEnRoute ? "✅" : "❌"} trade_status check includes en_route (14)`);
  console.log(`${hasExpired ? "✅" : "❌"} trade_status check includes expired (15)`);
  if (def) {
    console.log(`   constraint: ${def}`);
  } else {
    console.log("❌ trade_status check constraint not found");
  }

  console.log(`${hasBuyerPickedDay ? "✅" : "❌"} trade_status check includes buyer_picked_day (16)`);
  console.log(`${hasSellerProposed ? "✅" : "❌"} trade_status check includes seller_proposed (16)`);

  const allOk =
    m13.ok &&
    m14.ok &&
    m15.ok &&
    m16.ok &&
    hasEnRoute &&
    hasExpired &&
    hasBuyerPickedDay &&
    hasSellerProposed;
  console.log(allOk ? "\n✅ 13 → 16 모두 적용됨\n" : "\n❌ 미적용 migration 있음 — sql-editor 13→16 순서로 실행\n");
  process.exit(allOk ? 0 : 1);
}

void main();
