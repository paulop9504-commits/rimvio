# Rimvio Builder — AI Platform & Capability Builder

**Status:** CANON (design SSOT)  
**ADR:** [055-rimvio-builder](./adr/055-rimvio-builder.md)  
**Wire:** `lib/platform-builder/` · `/hub/build`  
**Parent:** [RIMVIO_PLATFORM_SDK_SPEC.md](./RIMVIO_PLATFORM_SDK_SPEC.md) · ADR-054

> **One sentence:** Anyone describes an idea in natural language; Rimvio Builder produces the **same `rimvio.platform.manifest.v1`** developers write by hand — via **RIR → Compiler**, not raw code edits.

**Product copy (L1):** Build a Platform · Create a Capability · Turn your idea into a service — **not** "AI coding tool."

---

## 0. Why Builder exists

| Path | User | Entry |
|------|------|-------|
| **Developer** | Code → SDK → Manifest → Sandbox → Publish | Hub `/hub/submit` |
| **Everyone else** | Natural language → Builder → RIR → Manifest → Sandbox → Publish | Hub `/hub/build` |

**Both paths converge on one spec.** No forked "simple platform" format.

---

## 1. What users never see first

Hide on Level 1 (default):

- React · TypeScript · Manifest JSON · Runtime · API · Database SQL

Show first:

```text
무엇을 만들고 싶나요?
```

---

## 2. Rimvio Builder architecture

```text
                 RIMVIO BUILDER
                       │
              "무엇을 만들까요?"
                       │
                       ↓
                AI Product Agent
         (PM + Designer + Technical planner)
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Product        UX         Technical
       Planning      Design        Plan
          │            │            │
          └────────────┼────────────┘
                       ↓
           Rimvio Intermediate Representation (RIR)
                       ↓
                  RIR Compiler
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
  rimvio.platform.manifest.v1    UI Schema (projection)
        ↓                             ↓
     Sandbox ←────────────────── Live Preview
        ↓
      Test
        ↓
  Submit Review → Rimvio Hub
```

### 2.1 vs Cursor

| | Cursor | Rimvio Builder |
|--|--------|----------------|
| Input | Developer code | Natural language + optional code (L3) |
| Output | Source files | **Executable Platform / Capability** |
| SSOT | Repo | **RIR → Manifest** |
| User | Developer | Idea holder → producer |

---

## 3. Vibe Building Loop (mandatory)

Never one-shot Publish.

```text
Describe → [Clarify] → Blueprint → Generate → Preview → Test → Modify → … → Publish
```

Each **Modify** turn:

```text
User utterance
  → Planner (diff intent)
  → RIR patch
  → Recompile
  → Validation + Permission check
  → Preview delta
  → [Undo] [Apply] [Publish when ready]
```

User sees:

```text
✓ 상품 이미지 제한을 10장으로 변경했습니다.
[Preview] [Undo]
```

Not schema diffs.

---

## 4. Rimvio Intermediate Representation (RIR)

**SSOT:** `lib/platform-builder/rir.ts`

RIR is the **stable layer between AI and compiler**. AI mutates RIR; compiler emits Manifest + UI projection.

```typescript
// rimvio.builder.rir.v1
{
  "specVersion": "rimvio.builder.rir.v1",
  "kind": "platform",
  "source": { "utterance": "동네 중고거래...", "locale": "ko" },
  "product": {
    "name": "Used Market",
    "slug": "used-market",
    "summary": "동네 중고거래",
    "category": "e-commerce"
  },
  "roles": [
    { "id": "buyer", "label": "구매자" },
    { "id": "seller", "label": "판매자" }
  ],
  "objects": [
    { "id": "listing", "label": "상품", "collection": "listings", "fields": ["title", "price", "images", "location"] },
    { "id": "order", "label": "주문", "collection": "orders", "fields": ["status", "buyerId", "sellerId"] },
    { "id": "message", "label": "메시지", "collection": "messages", "fields": ["body", "threadId"] }
  ],
  "actions": [
    { "id": "search", "label": "검색", "capabilityId": "market.search" },
    { "id": "sell", "label": "판매 등록", "capabilityId": "market.create_listing", "approvalRequired": true },
    { "id": "offer", "label": "가격 제안", "capabilityId": "market.make_offer" },
    { "id": "purchase", "label": "구매", "capabilityId": "market.purchase", "approvalRequired": true }
  ],
  "pages": [
    { "id": "home", "path": "/", "label": "Home", "component": "MarketHome" },
    { "id": "sell", "path": "/sell", "label": "Sell", "component": "SellForm" },
    { "id": "product", "path": "/product/:id", "label": "Product", "component": "ProductDetail" },
    { "id": "messages", "path": "/messages", "label": "Messages", "component": "MessageInbox" },
    { "id": "profile", "path": "/profile", "label": "Profile", "component": "UserProfile" }
  ],
  "features": ["chat", "offers", "reviews", "location_search"],
  "permissions": {
    "required": ["data.listings.read", "data.listings.write", "location.read"],
    "optional": ["compose.platform.payments"],
    "denied": ["credential.extract"]
  },
  "context": {
    "read": ["user.id", "location.coords", "device.locale"]
  },
  "clarifications": []
}
```

