# Rimvio Personal Vault — Multi-tenant isolation & encrypted cloud

> **Status:** Phase 1 (2026-06) — foundation  
> **Tenant model:** `auth.users.id` = tenant boundary (logical isolation + strict RLS)  
> **Related:** [RIMVIO_PERSONAL_VAULT.md](./RIMVIO_PERSONAL_VAULT.md) · [RIMVIO_IDENTITY_VAULT.md](./RIMVIO_IDENTITY_VAULT.md)  

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Tenant = user_id (auth.users)                          │
├─────────────────────────────────────────────────────────┤
│  user_vaults          — quota · status · crypto scheme  │
│  user_vault_objects   — encrypted blobs + metadata      │
│  storage.personal-vault — private bucket {uid}/{objId}  │
└─────────────────────────────────────────────────────────┘
         ▲ RLS: auth.uid() = user_id ONLY
         ▲ Crypto: AES-256-GCM, key = H(VAULT_KEY || user_id)
```

**Not in v1:** physical DB-per-user, graph DB, staff admin read of plaintext.

**Shared (Bridge):** `experience-bridge` bucket stays **public read** for accepted participants — separate from personal vault.

---

## Phases

| Phase | Scope |
|-------|--------|
| **1 (now)** | Schema + RLS + private bucket + encrypt lib + `/api/vault` |
| **2 (now)** | Device materialization index + vault sync queue (`lib/materialize/`) |
| **3 (now)** | `life_event:{id}` vault snapshot on EventCandidate commit |
| **4** | Client-side DEK + zero-knowledge option; legacy table RLS tighten |

---

## Env

| Variable | Required prod | Role |
|----------|---------------|------|
| `VAULT_ENCRYPTION_KEY` | yes | Server envelope encryption (32+ char secret) |

Dev fallback mirrors integrations pattern (dev-only default).

---

## Modules

| Path | Role |
|------|------|
| `supabase/migrations/046_user_personal_vault.sql` | Tables · RLS · bucket |
| `lib/vault/encrypt-vault-payload.ts` | Per-user AES-GCM |
| `lib/vault/vault-server-store.ts` | DB + storage paths |
| `lib/identity-vault/` | Travel credentials · Hub slot mapping |
| `app/api/vault/route.ts` | ensure · list |
| `app/api/vault/objects/route.ts` | upsert encrypted object |
| `scripts/test-personal-vault.ts` | crypto + id regression |

---

## Forbidden

- Public read on `user_vault_*` tables
- Storing plaintext life events in vault without encryption
- Mixing personal vault objects into bridge public bucket
