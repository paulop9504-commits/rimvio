# Rimvio Agent — Capability Implementation Program

One capability = one engineering task. **No multi-capability PRs.**

## Per-capability checklist

- [ ] STEP A — Repository investigation
- [ ] STEP B — Contract (Input / Output / Errors / Events)
- [ ] STEP C — Architecture wiring diagram
- [ ] STEP D — Production implementation (no placeholder-as-done)
- [ ] STEP E — Unit + Integration + E2E tests
- [ ] STEP F — Failure cases
- [ ] STEP G — Agent Activity events (real only)
- [ ] STEP H — Manual Agent request verification
- [ ] Registry status update in `agent-capability-registry.ts`
- [ ] Completion report (CAPABILITY #N template)

## File layout

```text
lib/agent/capabilities/
  _contract.ts              shared types
  intent-understand/        Capability #1
    contract.ts
    understand-intent.ts    implementation
    index.ts
  goal-extract/             Capability #2 (next, blocked)
```

## Completion report template

```text
CAPABILITY #N — <Name>
Status: COMPLETE | PARTIAL | BLOCKED

Implemented: ...
Files: ...
Tests: Unit PASS | Integration PASS | E2E PASS
Failure cases: ...
Limitations: ...
Next: CAPABILITY #N+1
```

## Sprint order

Phase 0: Capabilities #1–#10 (Conversation / Intent)  
Phase 1: #11–#20 (Platform Understanding)  
… see `agent-capability-registry.ts`

**Rule:** Capability #N+1 starts only after #N is COMPLETE per checklist.