### 4.1 Capability RIR (simpler)

```typescript
{
  "kind": "capability",
  "capability": {
    "name": "AI Price Estimator",
    "id": "ai.estimate_price",
    "input": ["image"],
    "output": ["estimated_price"],
    "requires": ["storage.upload", "context.ai"],
    "action": "estimate_price"
  },
  "hostPlatformId": "platform.used-market"  // optional link
}
```

---

## 5. Three builder levels (one product)

| Level | Modes | User |
|-------|-------|------|
| **L1 Describe** | Conversation + Preview only | 일반인 |
| **L2 Build** | Visual · Logic · Data | 기획자 / 파워유저 |
| **L3 Code** | + Code (SDK / manifest export) | 개발자 |

UI tabs: `[Visual] [Logic] [Data] [Code]` — L1 defaults to Visual; Code is opt-in.

---

## 6. AI Product Agent behaviors

### 6.1 Clarify before generate

Never jump to code on vague input.

Example flow:

```text
User: 동네에서 음식 나눠주는 플랫폼
Agent: 무료 나눔인가요, 판매인가요?
User: 무료
Agent: 직접 만나서 받나요, 배송도 지원할까요?
User: 직접 만나서
Agent: → RIR (listings + location + chat + reservation + pickup)
```

Clarifications stored in `rir.clarifications[]` with Q/A pairs.

### 6.2 Blueprint review

Before Generate, show **Platform Blueprint** card:

- Users · Objects · Actions · Pages · Permissions  
- `[Generate Platform]` CTA

### 6.3 Modify pipeline (internal)

```text
User Request → Planner → RIR patch → Compiler → Validate permissions → Test stub → Preview
```

---

## 7. RIR Compiler

**SSOT:** `lib/platform-builder/compile-rir.ts`

```text
RIR (platform) → RimvioPlatformManifest
RIR (capability) → manifest.capabilities[] slice + optional standalone package
```

Rules:

- `objects[].collection` → `data.collections[]`
- `actions[].capabilityId` → `capabilities[]`
- `pages[]` → `ui.routes[]`
- `permissions` → manifest `permissions`
- `features` → may add composition imports or synthesized capabilities

Same validator as Hub: `validateRimvioPlatformManifest()`.

---

## 8. Builder UI shell

Route: **`/hub/build`**

```text
┌──────────────────────────────────────────────┐
│ Rimvio Builder                         ● Live │
├───────────────┬──────────────────────────────┤
│ PROJECT       │  LIVE PREVIEW                  │
│ (tree)        │  (platform projection)         │
├───────────────┴──────────────────────────────┤
│ Tell Rimvio what to change...          [Send] │
└──────────────────────────────────────────────┘
```

Phases rendered as steps above composer when not in free chat.

**Live** = preview projects compiled manifest; not production deploy.

---

## 9. Growth loop

```text
Idea → Builder → Platform → Hub → Users → Transactions → Revenue → More builders
```

Published platforms register capabilities → Rimvio Agent discovers → B users need no onboarding to A's UI.

---

## 10. Implementation map

| Piece | Path | Status |
|-------|------|--------|
| RIR types | `lib/platform-builder/rir.ts` | wire |
| Planner (MVP deterministic) | `lib/platform-builder/plan-from-utterance.ts` | wire |
| Compiler | `lib/platform-builder/compile-rir.ts` | wire |
| Builder hook | `hooks/use-rimvio-builder.ts` | wire |
| UI | `components/builder/*` | wire |
| Route | `app/hub/build/page.tsx` | wire |
| Developer submit | `/hub/submit` | existing |
| Agent (LLM) | extend `planFromUtterance` later | backlog |

### PR reject

- Parallel "simple" platform format for Builder users
- Publish without Preview + Test gate
- AI writing Manifest JSON directly (must go through RIR)
- Showing code editor on L1 first paint
- Auto Hub publish without review

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **RIR** | Rimvio Intermediate Representation — AI-editable blueprint |
| **Blueprint** | Human-readable RIR summary before generate |
| **Compiler** | RIR → `rimvio.platform.manifest.v1` |
| **Vibe loop** | Describe → Generate → Preview → Modify cycle |
