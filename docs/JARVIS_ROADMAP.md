# Jarvis Roadmap — Rimvio Experience OS

12-week plan to evolve Rimvio from reactive Context OS into proactive Guardian (Jarvis-shaped) without breaking the constitution (deterministic-first, LLM fallback, Commit gate).

## Principles

- **Guardian** nudges; user **1-taps** to execute.
- **No omniscient LLM OS** — EventCandidate / Bridge recall only with evidence.
- **MORNING_LOOP** is the first killer proactive surface.

---

## Phase 1 — Weeks 1–2 ✅ (started)

**MORNING_LOOP → auto Prep Surface on unlock**

| Deliverable | Status |
|-------------|--------|
| `first_unlock` per-day store | ✅ `lib/morning-loop/first-unlock-store.ts` |
| Auto prep decision resolver | ✅ `lib/morning-loop/resolve-morning-auto-prep.ts` |
| Globe morning card overlay | ✅ `components/globe/globe-morning-prep-card.tsx` |
| Chat feed latent layer override | ✅ `components/action-chat-feed.tsx` |
| Tests | ✅ `scripts/test-morning-auto-prep.ts` |

**Verify:** Open rimvio.app in morning window (6–10) on a new day → Globe shows Jarvis briefing card + prep rows when calendar qualifies.

---

## Phase 2 — Weeks 3–4 ✅ (started)

**Event horizon push (1/day cap) + Jarvis copy SSOT**

| Deliverable | Status |
|-------------|--------|
| Guardian Jarvis copy SSOT | ✅ `lib/guardian-copy/jarvis-copy-ssot.ts` |
| Daily push cap (1/day) | ✅ `lib/event-horizon/daily-nudge-cap-store.ts` |
| Push resolver (outside chat) | ✅ `lib/event-horizon/resolve-event-horizon-push.ts` |
| Globe Guardian push card | ✅ `components/globe/globe-event-horizon-push-card.tsx` |
| Chat nudge uses SSOT | ✅ `orchestrate-proactive-nudge.ts` |
| Tests | ✅ `scripts/test-event-horizon-push.ts` |

**Verify:** Set tired user status + dense schedule → open Globe (not first morning unlock) → Guardian card after ~4s, max once/day.

---

## Phase 3 — Weeks 5–8 ✅ (started)

**Personal Context Phase B + execution tiers 0–3**

| Deliverable | Status |
|-------------|--------|
| Phase B semantic retrieval + bridge gate | ✅ `lib/personal-context-ask/resolve-phase-b-retrieval.ts` |
| `retrievalSource` on bridge hits | ✅ lexical / semantic |
| Execution tier registry 0–3 | ✅ `lib/execution-tier/` |
| Commit gate on tier-3 dispatch | ✅ `submit-capability-execution.ts` |
| `commitApproved` in useCapabilityDispatch | ✅ `hooks/use-capability-dispatch.ts` |
| Tests | ✅ `scripts/test-jarvis-phase-b.ts` |

**Tiers:** 0 read · 1 draft · 2 one-tap · 3 commit (MESSAGE/CALL/BOOK_* need `commitApproved`)

---

## Phase 4 — Weeks 9–12 ✅ (started)

**Agent Runtime verification/repair (ADR-042) + bg tasks**

| Deliverable | Status |
|-------------|--------|
| Always-on execution state manager | ✅ `lib/workstream/agent-execution-state-manager.ts` |
| Background task dispatch (`bg:`) | ✅ `lib/workstream/background-task-dispatch.ts` |
| Background Verify → Repair | ✅ `lib/workstream/run-background-agent-verification.ts` |
| Runtime wires bg verify on judgment | ✅ `rimvio-agent-runtime.ts` |
| React hook for UI | ✅ `hooks/use-agent-execution-state-manager.ts` |
| Tests | ✅ `scripts/test-jarvis-phase-9.ts` |

**Verify:** Planning utterance → runtime queues `bg:verify_schedule` · state manager snapshot alive · Commit still gated by `verifyOperationsBeforeCommit`.

---

## Phase 5 — Jarvis peer messenger send ✅

**NL → draft → confirm → Rimvio DM (`send_internal_message`)**

| Deliverable | Status |
|-------------|--------|
| NL intent parser | ✅ `lib/jarvis-peer-send/parse-jarvis-peer-send-intent.ts` |
| Message composer | ✅ `lib/jarvis-peer-send/compose-peer-send-message.ts` |
| Confirm send UI | ✅ `components/action-chat/inline-chat-peer-send-chip.tsx` |
| Action chat wiring | ✅ `hooks/use-action-chat.ts` |
| Agent tool SSOT | ✅ `lib/agent-tools/send-internal-message-tool.ts` |
| Tests | ✅ `scripts/test-jarvis-peer-send.ts` |

