# Supabase migrations — SSOT

**Single source of truth:** `supabase/migrations/*.sql`

`supabase/sql-editor/` is a **human-readable mirror** for Dashboard copy-paste only.  
Every change must land in `migrations/` first, then be copied or aliased in `sql-editor/`.

## Apply (production / linked remote)

```bash
# Preferred — Supabase CLI against linked project
npx supabase db push

# Fallback — Management API (when push blocked on legacy 001)
npm run db:apply
# or incremental (market trade 050–062):
npm run db:apply:market-trade
# or single migration:
npm run db:apply -- --from=062
```

## Verify SSOT

```bash
node scripts/verify-migration-ssot.mjs
```

CI runs this after migration changes.

## Adding a migration

1. Create `supabase/migrations/NNN_snake_case.sql` (next number after latest).
2. If Dashboard-friendly copy needed, add matching `supabase/sql-editor/NN-*.sql`.
3. Register alias in `scripts/verify-migration-ssot.mjs` if names differ.
4. Run `node scripts/verify-migration-ssot.mjs`.
5. Apply to remote: `npx supabase db query --linked --yes -f supabase/migrations/NNN_*.sql`

## Do not

- Apply schema only via sql-editor without a migrations file
- Edit applied migrations in place — add a new forward migration instead
- Rely on `db push` alone when remote predates migration 001 (use `db query -f` for deltas)
