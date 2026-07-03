# ADR 002: Archive server sync — frozen

**Status:** Frozen (2026-07)  
**Spine rule:** `.cursor/rules/action-os-spine.mdc`

## Context

Archive fold + learning rollup exist client-side (`lib/archive/*`). Spine pillar 4 requires rollup → MAIN ranking, but only on the client today.

## Decision

**Do not implement** server-side archive sync until the Context → @ Registry → Proactive prep vertical slice ships end-to-end.

- Client-only archive store remains SSOT for fold + rollup scores.
- No Life Replay UI, no server sync API, no cross-device archive merge in this phase.
- MAIN resolver may read `learning-rollup-store` locally only.

## Consequences

- PWA / multi-device users see archive learning per browser until a future sync ADR.
- PRs adding Supabase archive tables or sync jobs should be rejected under spine freeze.
