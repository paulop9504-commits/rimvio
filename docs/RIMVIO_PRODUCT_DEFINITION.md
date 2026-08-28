# Rimvio Product Definition

**Status:** CANON (product SSOT — consolidated answer to “What is Rimvio?”)  
**Audience:** Founders, PM, design, engineering, next AI agent  
**Wire:** `lib/rimvio-protocol/` · `lib/platform-sdk/` · `lib/platform-builder/` · `lib/hub/`  
**Related:** [RIMVIO_OS_CONSTITUTION.md](./RIMVIO_OS_CONSTITUTION.md) · [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · [RIMVIO_PLATFORM_VISION.md](./RIMVIO_PLATFORM_VISION.md) · [RIMVIO_PRODUCT.md](./RIMVIO_PRODUCT.md)

> This document is **the** product answer. Architecture law lives in the Constitutions; platform mechanics in the SDK spec; this doc binds them into one story.

---

## 0. 한 줄 정의 · One sentence

**KO:** Rimvio는 **의도(Intent)가 현실(Reality)로 정산되는 개인 실행 OS**이며, 소비자는 맥락 안에서 행동하고 생산자는 같은 프로토콜 위에 플랫폼을 올린다.

**EN:** Rimvio is a **personal execution OS where Intent settles into Reality** — consumers act inside Context; producers ship Platforms on the same protocol.

**Tagline (L1):** 맥락이 연결되면, Rimvio가 다시 실행한다. · *When context connects, Rimvio re-executes.*

**Rimvio is not:** a chatbot, a super-app, an app store, a search engine, or a passive memory dump. It is an **Experience OS** — a Context Operating System.

---

## 1. Rimvio가 무엇인가 · What Rimvio is

Rimvio wires scattered life resources — people, place, calendar, links, notifications — into **one operable situation**, then **re-executes** the next meaningful action when context matches. Users think in **situations**, not apps. Tools arrive when useful. Humans **Commit**; AI **Prepares**.

Two economies share one protocol:

| Economy | Who | What they do | Surface |
|---------|-----|--------------|---------|
| **Consumer** | End user | Creates Intent inside Context; discovers Capabilities; Prepares → Approves → Commits | Globe · Workspace · Field |
| **Producer** | Developer · creator · business | Publishes Platform + Capabilities; deploys per Market; composes payment · shipping · booking | Hub · Builder · Runtime |

Neither economy is “the product.” Both ride the same **Intent → Capability → Platform → Commit** spine.

---

## 2. 핵심 루프 · Core loop

Every user-facing flow — travel, resale, booking, custom SaaS — follows this loop:

```text
INTENT
  → CONTEXT        (who · where · when · constraints — never one country field)
  → DISCOVERY      (Capability Index — not page URLs)
  → WORKSPACE      (One Intent · One Focus · Patch before chat essay)
  → AGENT          (ADR-045 spine: Plan → Execute → Verify → Repair)
  → EXPERIENCE     (FACT → MEANING → RECALL → projection surfaces)
  → APPROVAL       (Field / soft chip / human gate — Prepare only until here)
  → COMMIT         (Article 0 — sole truth writer)
  → EVENT          (domain.entity.verb — durable ledger, not transcript)
```

**Laws embedded in the loop:**

- **Intent never mutates Reality** — only Commit does.
- **Discovery is Capability-first** — Agent finds `market.create_listing`, not “open Used Market app.”
- **Workspace is SSOT** during a turn — chat is intent signal, not inventory dump.
- **Prepare only** until explicit human Commit.

Current implementation focus (Action OS spine — do not skip for marketplace UI):

```text
Context (calendar · notification · chat · link)
  → @ Action Contract Registry
  → Proactive prep surface
  → Archive fold + telemetry
  → Learning rollup → MAIN ranking
```

Platform OS (Hub · Builder · multi-tenant Runtime) builds on this spine — it does not replace it.

---

## 3. 다섯 제품 라인 · Five product lines

Rimvio ships as five product lines. UI names are projections; the lines are architectural.

| Line | Role | User sees | SSOT |
|------|------|-----------|------|
| **Core** | Identity · Context · Object · Intent · Protocol · Events | Globe home · personal graph | `lib/rimvio-protocol/` · `lib/context-run/` · `lib/workstream/` |
| **Workspace** | One Intent → One Focus · Agent execution surface | 작업장 · 펼치기 · MapLibre focus | `lib/context-workspace/` · ADR-022 · ADR-026 |
| **Hub** | Capability + Platform discovery · submission · review | 허브 · 마켓 배포 · 샌드박스 | `lib/hub/capability/` · `app/hub/` · `lib/platform-sdk/discover-capabilities.ts` |
| **Builder** | Natural language → RIR → same manifest as developers | “무엇을 만들까요?” · Blueprint · Preview | `lib/platform-builder/` · `app/hub/build/` |
| **Runtime** | Host Platform SDK · tenant isolation · permission gate | Invisible — executes Capabilities | `lib/platform-sdk/` · ADR-045 · `lib/platform/` (internal host) |

```text
                    RIMVIO
                      │
     ┌────────────────┼────────────────┐
     ↓                ↓                ↓
   CORE          WORKSPACE            HUB
 (protocol)      (execution UI)   (discovery + publish)
     │                │                │
     └────────────────┼────────────────┘
                      ↓
              BUILDER + RUNTIME
           (RIR → manifest → execute)
```

---

## 4. Platform · Capability · Agent · 구분

| Term | Definition | Not this |
|------|------------|----------|
| **Platform** | Tenant-isolated container: manifest, data collections, UI routes, operator, market deployments | A country · a single page · “mini-app” in a super-app grid |
| **Capability** | Invokable unit Agent discovers and invokes (`market.create_listing`, `payment.charge`) | A UI route · a bookmark · free-text tool invent |
| **Agent** | Rimvio execution intelligence on ADR-045 spine — discovers Capabilities, Prepares, verifies, never auto-Commits | A chatbot essay · parallel Quick/Planning runtimes |

**Routing rule:**

```text
User utterance → Intent resolution → Capability Index (platformId, capabilityId, marketCountry)
  → Platform Runtime handler → Workspace Patch / Field Prepare → Human Commit
```

**Platform Core vs Market Deployment** (ADR-056):

```text
Developer → Platform Owner → Platform (Core — country-agnostic)
                              → Market Deployments (KR · JP · US · …)
```

- **Platform Core:** product model, capability graph, UI routes, composition imports.
- **Market Deployment:** locale, currency, tax, payment rails, legal, shipping, seller flow per country.
- Discovery filters by **resolved user market** (account · residence · billing · shipping · current location) — never GPS alone.

---

## 5. Hub — 발견이지 앱스토어가 아님 · Hub is discovery, not an app store

Hub is **intent-based capability discovery**, not a grid of apps to download.

| App store mental model | Rimvio Hub |
|------------------------|------------|
| Browse categories · install · open app | Utterance → Intent → matching Capabilities |
| User learns each app’s UI | Agent opens the right Prepare surface |
| Version per app icon | Index keyed by `(platformId, capabilityId, marketCountry)` |
| Global one-size commerce | Market Deployment readiness per country |

**Two submission tracks, one manifest output:**

| Track | Route | Steps |
|-------|-------|-------|
| Chooser | `/hub/submit` | Capability vs Platform |
| Capability | `/hub/submit/capability` | Manifest → permissions → test → publish |
| Platform | `/hub/submit/platform` | Identity → org → product → … → markets → commerce → review (14) |
| Builder | `/hub/build` | NL → RIR → same manifest |

1. **Developer** — SDK + manifest at `/hub/submit/capability` or full Platform wizard at `/hub/submit/platform`
2. **Builder** — `/hub/build` → `stashPendingManifest` → Hub submit

Publish registers Capabilities into the **Capability Index**; users never need to “install Used Market” to sell a bicycle.

---

## 6. Builder — 개발자와 모두 같은 경로 · Same path for everyone

Rimvio Builder is **not** a simplified “easy mode” ecosystem.

```text
Everyone:  "가구 중고 마켓 만들고 싶어"
              ↓
         AI Product Agent (clarify → blueprint)
              ↓
         RIR (rimvio.builder.rir.v1)
              ↓
         RIR Compiler
              ↓
         rimvio.platform.manifest.v1  ← identical to developer path
              ↓
         Sandbox → Preview → Test → Hub Review → Publish
```

**Three levels, one shell:** Visual (L1) · Logic/Data (L2) · Code (L3). SSOT is **RIR → Manifest**, not a file tree.

**PR reject:** Builder-only manifest format · LLM writes manifest JSON without RIR · publish skipping preview/test.

---

## 7. Platform composition · 마켓플레이스 + 결제 + 배송

Platforms declare **composition imports** — other platforms’ Capabilities composed at Prepare time with one composed approval.

```json
"composition": {
  "imports": [
    { "platformId": "platform.payments", "capabilities": ["payment.charge"] },
    { "platformId": "platform.shipping", "capabilities": ["shipping.quote", "shipping.create_label"] }
  ]
}
```

- Each platform keeps **tenant-strict** data.
- Composition passes **references** (orderId, listingId), not cross-tenant DB access.
- User sees one Field flow: list → pay → ship → Commit.

This is how a resale Platform stays small while riding shared payment and logistics Platforms.

---

## 8. 소비자 경험 예 · Consumer example — sell a bicycle

**User says:** “이 자전거 팔고 싶어”

```text
1. INTENT       sell + object(bicycle) — from utterance + Context (photo, location optional)
2. CONTEXT      accountCountry=KR · shippingCountry=KR · item hints from Workspace
3. DISCOVERY    market.create_listing @ platform.used-market (KR deployment)
4. WORKSPACE    SellForm opens — One Focus — title/price prefilled from Context
5. AGENT        Prepare listing draft · verify price basis (Unit Canon) · no auto-publish
6. EXPERIENCE   Preview card in Workspace — not chat essay
7. APPROVAL     User reviews listing · Field CTA “올리기”
8. COMMIT       listings row written · optional Globe pin after Commit only
9. EVENT        market.listing.created · durable ledger entry
```

**Extended:** “팔고 배송까지” adds composition → `payment.charge` + `shipping.quote` in one approval chain.

Developer A never teaches User B the Used Market UI — **Intent + Capability** is the entry.

---

## 9. 생산자 경험 예 · Producer example — furniture marketplace

**Producer says (Builder):** “北歐風 가구 중고 마켓 만들고 싶어. 한국이랑 일본.”

```text
1. BUILDER      AI Product Agent clarifies: categories, commission, ID verification, markets
2. RIR          kind: platform · collections: listings, sellers · routes: /browse, /sell, /order
3. MANIFEST     rimvio.platform.manifest.v1
                  operator: Studio Inc. (HQ KR)
                  markets: primary KR · deployments [KR 100%, JP pending]
                  capabilities: market.search, market.create_listing, market.update_listing
                  composition: platform.payments · platform.shipping (KR/JP rails per deployment)
4. HUB REVIEW   Market Deployment Panel — KR legal/tax/payment checklist
5. SANDBOX      Test buyer flow + seller onboarding in KR deployment
6. PUBLISH      Capabilities register in Index for (platform.furniture-market, *, KR)
7. DISCOVERY    Consumer “이 의자 팔고 싶어” → same loop as §8, different platformId
```

**Producer ongoing:** Add JP deployment (new Market Deployment, not new Platform) · tune capabilities · compose new payment provider — without forking consumer Intent routing.

---

## 10. OS 헌법 · Eleven pillars (architecture SSOT)

Product lines map to constitutional pillars — see [RIMVIO_OS_CONSTITUTION.md](./RIMVIO_OS_CONSTITUTION.md) · ADR-057:

Identity · Context · Object · Intent · Capability · Platform · Protocol · Runtime · Permission · Market · Commerce

> **Intent enters through Context; Capability executes on Platform; Market and Commerce shape reality; humans Commit.**

Object model (OS): `User` · `Organization` · `Platform` · `Capability` · `Agent` · `Product` · `Listing` · `Order` · `Payment` · `Event` · `Market` · …

Callout `RimvioObject` in UI is a **projection** — not OS ontology.

---

## 11. 코드베이스 맵 · Codebase map (non-exhaustive)

| Concern | Path |
|---------|------|
| Protocol / pillars | `lib/rimvio-protocol/` |
| Platform SDK · manifest · markets | `lib/platform-sdk/` |
| Capability discovery | `lib/platform-sdk/discover-capabilities.ts` · `capability-index.ts` |
| Builder · RIR | `lib/platform-builder/` |
| Hub wizard · validation | `lib/hub/capability/` · `hooks/use-hub-capability-wizard.ts` |
| Platform submission (14-step) | `lib/hub/platform/` · `hooks/use-hub-platform-wizard.ts` · `/hub/submit/platform` |
| NL intent stage | `lib/context-run/compile-nl-intent.ts` · `intent_compiler` in `natural-language-pipeline.ts` |
| Hub UI | `app/hub/` · `components/hub/` |
| Builder UI | `app/hub/build/` · `components/builder/` |
| Platform host / runtime | `lib/platform-sdk/platform-host.ts` · `components/platform/` |
| Agent spine | `lib/workstream/rimvio-agent-runtime.ts` · ADR-045 |
| Context run · NL pipeline | `lib/context-run/` |
| Workspace | `lib/context-workspace/` |
| Globe / surfaces | `app/page.tsx` · `lib/surface-registry/rimvio-surface-ia.ts` |
| Agent home (dev) | `components/agent/` |
| Permissions | `lib/platform-sdk/permissions.ts` · ADR-047 |
| Reality Provider (external facts) | `lib/reality-provider/` · ADR-051 |
| Unit Canon (money · time · space) | `lib/unit-canon/` |

**Scripts (dev verification):** `scripts/test-platform-sdk-manifest.ts` · `scripts/test-platform-builder.ts` · `scripts/test-platform-pipeline.ts`

---

## 12. 관련 ADR · Constitution index

| Doc | Role |
|-----|------|
| [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) | Article 0 · Experience OS · Commit law |
| [RIMVIO_OS_CONSTITUTION.md](./RIMVIO_OS_CONSTITUTION.md) | Eleven pillars · object model · priority tiers |
| [RIMVIO_PLATFORM_VISION.md](./RIMVIO_PLATFORM_VISION.md) | Four-stage evolution · competitive positioning |
| [RIMVIO_PLATFORM_SDK_SPEC.md](./RIMVIO_PLATFORM_SDK_SPEC.md) | Manifest · APIs · runtime tiers · composition |
| [RIMVIO_BUILDER_SPEC.md](./RIMVIO_BUILDER_SPEC.md) | RIR · vibe loop · Builder UX |
| [RIMVIO_UX_CONSTITUTION.md](./RIMVIO_UX_CONSTITUTION.md) | Globe vs Field classifier |
| [ACTION_OS_SPINE.md](./ACTION_OS_SPINE.md) | Current vertical slice focus |
| ADR-045 | One Agent Runtime |
| ADR-047 | RTS permission · map/object ownership |
| ADR-054 | Platform SDK manifest |
| ADR-055 | Rimvio Builder + RIR |
| ADR-056 | Platform Market Deployment |
| ADR-057 | Rimvio OS Constitution |

---

## 13. 구현 우선순위 · Priority tiers

### 🔴 Lock now (design-time — expensive to change)

Object model · Identity facets · Platform ≠ Capability · Platform Core ≠ Market Deployment · Context dimensions · Intent routing · Protocol types · Permission catalog · Runtime tiers · Tenancy · Events · Versioning · RIR → manifest single path

**Wire first:** `lib/rimvio-protocol/` types before new surface features.

### 🟡 Early product

Builder vibe loop · Hub submission + review · Sandbox · Capability discovery · KR market deployment · basic commerce composition · Agent → Capability invoke

### 🟢 Expand later

JP / US / EU deployments · enterprise tenancy · advanced billing · full marketplace economy · external L3 protocol at scale · execution protocol as industry infrastructure (Vision stage 4)

**Rule:** Do not pull stage 3–4 vision into code before stage 1 Action OS spine is solid. Vision documents align direction; they do not bypass layer ownership rules.

---

## 14. 플랫폼 진화 · Where this goes (summary)

See [RIMVIO_PLATFORM_VISION.md](./RIMVIO_PLATFORM_VISION.md) for full four-stage arc:

```text
1. Context execution tool (now)
2. Personal Context OS
3. Demand-side execution gateway (two-sided)
4. Execution protocol / infrastructure
```

Rimvio’s moat is not feature count — it is **context connection → automatic re-execution** on a shared **Intent → Capability → Commit** protocol that consumers and producers share.

---

## 15. PR gate (product)

- [ ] Feature declares Consumer vs Producer path and which product line it extends
- [ ] No parallel manifest or discovery SSOT per surface
- [ ] Agent discovers Capabilities, not platform home pages
- [ ] Prepare only until human Commit (Article 0)
- [ ] Market-aware discovery uses Context policy — not single `country` field
- [ ] Builder output validates as `rimvio.platform.manifest.v1`
- [ ] Chat is intent signal — Workspace / Event ledger is truth
