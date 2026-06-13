# Rimvio Story Layer — 층별 언어 SSOT

> **Experience OS**는 내부 정체성. **Story Layer**는 사용자·키노트·UI가 말하는 방식.  
> 코드 SSOT: `lib/copy/story-layer.ts` · UI 카피: `lib/copy/human-ko.ts`

---

## 왜 층이 필요한가

| 잘못된 단일 언어 | 결과 |
|------------------|------|
| VC deck만 Apple poetry | ship 불가, `@`·pin·sync 모호 |
| RFC만 Engineering | 사용자가 「지도 앱」「소셜」로 오해 |
| UI에 「핀」「GPS」「AI Layer」 | Apple simplicity 붕괴 |

**같은 제품, 다른 층.** L0에서 감정, L3에서 구현. L1↔L3 **매핑 테이블**로 AI·팀·코드가 어긋나지 않게 한다.

---

## Vocabulary stack

```
L0 Brand     — 키노트 · App Store · pitch (감정, 기술 0)
L1 User      — 화면 · toast · onboarding (동사·느낌, 행동은 보임)
L2 Product   — PRD · Notion · Cursor task (Trace · Recall · Lineage)
L3 Engineering — code · migration · RFC (PinEntity · EventCandidate · visibility)
```

**Constitution experience layers** (`FACT → … → ACTION`)와 **Story Layer**는 직교:

| Experience layer | Story (L1) | Product (L2) | Engineering (L3) |
|------------------|------------|--------------|------------------|
| FACT | 여기 있었어요 | Trace | GPS ingest · capture |
| EXPERIENCE | 흔적 · 맥락 | Context · Trace bundle | EventCandidate · pin commit |
| MEANING | 의미가 있었어요 | Meaning line | relationship facts · rank frame |
| RECALL | 그때 거기 · 발견 | Recall | arrive fly · stack picker |
| ACTION | 이어가기 · @ | Action address | `@` registry resolve |

---

## L0 — Brand (외부 narrative)

**Personal 1.0 (지금 ship):**

> **You were here. And it mattered.**  
> 당신은 이곳에 있었고, 그것은 의미가 있었습니다.

**External / launch film (Phase 2):**

> **Every place has a story. Now, it can remember yours.**

> **Your life. Mapped by moments.**  
> 당신의 삶, 순간들로 그려지다.

**카테고리 정의 (deck 1장):**

> The world isn't made of places. It's made of moments.

**금지 (L0에서도):** 지도 앱 · Geo Social · AI Experience Layer · Marketplace · Graph

---

## L1 — User (UI · KO)

### 동사 (허용)

| 동사 | 쓰는 곳 | L3 |
|------|---------|-----|
| **흔적 남기기** | ingest · create CTA | pin commit |
| **발견** | stack · tap nearby | context resolve near tap |
| **기억** · **그때 거기** | recall · replay | recall URL · MEANING |
| **이어짐** | lineage hint (Phase 2) | parentId · genealogy |
| **담기** | search ingress | capture attach |
| **이어가기** | @ CTA | action resolve |

### 명사 (허용)

**맥락** · **흔적** · **순간** · **그때 거기** · **경험** (Feed·calendar 맥락)

### 금지 (사용자-facing)

| ❌ | ✅ |
|----|-----|
| 게시 · 업로드 · 포스팅 | 남기기 · 담기 |
| 핀 박기 (hero CTA) | 흔적 남기기 · 여기 남기기 |
| GPS (hero · onboarding) | *(설정 > 위치 에서만)* |
| AI · LLM · Graph | *(설정·power user `@`만)* |
| Experience Graph · Spatial OS | *(내부 문서만)* |
| 리뷰 · 좋아요 · 별점 | *(없음 — ship 안 함)* |

### Surface별 한 줄

