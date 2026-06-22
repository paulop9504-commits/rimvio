#!/usr/bin/env npx tsx

import { runTrendBridgeRollupBatch } from "../lib/globe/trend-bridge/server/run-trend-bridge-rollup-batch";
import { createServiceRoleClient } from "../lib/supabase/admin";

async function main() {
  const admin = createServiceRoleClient();
  if (!admin) {
    console.error("SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }

  const result = await runTrendBridgeRollupBatch(admin, {
    minContributors: 5,
    lookbackDays: 90,
  });

  console.log(`trend-bridge-rollup: upserted=${result.upserted} skipped=${result.skipped}`);
}

void main();
