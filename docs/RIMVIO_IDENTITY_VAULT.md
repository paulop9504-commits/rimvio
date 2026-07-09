# Rimvio Identity Vault — Travel credentials for Hub booking

> **Status:** locked 2026-07-09 · Phase 1 (schema + Hub slot mapping)  
> **Storage:** `user_vault_objects` encrypted inline (Personal Vault)  
> **Related:** [RIMVIO_PERSONAL_VAULT.md](./RIMVIO_PERSONAL_VAULT.md) · [GLOBE_HUB_RESOURCE.md](./GLOBE_HUB_RESOURCE.md)

---

## One line

**여권·운전면허·연락처**는 사용자 단위 Identity Vault에 한 번 저장하고, **Hub 예매(flight · rental_car · lodging · ticket)** 마다 **슬롯 참조**로 끼운다.  
**주민번호는 기본 풀에 없음** — 법적 필수 Hub + explicit opt-in만 `identity_sensitive_national_id`.

---

## Layer boundary

| Layer | Holds | Never holds |
|-------|--------|-------------|
| **Identity Vault** | PII credentials (encrypted) | Context ranking · Globe pins |
| **ContextResource** | Committed lodging/flight file | Raw passport number in metadata |
| **HubActionRecord** | `identityRefs` (vault keys only) | Full passport / RRN plaintext |

Globe chat · Operator · External AI: **no vault plaintext** (`RIMVIO_EXTERNAL_GLOBE_AI.md`).

---

## Vault object kinds

| `kind` | `object_key` | Payload |
|--------|--------------|---------|
| `identity_traveler_profile` | `identity:traveler:primary` | Legal / romanized name, DOB, gender, nationality |
| `identity_passport` | `identity:passport:primary` | Number, country, expiry |
| `identity_driver_license` | `identity:driver_license:primary` | Number, country, expiry, class |
| `identity_contact` | `identity:contact:primary` | Phone, email, emergency |
| `identity_sensitive_national_id` | `identity:sensitive_national_id:primary` | **Opt-in only** — RRN etc. |

Code SSOT: `lib/identity-vault/`

---

## Hub slot registry

| Hub | Required slots | Notes |
|-----|----------------|-------|
| `flight` | traveler, passport, contact | Passport expiry warning < 6mo |
| `rental_car` | traveler, driver_license, contact | International → passport optional |
| `lodging` | traveler, contact | No passport |
| `ticket` | — | Ingest-first; vault **suggests** only |

`buildHubBookingIdentity()` maps vault payloads → partner form fields + `HubIdentityRefs` for `reserve` / `purchase` logs.

---

## Opt-in sensitive ID

- Not listed in default Identity settings UI.
- `isLegalSensitiveIdHub(hubId)` must be true **and** user must have `identity_sensitive_national_id` object.
- PR reject: RRN in `identity_traveler_profile` or default pool validators.

---

## L5 / Commit

Vault **store** ≠ booking **Commit**.  
`reserve` / `purchase` still require user approval; identity refs attach at execute time.

---

## PR check

1. New Hub booking path calls `buildHubBookingIdentity` or passes `identityRefs` — not inline PII in action log  
2. No passport/RRN in `EventCandidate` metadata plaintext  
3. Masking in telemetry (`maskIdentityField`)  
4. RRN only via `identity_sensitive_national_id` + legal hub gate