| Surface | L1 hero |
|---------|---------|
| Globe home | 당신이 지나간 순간이 여기 남아요 |
| Ingest bar | 한 줄 · 사진 — 여기에 남기기 |
| Stack picker | 이 근처에서 남긴 흔적 |
| Trip arrival | 다시 왔어요 — 그때 기억 |
| Empty globe | 아직 흔적이 없어요. 한 줄만 남겨보세요. |
| Settings > 위치 | GPS · 체류 *(power user)* |

---

## L2 — Product (PRD · Cursor task)

내부 명사 — **implementable, 감정에 가깝지만 모호하지 않게:**

| Term | Definition |
|------|------------|
| **Trace** | Place-bound experience fragment (photo · memo · dwell) |
| **Context** | User-facing bundle on globe ("민수랑 제주 Day2") |
| **Recall** | Right trace at right moment (arrive · deep link) |
| **Lineage** | parentId · who built on whose trace (Phase 2) |
| **Pioneer** | First trace in cell (Phase 2, no public leaderboard) |
| **Visibility** | private \| shared — default private |

**금지 L2 이름:** Geo Social Marketplace · Spatial Discovery Graph · AI Experience Layer

---

## L3 — Engineering (code · RFC)

| Concept | Types / modules |
|---------|-----------------|
| Pin | `PinEntity` · globe pin sync |
| Context write | `createManualGlobeContext` · ingest bar |
| Experience node | `EventCandidate` |
| Globe projection | `rimvio-globe-hub` · tiles (renderer only) |
| @ | `mention-feature-registry` · action address |
| MEANING | `relationship-meaning-lines` · `project-relationship-meaning-line` |

Globe = **renderer**. Pins = **SSOT**. Story words never become table names.

---

## L1 ↔ L3 매핑 (Cursor · PR prompt)

```
「흔적 남기기」→ ingest bar → EventCandidate + pin coords, visibility private
「발견」       → tap globe → resolveGlobeContextsNearTap → stack picker
「그때 거기」  → recall chip → fly + card + MEANING line
「이어짐」     → Phase 2 · parentId on commit
```

Every Cursor task on Globe: **one L0/L1 line at top**, then **L3 constraints** (no Post model, no public like count).

---

## Mode split (personal vs external)

| Mode | L0 | L1 tone |
|------|-----|---------|
| **Personal (now)** | You were here. And it mattered. | 내 흔적 · 그때 거기 |
| **External (later)** | Walk the world. Discover what others felt. | 누군가 남긴 흔적 · 발견 |

한 화면에 두 모드 섞지 않는다.

---

## Rimvio 전체 vs Globe

| Area | L0 anchor | L1 focus |
|------|-----------|----------|
| **Globe** | You were here… | 흔적 · 발견 · 그때 거기 |
| **Feed / Action OS** | Your Life, Operable. | 쌓인 경험 · @실행 |
| **Peers** | *(conversation ingress)* | 대화 · 실행 버튼 |

Globe Story Layer는 **공간·기억** 축. Feed North Star는 **다음 행동** 축. 충돌 없음.

---

## PR review checklist

- [ ] User-visible string uses L1 verbs/nouns?
- [ ] No forbidden words in hero · toast · empty state?
- [ ] PRD / rule uses L2, not L0 poetry alone?
- [ ] Code / migration uses L3, not 「흔적」 table names?
- [ ] Personal vs external copy not mixed on one surface?
- [ ] **이 기능이 internal인데 Creator 행동을 하고 있지 않은가?** — [`RIMVIO_SCOPE_AI.md`](./RIMVIO_SCOPE_AI.md)

---

## Related docs

- `docs/RIMVIO_CONSTITUTION.md` — Experience OS doctrine
- `docs/RFC_UNIVERSAL_PIN_SYSTEM.md` — PinEntity projection + domain registry
- `docs/RIMVIO_EXPERIENCE_LAYERS.md` — FACT → ACTION
- `docs/RIMVIO_BRAND.md` — logo · color · North Star
- `.cursor/rules/rimvio-story-layer.mdc` — agent enforcement
