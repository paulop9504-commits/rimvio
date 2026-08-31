# Cursor Prompt — Rimvio Hub Dev Workspace Redesign

**Canonical spec:** [RIMVIO_DUAL_EXPERIENCE.md](./RIMVIO_DUAL_EXPERIENCE.md) · [RIMVIO_BUILDER_SPEC.md](./RIMVIO_BUILDER_SPEC.md) · ADR-058

**Implementation (Phase 1–2):** `components/hub/dev/` · `/hub` · `/hub/workspace`

---

## One-line task

Transform Rimvio Hub from **"Submit New Capability" wizard** into **Platform-first AI Dev Workspace** (Cursor-like). Do not restyle the old form — change the mental model.

---

## Non-negotiables

1. **First screen = "Build your Platform"** — not Package Information / Manifest forms.
2. **AI Build is the primary path** — natural language → Platform Blueprint → Create Platform.
3. **Manifest / Permissions / Context / Test / Publish are NOT deleted** — they live under **Capabilities → Configuration** and sidebar sections.
4. **No fake production metrics** — label Demo/Sandbox/Planned explicitly.
5. **Reuse existing spine** — `useHubPlatformWizard`, `hub-deploy-runtime`, `platform-sdk`, `planFromUtterance`, `capability-index`. No parallel registry/runtime.

---

## Layout (1280px+ desktop)

```
TOP: Rimvio | Platform | Development | Preview | Run | Deploy | Publish | ⌘K
LEFT: Platform nav (Overview, AI Build, Capabilities, Data, Workflows, Runtime, …)
CENTER: AI Build | Capability detail | Configuration | Tests | Deploy
RIGHT: AI Chat + Live Preview (Demo labeled) | Publish inspector
```

---

## User mental model shift

| Before | After |
|--------|-------|
| "Which form do I fill first?" | "I tell AI what I want to build." |
| Submit Capability | Build / Open Platform |
| 6-step wizard as home | OsakaStay → AI Build → graph nav |

---

## Implementation phases (do not skip order)

1. ✅ Shell + routes (`/hub`, `/hub/workspace`, redirects from `/hub/submit/*`)
2. ✅ AI Build + Blueprint (OsakaStay via `lib/hub/dev/blueprint.ts`)
3. ✅ Wire Capability list + Configuration (manifest/permissions/context steps)
4. ✅ Capability-scoped JSON Diff → Apply (`lib/hub/dev/capability-patch.ts`)
5. ✅ Live Preview → Platform Host sandbox invoke (`lib/hub/dev/sandbox-preview.ts`)
6. ✅ Agent Simulation test trace (`hub-dev-agent-simulation.tsx`)
7. ✅ Workflow node UI (`hub-dev-workflow-editor.tsx`)
8. Runtime / Logs (real APIs only)
8. Deploy / Publish → registry (existing `publishPlatform`)

---

## AI safety

| Action | Gate |
|--------|------|
| Read / plan | Auto |
| Code / workflow patch | Diff → Apply |
| Permission expand | Explicit approval |
| Deploy / Publish / Payment | Explicit approval |

---

## Reference utterance (acceptance)

Dev: *"호텔 예약 플랫폼을 만들어줘. 난바역 검색·예약·결제. 결제 전 사용자 확인."*

→ Blueprint: OsakaStay, hotel.search … payment.commit, Prepare/Commit gates  
→ Live Preview (demo)  
→ Publish → Registry → Agent can discover capabilities

---

## PR reject

- Submit Capability as landing page
- Light SaaS dashboard-only redesign of old wizard
- Parallel agent/registry packages
- Fake request/latency numbers without data source
