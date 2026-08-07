# ADR-053: Command Verb → Intent Router (Reality Graph ops)

**Status:** accepted 2026-08 (Phase 2 synonyms + leafHint shipped)  
**Wire:** extends `lib/rimvio-command/` · ADR-035 pipe · Agent Runtime (ADR-045 · 050)  
**Related:** ADR-011 · ADR-012 · ADR-021 · ADR-023 · ADR-035 · Article 0 · UX Constitution  
**Phase 2:** `action-verb.ts` synonyms · `resolve-leaf-hint.ts` · `resolve-command-ir.ts` · `product-verb-family.ts` · `scripts/test-action-verb.ts`

## One sentence

> **동사 = Reality Graph에 대한 작업 Intent**이다. NLP 키워드나 chat essay SSOT가 아니다.  
> Product taxonomy(CREATE · DISCOVER · …)는 **ADR-035 ActionVerb 위의 UX/학습 레이어**이며, 코드 SSOT는 여전히 14 `ActionVerb` + 5 `CommandTarget` + `IntentFamily`이다.

## Problem

제품 동사 체계(만들어 · 찾아줘 · 빼줘 · 알아서 해 …)가 Agent Runtime 입구에 **한 줄로 고정**되지 않아:

1. 같은 동사가 free-talk / small_talk / workspace agent 중 어디로 새는지 경로마다 다름  
2. 「보여줘」가 Projection(맵 오버레이)인지 Information(chat)인지 경쟁  
3. 「빼줘」가 `cancel`/`edit`/`remove event` 중 어디로 가는지 모호  
4. EXECUTE 계열이 Commit Gate 없이 LLM essay로 빠질 위험

ChatGPT 스타일 “텍스트 답변 = SSOT”를 반복하면 Cursor isomorphism(ADR-013 · 021)이 깨진다.

## Decision

### Layer stack (do not invent a parallel pipe)

```
User utterance
    ↓
① classifyActionVerb          → ActionVerb (14)          [ADR-035 SSOT]
    ↓
② ProductVerbFamily (alias)   → CREATE|DISCOVER|…       [this ADR — optional UX/docs]
    ↓
③ resolveCommandTarget        → CommandTarget (5)       [state-aware]
    ↓
④ resolveIntentFromActionVerb → IntentFamily            [tool / soft / commit]
    ↓
⑤ routeRimvioCommandMode      → create|continue|execute
    ↓
⑥ Agent Runtime leaf          → Task Graph · Patch · Projection
    ↓
⑦ Commit Gate                 → Reality (예약·결제만 Field)
```

**Forbidden:** 두 번째 “Ultimate Verb Parser” 스택을 `NL_PIPELINE_STAGES` / Globe Ingress / ADR-035 옆에 새로 세우는 것.

### Product taxonomy ↔ ActionVerb (canonical map)

| Product family | 대표 L1 동사 | ActionVerb (SSOT) | IntentFamily bias | Commit |
|----------------|-------------|-------------------|-------------------|--------|
| **CREATE** | 만들어 · 짜줘 · 구성해 · 설계해 · 계획해 · 세팅해 | `create` · `prepare` | Create · Prepare | soft / graph |
| **DISCOVER** | 찾아줘 · 보여줘 · 추천해 · 알려줘 · 탐색해 · 찾아봐 · 확인해 | `search` | Search · Filter · (overlay leaf) | none |
| **ANALYZE** | 분석해 · 평가해 · 검토해 · 비교해 · 정리해 · 파악해 · 판단해 · 계산해 | `analyze` · `decision` | Analyze · Compare · Predict | none |
| **MODIFY** | 바꿔 · 수정해 · 변경해 · 옮겨 · 추가해 · 삭제해 · 빼줘 · 넣어줘 | `edit` · `cancel` · `move`* | Revise · Delete · Move | soft chip |
| **OPTIMIZE** | 최적화해 · 줄여줘 · 늘려줘 · 맞춰줘 · 개선해 · 효율화해 | `edit` + constraint tag **or** `analyze`→Simulate | Revise · Simulate | soft |
| **EXECUTE** | 예약해 · 주문해 · 결제해 · 신청해 · 공유해 · 보내줘 | `book` · `share` · `action` | Reserve · Purchase · Share | **Field / Commit** |
| **MEMORY** | 저장해 · 기억해 · 기록해 · 이어줘 · 불러와 | `memory` · `resume` | Pin · Note · Continue mode | soft |
| **SIMULATE** | 시뮬레이션해 · 예상해 · 가정해 · 테스트해 | `analyze` | Simulate · Predict | none (ghost patch) |
| **MANAGE** | 정리해 · 묶어줘 · 나눠줘 · 이름 붙여줘 · 숨겨줘 · 열어줘 · 닫아줘 | `prepare` · `edit` · `resume` | Group · Ungroup · Filter · Pin | soft |
| **DELEGATE** | 알아서 해 · 맡길게 · 진행해 · 계속해 · 이어서 해 · 처리해 · 준비해줘 | `auto` · `action` · `resume` · `prepare` | Continue + Task Graph | soft until EXECUTE leaf |

