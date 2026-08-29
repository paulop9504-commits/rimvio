# Rimvio Agent — 100 Capabilities

**SSOT (code):** `lib/hub/dev/agent-capability-registry.ts`  
**Architecture:** `docs/HUB_PLATFORM_AGENT.md`

## Core flow

```text
User NL
  → Intent / Goal                    (A: 1–10)
  → Platform Reasoning               (B: 11–20)
  → Context / Code Discovery         (C: 21–30)
  → Platform Planning                (D: 31–40)
  → Platform Mutation                (E: 41–50)
  → Coding Agent                     (F: 51–60)
  → Build / Test / Debug             (G: 61–70)
  → Self-Repair Loop                   (H: 71–80)
  → Runtime / Preview / Browser      (I: 81–90)
  → Change / Safety / Publish        (J: 91–100)
```

## Rimvio vs Cursor

| Cursor | Rimvio |
|--------|--------|
| Repository → Code → Test | Platform → Capability → Workflow → Schema → relevant code → Test |
| Code Agent first | **Platform Reasoning first**, Coding Agent as sub-layer |
| File tree center | **Platform Blueprint center**, File tree secondary |

## Context narrowing (mandatory)

```text
Goal → Platform → Capability → Dependency → Relevant Files → Symbols → Code
```

Never load full repository into LLM context.

## Implementation phases (product priority)

| Phase | Focus | Key IDs |
|-------|-------|---------|
| **1** | Intent + Platform understand + Discovery + Plan | 1–4, 6, 11–14, 21–24, 29, 31–32, 39 |
| **2** | Platform + Code mutation hands | 41–47, 51–52, 54, 57, 60 |
| **3** | Test + Self-repair loop | 61, 63, 66, 69–70, 71–76, 79 |
| **4** | Eyes (Preview / Browser) | 81, 83–90 |
| **5** | Trust (Diff / Undo / Publish) | 91–100 |

Run coverage: `npx tsx scripts/test-agent-capability-registry.ts`

## Current snapshot (approx.)

- **Phase 1:** Conversation Gate ✅ · Platform Goal 🟡 · Discovery 🟡 · Planning 🟡
- **Phase 2:** capability/schema/workflow tools ✅ · coding sandbox 🟡
- **Phase 3:** observe/act 🟡 · verify/repair skeleton
- **Phase 4–5:** events/approval partial · undo/preview agent pending

## Hub Creator experience

Hub Workspace (`/hub/workspace`) = Creator Studio.  
Agent Home (`/`) = discovery / goal framing.  
Same Agent Loop; different ingress surface.
