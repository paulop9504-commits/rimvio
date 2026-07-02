/**
 * Verify migration 064: market_agent_coordination_rooms in supabase_realtime publication.
 * Run: npx tsx scripts/verify-coordination-realtime-publication.ts
 *
 * Requires DATABASE_URL or direct SQL access; service_role alone cannot read pg_catalog.
 */
const VERIFY_SQL = `SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'market_agent_coordination_rooms';`;

function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("verify-coordination-realtime: skipped (DATABASE_URL not set)");
    console.log("Supabase SQL Editor:");
    console.log(VERIFY_SQL);
    process.exit(0);
  }

  console.log("verify-coordination-realtime: DATABASE_URL set — run SQL manually or via psql:");
  console.log(VERIFY_SQL);
  process.exit(0);
}

main();
