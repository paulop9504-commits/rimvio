# Rimvio Materialization — Device index + Personal Vault sync

> **Status:** Phase 2 (2026-06)  
> **Logical SSOT:** EventCandidate + `feedCaptures` metadata (unchanged)  
> **Device layer:** materialized index + sync queue (not a second event store)

---

## Stack split (Rimvio interpretation)

```text
┌─ Device (SQLite / IndexedDB mirror) ──────────┐
│  capture_index: file_hash, taken_at, geohash  │
│  vault_sync_queue: pending → encrypt + sync   │
│  → fast dedupe · offline · thousands scan     │
└───────────────────┬───────────────────────────┘
                    │ encrypt + sync (online)
┌─ Cloud (Personal Vault) ──────────────────────┐
│  user_vault_objects (encrypted JSON blobs)    │
│  personal-vault bucket (original media)       │
│  Postgres RLS per user_id                     │
└───────────────────────────────────────────────┘
                    ▲
         EventCandidate (logical SSOT)
         semanticTriples (read projection)
         semanticMainHint (UI 1장)
```

| Layer | Role | v1 implementation |
|-------|------|-------------------|
| **Device** | Index + queue only | IndexedDB `rimvio-materialize` (PWA); `schema.sql` for Capacitor SQLite |
| **Vault** | Encrypted mirror + media | Phase 1 schema + `/api/vault/*` |
| **Postgres** | Tenant boundary | `user_id` RLS — not physical DB-per-user |

---

## Modules

| Path | Role |
|------|------|
| `lib/materialize/schema.sql` | SQLite DDL (Capacitor Phase 2) |
| `lib/materialize/materialize-db.ts` | IndexedDB mirror of capture_index + queue |
| `lib/materialize/index-from-media-context.ts` | Upsert + dedupe by `file_hash` |
| `lib/materialize/enqueue-vault-sync.ts` | Queue encrypted vault mirror jobs |
| `lib/materialize/flush-vault-sync-client.ts` | Online drain → Personal Vault |
| `lib/materialize/materialize-after-media-save.ts` | Hook from media stores |
| `hooks/use-materialize-vault-sync.ts` | Login + interval + online flush |
| `components/materialize-vault-sync-mount.tsx` | AuthGate invisible mount |

Wiring:

- `saveMediaSpacetimeContext` → index row + capture metadata queue
- `saveMediaBlob` → hash + full capture + media_blob queue

---

## Sync flow

1. Local save → `capture_index` row (`local` → `queued`)
2. Logged in + online → `flushVaultSyncQueue`
3. **capture** kind → `PUT /api/vault/objects` (encrypted metadata inline)
4. **media_blob** kind → signed upload → `PUT` with `storagePath` + encrypted metadata
5. Row → `synced`; queue item → `done`

EventCandidate upserts are **not** replaced — vault holds encrypted mirrors for recall/backup.

---

## Forbidden

- Treating SQLite/IndexedDB index as life-event SSOT
- Skipping dedupe (`file_hash` unique per device)
- Plaintext vault payloads
- Physical DB-per-user in v1

---

## Tests

```bash
npx tsx scripts/test-materialize-index.ts
```

Included in `npm run test:personal-read-model`.