\* `옮겨` spatial vs schedule move → Target decides (`current_workspace` schedule vs `move` navigate).

### Semantic law (noun ↔ object, verb ↔ op)

```
"난바 근처 맛집 찾아줘"
  Location Object  = 난바 (anchor)
  Entity Object    = 맛집 (type)
  ActionVerb       = search
  Target           = current_context | current_workspace
  Output           = Workspace Patch + Callout + edges  (NOT essay SSOT)
```

| Do | Don’t |
|----|-------|
| Verb → Graph / Workspace / Projection op | Verb → chat paragraph as truth |
| Noun → Reality / session object bind | Noun → prompt filler only |
| EXECUTE → candidates → user approve → Commit | book/purchase silent API |
| DISCOVER `보여줘` + 노선도 → map overlay leaf | “직접 못 보여드립니다” LLM |

### Ambiguous verb disambiguation (required)

Same surface string, different leaf by **object + Target**:

| Utterance shape | Prefer | Leaf |
|-----------------|--------|------|
| (노선도\|메트로\|지하철) + (보여\|깔\|켜\|띄워) | DISCOVER / `search` | **map_overlay** (before free-talk) |
| (맛집\|호텔\|장소) + 보여줘 | DISCOVER / `search` | inventory · callout |
| (일정\|동선) + 보여줘 | DISCOVER / MANAGE | schedule projection |
| X 빼줘 (DayN / event named) | MODIFY / `edit`\|`cancel` | remove node + recompute |
| 예약 빼줘 / 취소 | EXECUTE undo / `cancel` | soft then reality if committed |
| 알아서 해 + trip | DELEGATE / `auto` | Task Graph, not one essay |

### Intent Router contract (code shape)

Extend ADR-035 types — do **not** replace:

```ts
// Conceptual — implementation may land as CommandIr / AgentJob scope
type CommandIr = {
  verb: ActionVerb;
  productFamily: ProductVerbFamily; // CREATE | DISCOVER | …
  target: CommandTarget;
  intentFamily: IntentFamily;
  mode: "create" | "continue" | "execute";
  objects: {
    location?: string;
    entityType?: string;
    artifactId?: string;
    eventRef?: string;
  };
  constraints?: Record<string, unknown>;
  commitPolicy: "none" | "soft_chip" | "field_commit";
  leafHint?:
    | "map_overlay"
    | "spatial_discovery"
    | "workspace_patch"
    | "task_graph"
    | "decision_layer"
    | "simulation"
    | "memory_resume";
};
```

Runtime rule: **leafHint wins over free-talk** when classifier confidence is high (deterministic regex / graph bind). LLM only fills slots inside an already chosen leaf.

### Commit Gate (Article 0)

| Product family | Default gate |
|----------------|--------------|
| CREATE · DISCOVER · ANALYZE · SIMULATE | none (Draft / Projection) |
| MODIFY · OPTIMIZE · MEMORY · MANAGE · DELEGATE | soft chip when graph mutates |
| EXECUTE (`book` · purchase · pay) | **Field Commit** — candidates first |

`저장해` on Context Capsule = MEMORY / soft — **not** Reality Ledger booking.

## Wire SSOT (unchanged + extensions)

| Concern | Path |
|---------|------|
| ActionVerb (14) | `lib/rimvio-command/action-verb.ts` |
| Target | `lib/rimvio-command/resolve-command-target.ts` |
| Verb→Intent | `lib/rimvio-command/action-verb-to-intent.ts` |
| Mode | `lib/rimvio-command/route-command-mode.ts` |
| Execute-plan cues | `lib/context-run/is-agent-execute-verb.ts` |
| Overlay before chat | `lib/context-run/try-apply-map-overlay-turn.ts` |
| ToolId | `lib/rule-engine/resolve-tool-id.ts` |
| IntentFamily · commit sets | `lib/rule-engine/constitution.ts` |

**Additive only:** `ProductVerbFamily` alias map + synonym coverage in `VERB_PATTERNS` + leafHint routing tests. No second classifier package.

## Verb coverage gaps (`action-verb.ts` audit)

Ship priority = fix deterministic miss before LLM absorbs utterance.