**Try:** `동준이한테 내일모레 강남역 7시에서 보자고 메신저 보내줘` → preview card → [전송하기] or `응 보내줘`

---

## Phase 6 — Fact Query + Globe projection ✅ (started)

**Deterministic facts → chat card → map pins (Tier A)**

| Deliverable | Status |
|-------------|--------|
| FactAnswerWire + classifier | ✅ `lib/fact-query/` |
| Tokyo transit SSOT (13 lines) | ✅ `data/tokyo-transit-ssot.ts` |
| `transit_max_interchange` tool | ✅ |
| Tokyo hotspot index | ✅ `data/tokyo-hotspot-ssot.ts` |
| `poi_hotspots` tool | ✅ |
| Action chat turn (no orchestrator) | ✅ `use-action-chat.ts` |
| Globe overlay + flyTo pin | ✅ `globe-fact-projection-card.tsx` |
| Agent tool schemas | ✅ `lib/agent-tools/fact-query-tools.ts` |
| Tests | ✅ `scripts/test-fact-query.ts` |

**Try:** `도쿄 지하철 13개 노선 환승 최다 역` · `도쿄에서 가장 핫한 곳` → chat evidence + Globe pin

| Tier A add-on | Status |
|---------------|--------|
| Weather lookup wire | ✅ `weather_lookup` + live API |
| Distance lookup | ✅ `distance_lookup` · city anchors |
| Osaka transit + hotspots | ✅ `osaka-transit-ssot` · `osaka-hotspot-ssot` |
| Schedule feasibility wire | ✅ `schedule_feasibility` · Verification Agent |
| GTFS route + last train stub | ✅ `transit_route_lookup` · `transit_last_train` |
| Seoul transit + hotspots | ✅ `seoul-transit-ssot` · `seoul-hotspot-ssot` |

**Try also:** `오사카 지하철 환승 최다 역` · `오사카 핫한 곳` · `시부야에서 아사쿠사까지 거리` · `도쿄 내일 비 와?` · `난바에서 USJ 18시 출발 가능?` · `서울 지하철 환승 최다 역` · `강남에서 홍대입구까지 지하철로` · `서울 2호선 막차`

**Next (Tier B):** GTFS live feed ingest · Workspace Fact Query · mid-point meeting place

---

## Phase 7 — Tier B (started)

**Workspace facts + midpoint meeting**

| Deliverable | Status |
|-------------|--------|
| Workspace Fact Query early exit | ✅ `dispatch-workspace-fact-query-turn.ts` |
| Workspace fact answer card | ✅ `workspace-fact-answer-card.tsx` |
| Wire prompt bar + cursor dock | ✅ |
| `midpoint_meeting` tool | ✅ `midpoint-meeting.ts` |
| Tests | ✅ `test-workspace-fact-query.ts` |

**Try:** Workspace에서 `서울 지하철 환승 최다 역` · `강남과 홍대 중간 만남`

| Tier B add-on | Status |
|---------------|--------|
| GTFS feed slice ingest | ✅ `gtfs-feed-registry.ts` · route/last train priority |
| Schedule share via messenger | ✅ `resolve-peer-send-trip-share.ts` · trip card in peer send |

**Try also:** `민수에게 오사카 여행 일정 공유해줘` (Workspace Reality Draft 연결 시 Day 라인 포함)

## Phase 8 — Tier C ✅

**GTFS-RT · 혼잡도 · in-app booking**

| Deliverable | Status |
|-------------|--------|
| `transit_realtime_lookup` (GTFS-RT slice) | ✅ `gtfs-rt-registry.ts` · `gtfs-rt-tools.ts` |
| `transit_crowding_lookup` | ✅ `transit-crowding-ssot.ts` · `transit-crowding-tools.ts` |
| In-app booking draft + confirm | ✅ `lib/jarvis-in-app-booking/` · `inline-chat-booking-draft-chip.tsx` |
| Wire action chat early exit | ✅ fact → booking commit → peer send |
| Tests | ✅ `test-fact-query.ts` · `test-jarvis-in-app-booking.ts` |

**Try:** `강남역 2호선 실시간 도착` · `강남역 혼잡도` · `APA 난바 예약해줘` (Globe 여행 맥락 필요)

---

## Key files

| Area | Path |
|------|------|
| Morning loop | `lib/morning-loop/` |
| Loop wiring | `lib/loop-wiring/` |
| Morning briefing | `lib/morning-orchestrator/` |
| Globe overlay | `components/globe/globe-morning-prep-card.tsx` |
| Constitution | `docs/RIMVIO_CONSTITUTION.md` |
| Spine (frozen) | `docs/ACTION_OS_SPINE.md` |
