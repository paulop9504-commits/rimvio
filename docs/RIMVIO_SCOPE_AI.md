# Rimvio Scope AI — Internal / External Doctrine

> **Canonical.** One page. Code gate: `lib/scope-ai/` · `resolveActivePinScope` · orchestrator scope stamp.  
> **Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · **Pin scope:** [RFC_UNIVERSAL_PIN_SYSTEM.md](./RFC_UNIVERSAL_PIN_SYSTEM.md)

---

## Thesis

Rimvio does **not** use one AI everywhere.

| Scope | User wants | AI is **not** | AI is |
|-------|------------|---------------|-------|
| **Internal** | “내 인생 대신 살지 마 — 도와줘” | Creator · life rewriter | **Guardian** |
| **External** | “좋은 걸 찾아줘 — 확장해줘” | nagging calendar bot | **Explorer** |

**Internal:** preserve user intent · surface what they would miss.  
**External:** expand intent · discover connections · compose flows from traces.

Same spine both sides:

```text
Signal → EventCandidate → right moment Surface
```

Internal = **Recall · Nudge · Preserve** onto Surface.  
External = **Discover · Connect · Compose · Achieve** across Surfaces.

Full spec: [RIMVIO_EXTERNAL_GLOBE_AI.md](./RIMVIO_EXTERNAL_GLOBE_AI.md)

---

## Internal — Guardian

**Slogan:** *Don't miss what matters.*

| Verb | Meaning | Examples |
|------|---------|----------|
| **Recall** | Right memory, right moment | 그때 거기 · relationship line · trip arrival |
| **Nudge** | Gentle, operable heads-up | 내일 병원 · 답장 안 함 · 준비물 · D-day |
| **Preserve** | Never override user intent | no life plan rewrite · no unsolicited “become X” |

**Surfaces:** Feed replay · Stack/Now · calendar horizon · peer prep · **private** globe trace.

**Engines (L3):** Recall Engine · event-horizon · proactive prep · orchestrator **internal** route.

**Forbidden on internal:** recommendation lists as hero · trace composition for strangers · intent override · Creator persona.

---

## External — Explorer

**Slogan:** *Discover what connects.*

| Verb | Meaning | Examples |
|------|---------|----------|
| **Discover** | Find others' traces near intent | 타인 흔적 · stack near tap · pioneer cell |
| **Connect** | Link people · place · time threads | gathering lineage · similar routes · @모임 |
| **Compose** | Merge experiences into one flow | N-day route from traces · not “맛집 100개” |

**Surfaces:** Globe external layer · `@` composer (gathering · travel overlay · market phase) · read-only external pin tap.

**Engines (L3):** external traces merge · domain classify · gathering/market compose ingress · orchestrator **external** route.

**Forbidden on external:** private-life nagging · rewriting user goals · Sentinel-style “you forgot” on others' data.

---

## Scope ↔ Pin (code)

```text
PinScope: internal | external     (lib/globe/pin-entity.ts)
globeContextVisibility: private | external
resolveActivePinScope(requested)  — phase gate P2+
Scope AI persona: guardian | explorer  (lib/scope-ai/)
```

| Phase | domain | scope | AI persona |
|-------|--------|-------|------------|
| P1 | experience | internal | Guardian |
| P2 | experience | external read | Explorer (discover) |
| P3+ | gathering… | external default | Explorer (connect · compose) |

**Law:** Personal and external copy/mode **never mixed on one surface** — [RIMVIO_STORY_LAYER.md](./RIMVIO_STORY_LAYER.md).

---

## Orchestrator routing (code gate)

Resolve scope **before** LLM enrichment (`buildOrchestratorPipelineBase`):

1. `pinScopeHint` from globe / pin sheet → wins  
2. `@` mention on external-default domain → `external`  
3. `composerContext` line `pin_scope: internal|external`  
4. Default chat / Feed / Stack → `internal`

Then `gateOrchestratorScopeAi(scope, message, chatAxis)` → `base.scopeAi`.

**Blocks (early decision):**

- **internal** + discovery hero → skip `PlaceRecommendation` fast path (meal axis exempt)
- **internal** + life plan → skip `FallbackRecovery` career/education
- **external** + schedule nudge → skip `GlobalReplan` · `VitalityState` · `ProactiveAssumption`

Metadata stamp on every orchestrator exit: `pin_scope`, `scope_ai_persona`, `scope_ai_blocked`.

**Globe → chat:** `lib/globe/globe-orchestrator-scope-bridge.ts` writes `sessionStorage` when a pin is open on `/globe`; `use-action-chat` sends `pinScopeHint` + `[globe-context]` composer block. Feed `?recallEvent=` fallback.

**Code:** `lib/scope-ai/` · `npm run test:scope-ai-gates` · `npm run test:globe-orchestrator-scope-bridge`

---

## PR review — Scope AI

Add to every PR that touches AI, globe visibility, or proactive surfaces:

- [ ] **Which scope?** `internal` or `external` (or both — must be split PRs if both)
- [ ] **Which verbs?** Internal only Recall · Nudge · Preserve / External only Discover · Connect · Compose
- [ ] **이 기능이 internal인데 Creator 행동을 하고 있지 않은가?**  
  (추천 리스트 히어로 · 인생/목표 재작성 · 의도 덮어쓰기 · unsolicited life plan)
- [ ] **이 기능이 external인데 Guardian 행동을 하고 있지 않은가?**  
  (개인 일정 잔소리 · private recall on shared trace)
- [ ] Truth path unchanged? `EventCandidate` commit — scope is metadata + routing, not a second store

---

## Cursor / agent header

```text
Scope AI: internal=Guardian (Recall·Nudge·Preserve) · external=Explorer (Discover·Connect·Compose)
Full spec: docs/RIMVIO_SCOPE_AI.md
```