### Missing / weak CREATE

| Lexeme | Today | Gap |
|--------|-------|-----|
| 구성해 · 설계해 | often miss → null / search | add to `create` |
| 계획해 (alone) | partial via `계획` in create | OK; keep |
| 짜줘 | in create (`짜\s*줘`) | OK |
| 세워줘 | execute-verb path, not ActionVerb | wire: execute-verb ⇒ `create`/`prepare` verb when classifying |

### Missing / weak DISCOVER

| Lexeme | Today | Gap |
|--------|-------|-----|
| 탐색해 · 확인해 | miss | add to `search` |
| 찾아봐 | partial (`찾아(?:줘|봐)?`) | OK |
| 깔아줘 · 띄워줘 · 올려줘 · 켜줘 | **not** in ActionVerb | overlay leaf + optionally `search` projection synonym |
| 노선도 without city | needs Target + default region | keep overlay absorb / workspace region |

### Missing / weak ANALYZE · OPTIMIZE

| Lexeme | Today | Gap |
|--------|-------|-----|
| 평가해 · 검토해 · 파악해 · 판단해 · 정리해 | miss / `prepare`(정리) | analyze vs prepare disambiguate by object |
| 최적화해 · 줄여줘 · 늘려줘 · 맞춰줘 · 개선해 · 효율화해 | miss | add optimize synonym → `edit`+leafHint `task_graph` or `analyze`→Simulate |
| 비교해 | `decision` | OK |

### Missing / weak MODIFY

| Lexeme | Today | Gap |
|--------|-------|-----|
| 넣어줘 | miss (add is `추가`) | add to `edit` |
| 빼줘 | **`cancel`** first | DayN event remove must hit graph remove leaf, not only undo |
| 옮겨 | `move` | schedule vs navigate by Target |
| 변경해 | in `edit` | OK |

### Missing / weak EXECUTE · MEMORY · DELEGATE

| Lexeme | Today | Gap |
|--------|-------|-----|
| 신청해 · 주문해 | book / purchase partial | explicit `신청` → book/action |
| 저장해 vs Reality Commit | `memory` | document: never map 저장해→Reserve |
| 불러와 | `resume` | OK |
| 처리해 · 이어서 해 · 계속해 | `auto`/`resume`/`action` partial | unify DELEGATE → `auto` when no explicit book |
| 준비해줘 | `prepare` + execute-verb | DELEGATE vs CREATE by Target (active hub → continue prepare) |

### Pattern order hazards

`VERB_PATTERNS` is **first-match**. Current order: resume → cancel → auto → share → book → … → search → create.

| Hazard | Mitigation |
|--------|------------|
| 「빼줘」 always `cancel` | object-aware upgrade after target resolve (event remove vs undo) |
| 「보여줘」 always `search` | OK; leafHint map_overlay when transit keywords |
| 「정리해」 matches `prepare` before analyze | prefer `analyze` when object = itinerary/list “정리해 요약” |
| 「예상해」 in `analyze` with simulate | OK; SIMULATE product alias |

## Implementation phases (no big bang)

1. **Docs + map** — this ADR; ProductVerbFamily const + verb→family table (pure).  
2. **Synonym patch** — expand `VERB_PATTERNS` for CREATE/DISCOVER/OPTIMIZE/MODIFY gaps; tests.  
3. **LeafHints** — overlay · spatial_discovery · remove-event already exist → bind via CommandIr.leafHint.  
4. **DELEGATE Task Graph** — `auto` always continues + Execution Feed (no essay SSOT).  
5. **OPTIMIZE** — constrain Revise / Simulate only after graph exists.

## PR reject

- Parallel “Command Verb System v2” beside ADR-035  
- Product family enums driving ToolId **instead of** ActionVerb/IntentFamily  
- DISCOVER results only in assistant text  
- EXECUTE without Commit Gate  
- Treating 「보여줘」 always as chat information when transit/map objects present  
- Silent Ghost-style truth-log / site egress patterns  

## Accept criteria

- [ ] Product taxonomy documented as **alias** of 14 ActionVerbs (this ADR)  
- [ ] Gap list lexemes covered by classifier tests (`scripts/test-action-verb-*.ts` or extend mvp)  
- [ ] Map overlay utterances never free-talk refusal  
- [ ] `routeRimvioCommandMode` remains single Create|Continue|Execute gate  
- [ ] Article 0: book/purchase still Field Commit  

## See also

- ADR-035 RIMVIO Command (base pipe)  
- ADR-021 Cursor OS Spine · ADR-022 Workspace-first  
- ADR-023 Context Compiler  
- ADR-045 / 050 One Agent Runtime  
