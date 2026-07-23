# ADR-023: Context Compiler — Reality Parser (not NL→JSON)

**Status:** accepted 2026-07  
**Wire:** `lib/context-run/natural-language-pipeline.ts` · `lib/context-run/run-natural-language-pipeline.ts` · `lib/graph-command/` · `lib/context-workspace/` · `lib/action-planner/`  
**Related:** ADR-013 · ADR-021 · ADR-022 · Article 0

## One sentence

**Rimvio Parser = Context Compiler:**  
자연어 → 현실 의도 → Context Graph → 실행 가능한 Reality Action → (승인 후) Reality Commit.

LLM 슬롯 필러가 아니라 **현실을 이해하는 컴파일러**. 해자는 LLM이 아니라 **Parser + Context Graph + Commit**.

## Cursor ↔ Rimvio (locked)

| | Cursor | Rimvio |
|---|--------|--------|
| 대상 | 코드 | **현실** |
| Parser | Code Parser | **Reality / Context Compiler** |
| 노드 | 파일 · 함수 | 장소 · 사람 · 경험 · 시간 |
| 관계 | Dependency | **Context Relationship** |
| 작업 표면 | IDE | **2D Context Workspace** |
| 실행 | 코드 수정 | Reality Action (prepare) |
| Commit | Git Commit | **Reality Commit** |

```
Cursor:  자연어 → 코드 구조 → 실행 가능한 수정 → Git Commit
Rimvio:  자연어 → 현실 의도 → Context Graph → Reality Action → Reality Commit
```

## Compiler stages (product names → wire)

기존 `NL_PIPELINE_STAGES`가 실행 순서 SSOT. 아래는 **의미 층** — 새 병렬 파이프라인을 만들지 말 것.

| # | Product stage | Owns | Wire today | Ship note |
|---|---------------|------|------------|-----------|
| 1 | **Intent Parser** | Goal · Hidden intent · Emotion · Constraint | `intent_parser` · `classify-intent-family` · `parse-graph-commands` | Soft intent graph beyond family — expand in place |
| 2 | **Entity Parser** | Place · Person · Activity · Experience | `entity_resolver` | Globe/Workspace nodes — not chat lists |
| 3 | **Temporal Parser** | date · period · duration · participants | `context_builder` · context fields | First-class Time Context object |
| 4 | **Preference Parser** | User preference vector (food · luxury · crowd…) | learning rollup · archive ranking (Action OS) | Same utterance → different graph per person |
| 5 | **Relationship Parser** | edges: near · route · photo · bookable | Session graph · Workspace · Diff | **검색 → 관계 생성** (list dump 금지) |
| 6 | **Reality Planner** | Action plan · tool IR | `action_planner` · `tool_router` · `graph_command_ir` | Prepare only |
| 7 | **Reality State** | now · weather · inventory · FX | context pack · discovery inventory | Compile-time world snapshot |
| 8 | **Commit Engine** | Human approval → Reality mutation | `reality_commit` · Workspace Swipe · Field | Article 0 |

```
사용자 입력
  → Intent → Entity → Temporal → Preference
  → Relationship (Context Graph)
  → Reality State + Reality Planner
  → Workspace Patch (편집) | prepare
  → Commit Engine (승인)
  → Reality Graph / Capsule / Forest
```

## Output shape (compiler IR — not chat essay)

```json
{
  "context": "데이트 여행",
  "intent": {
    "goal": "여행 경험 생성",
    "hidden": ["휴식", "발견", "맛집"],
    "emotion": { "expectancy": 0.8 }
  },
  "entities": [
    { "type": "person", "relation": "girlfriend" },
    { "type": "location", "value": "서울" }
  ],
  "time": { "period": "weekend" },
  "preference": { "romantic": 0.9, "crowdAvoidance": 0.6 },
  "constraints": { "budget": "unknown" },
  "actions": ["search_place", "generate_route", "check_reservation"],
  "graph": { "nodes": [], "edges": [] },
  "reality": { "asOf": "…", "weather": null, "inventoryHints": [] }
}
```

이 IR이 **Workspace Patch / Graph Command / Capsule**의 입력이다.  
Assistant 장문은 부산물 — SSOT 아님.

## Anti-patterns (reject)

| ❌ | ✅ |
|----|----|
| NL → 평탄 JSON 슬롯만 | NL → Intent Graph + Context Graph |
| 호텔/맛집 **리스트 dump** | **관계 그래프** (거리 · 동선 · 예약) |
| LLM이 Intent+Entity+Commit 한 방에 | Stage 순서 · Commit 분리 |
| 모든 사용자 동일 추천 | Preference Vector로 그래프 분기 |
| 파서 = 새 UI 제품 명사 폭격 | Always One New Concept · wire는 stage |

## Progressive disclosure

한 화면에 Intent Graph · Preference Vector · Ontology를 가르치지 않는다.

| Moment | User learns |
|--------|-------------|
| 한 문장 | 말이 Workspace / Capsule을 만든다 |
| 편집 | 관계가 살아 움직인다 |
| Commit | 내 승인만 Reality를 바꾼다 |

## Ship order (do not boil ocean)

1. **Keep** `NL_PIPELINE_STAGES` order — no second compiler  
2. **Harden** Intent + Entity + Temporal into one Context Pack IR ← **`lib/context-compiler/` · `ContextPackV1.compilerIr`**  
3. **Relationship edges** in Workspace / Session graph ← **`relationshipEdges` · `deriveWorkspaceRelationshipEdges`**  
4. **Preference vector** from archive rollup → MAIN / Workspace rank  
5. **Reality State** slice (weather · stay inventory) at plan time  
6. Capsule Resume consumes same IR

## Test

`npx tsx scripts/test-context-compiler.ts` · `npm run test:context-workspace`
