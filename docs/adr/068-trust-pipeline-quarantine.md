# ADR-068: Trust Pipeline — Submit Open, Execute Closed

**Status:** accepted · 2026-08  
**Wire:** `lib/trust-pipeline/` · Hub Standards → Trust Pipeline  
**Related:** ADR-061 · ADR-063 · ADR-066

## One sentence

> Anyone may submit a Capability. Nothing runs until it survives quarantine, automated guard, sandbox, separated human review, staging, and canary. Review PASS is eligibility — not a production deploy grant.

## Lane

```
Producer → Submission → Quarantine
  → Automated Guard (schema / SAST / dep / secret / permission / policy)
  → Ephemeral Sandbox (network deny · secrets zero · no prod DB)
  → Human Review (Producer ≠ Reviewer · consensus)
  → TESTED → VERIFIED → Staging → Canary → Production (TRUSTED)
  → Monitoring → Auto disable / rollback
```

## Locked rules

1. **PASS ≠ Production.** Human PASS promotes to TESTED at most.
2. **VERIFIED ≠ Global.** VERIFIED unlocks Staging, then Canary, then TRUSTED.
3. **External producer start permission ≤ L1.** L5 never auto-executes.
4. **UNVERIFIED cannot call VERIFIED/TRUSTED.**
5. **Untrusted code never sees secrets or production DB.** Isolation beats scanner trust.
6. **CRITICAL / HIGH** findings block immediately.

## Out of scope

A full commercial SAST vendor. Guards here are deterministic Rimvio scanners plus fail-closed sandbox policy.
