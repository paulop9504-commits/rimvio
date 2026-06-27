# Supabase SQL Editor — **mirror only**

> **SSOT:** `supabase/migrations/` — see [docs/SUPABASE_MIGRATIONS.md](../../docs/SUPABASE_MIGRATIONS.md)

These files exist for Dashboard copy-paste ergonomics.  
**Never apply schema changes here without adding the matching `migrations/NNN_*.sql` first.**

## Mapping

| sql-editor | migrations |
|------------|------------|
| `01` … `20` | `038` … `062` (see `scripts/verify-migration-ssot.mjs`) |
| `99-verify-experience-bridge.sql` | verification only — keep in Dashboard Private |

## Apply

```bash
npm run db:apply
# or single file:
npx supabase db query --linked --yes -f supabase/migrations/062_market_trade_post_bootstrap.sql
```

Verify: `node scripts/verify-migration-ssot.mjs`
