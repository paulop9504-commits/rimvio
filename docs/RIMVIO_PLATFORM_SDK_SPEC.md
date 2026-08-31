# Rimvio Platform SDK — Unified Specification

**Status:** CANON (design SSOT)  
**ADR:** [054-rimvio-platform-sdk-spec](./adr/054-rimvio-platform-sdk-spec.md)  
**Wire:** `lib/platform-sdk/` · Hub wizard `lib/hub/capability/`  
**Related:** [RIMVIO_PLATFORM_VISION.md](./RIMVIO_PLATFORM_VISION.md) · ADR-045 · ADR-047 · ADR-051 · `lib/platform/` (internal behavioral OS)

> **One sentence:** Developers build **tenant-isolated SaaS on Rimvio primitives**; Rimvio Agent **discovers and composes** declared Capabilities — never arbitrary uploaded code.

---

## 0. What this spec unifies

| Layer | This spec owns | Not this spec |
|-------|----------------|---------------|
| **Manifest** | Package · Platform · Capability declarations | Chat essay · ad-hoc JSON in UI |
| **Runtime** | Native · Sandboxed · External protocol | Parallel `*-runtime` packages (ADR-045) |
| **Context API** | Read grants from Rimvio Context | Domain overlay stores as SSOT |
| **Data API** | Per-platform collections + ACL | Shared cross-tenant tables |
| **Capability API** | Discovery · invoke · compose | Agent free-text tool invent |
| **Permission Model** | Capability · Context · Data · Network · Cross-platform | RTS map share (ADR-047) |

**Internal note:** `lib/platform/` (behavioral OS plugins) is the **host runtime** for v1 internal extensions. This spec is the **developer-facing Platform OS** contract Hub publishes into.

---

## 1. Architecture

```text
                         RIMVIO
                            │
              ┌─────────────┴─────────────┐
              │                           │
           AI CORE                   PLATFORM OS
              │                           │
              │              ┌────────────┼────────────┐
              │              │            │            │
              │             UI          Data       Runtime
              │              │            │            │
              │           Pages      Collections   Sandbox
              │           Forms      Relations     Protocol
              │           Cards      Search        Jobs
              │              │            │            │
              │              └────────────┼────────────┘
              │                           │
              │                    Developer Platform
              │                     (tenant: used-market)
              │                           │
              └───────────────┬───────────┘
                              │
                     Capability Discovery
                              │
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
         Platform A       Platform B       Platform C
         Marketplace       Travel           Finance
```

### 1.1 Core invariant

```text
Intent → Capability Discovery → Platform Runtime → Prepare → Human Commit → Reality
```

- **Prepare only** until human Commit (Article 0).
- Platform Data mutations go through **Data API** with tenant scope — never raw SQL from sandbox.
- **Capability** is the only Agent-invokable unit; UI routes are not discovered directly.

---

## 2. Developer tiers

| Tier | Name | Stack | Isolation |
|------|------|-------|-----------|
| **L1** | Rimvio Native | Rimvio UI · Data · Auth · Actions · Context SDK | Strongest — host-rendered |
| **L2** | Sandboxed Platform | React/TS/Node/Python in sandbox | Permission + network policy + storage quota |
| **L3** | External Runtime | Developer infra via Rimvio Protocol | OAuth + signed capability callbacks |

Hub submission wizard maps to **L1 default**; L2/L3 declared in `manifest.runtime.tier`.

---

## 3. Unified manifest (`rimvio.platform.manifest.v1`)

Single document submitted at publish. Hub steps 1–6 are views over this object.

**Platform ≠ Country.** `operator` + `markets` declare who runs the platform and where it deploys. See [ADR-056](./adr/056-platform-market-deployment.md).

```json
{
  "operator": {
    "name": "A Studio Inc.",
    "headquartersCountry": "KR"
  },
  "markets": {
    "primary": "KR",
    "contextPolicy": "account_country",
    "deployments": [
      {
        "country": "KR",
        "status": "approved",
        "primary": true,
        "locale": { "languages": ["ko"], "default": "ko-KR" },
        "currency": "KRW",
        "timezone": "Asia/Seoul",
        "addressSystem": "KR",
        "dataResidency": "ap-northeast-2",
        "readiness": { "localization": "complete", "currency": "complete", "payment": "complete" }
      }
    ]
  }
}
```

```json
{
  "specVersion": "rimvio.platform.manifest.v1",
  "package": {
    "id": "platform.used-market",
    "name": "Used Market",
    "version": "1.0.0",
    "description": "Neighborhood resale marketplace",
    "category": "e-commerce",
    "tags": ["marketplace", "resale"],
    "pricing": "free",
    "icon": "rimvio://assets/used-market/icon"
  },
  "runtime": {
    "tier": "native",
    "type": "cloud-agent",
    "entry": "platform/index.ts",
    "hostVersion": ">=1.0.0"
  },
  "permissions": {
    "required": ["browser.read", "browser.write"],
    "optional": ["location.read"],
    "denied": ["filesystem.write", "credential.extract"]
  },
  "context": {
    "read": [
      { "path": "user.id", "type": "string" },
      { "path": "location.coords", "type": "object" },
      { "path": "device.locale", "type": "string" }
    ],
    "write": []
  },
  "data": {
    "collections": [
      {
        "name": "listings",
        "schema": "listing.v1",
        "indexes": ["sellerId", "category", "geoHash"]
      },
      {
        "name": "orders",
        "schema": "order.v1",
        "indexes": ["buyerId", "sellerId", "status"]
      }
    ],
    "isolation": "tenant_strict"
  },
  "capabilities": [
    {
      "id": "market.search",
      "name": "Search listings",
      "inputSchema": "market.search.v1",
      "outputSchema": "market.search_result.v1",
      "approvalRequired": false
    },
    {
      "id": "market.create_listing",
      "name": "Create listing",
      "inputSchema": "market.create_listing.v1",
      "outputSchema": "market.listing.v1",
      "approvalRequired": true
    }
  ],
  "ui": {
    "routes": [
      { "path": "/market", "surface": "page", "component": "MarketHome" },
      { "path": "/sell", "surface": "page", "component": "SellForm" }
    ]
  },
  "composition": {
    "imports": [
      { "platformId": "platform.payments", "capabilities": ["payment.charge"] },
      { "platformId": "platform.shipping", "capabilities": ["shipping.quote"] }
    ]
  },
  "events": {
    "emits": ["listing.created", "order.completed"],
    "subscribes": ["payment.succeeded"]
  }
}
```

### 3.1 ID namespaces

| Kind | Pattern | Example |
|------|---------|---------|
| Platform | `platform.<slug>` | `platform.used-market` |
| Capability | `<domain>.<verb>` or `<platform>.<verb>` | `market.create_listing` |
| Collection | lowercase plural | `listings`, `orders` |
| Schema | `<name>.v<major>` | `listing.v1` |
| Permission | dot-separated | `browser.read`, `data.listings.write` |

### 3.2 Hub wizard mapping

| Step | Manifest section |
|------|------------------|
| 1 Package | `package` |
| 2 Manifest | `runtime`, `capabilities`, raw JSON editor |
| 3 Permissions | `permissions` |
| 4 Context & I/O | `context`, `data.collections`, `events`, schemas |
| 5 Test | sandbox against `capabilities[]` |
| 6 Review | full document + `composition` |

---

## 4. Platform SDK surface

Developers import **one package**; SDK modules are facades over host APIs.

```tsx
import {
  RimvioPlatform,
  Page,
  Action,
  useRimvioContext,
  useRimvioDb,
} from "@rimvio/platform-sdk";

export function App() {
  return (
    <RimvioPlatform manifestId="platform.used-market">
      <Page route="/market" component={MarketHome} />
      <Page route="/sell" component={SellForm} />
      <Action name="market.create_listing" handler={createListing} />
    </RimvioPlatform>
  );
}
```

### 4.1 SDK modules

| Module | Responsibility | Host API |
|--------|----------------|----------|
| **UI SDK** | Pages · Forms · Cards · native render | `ui.routes` + host component registry |
| **Data SDK** | CRUD · search · relations | Data API (§5) |
| **Auth SDK** | User · seller profile · roles | Rimvio identity + platform roles |
| **Context SDK** | Location · intent · preferences | Context API (§6) |
| **Action SDK** | Workflows · jobs · events | Runtime job queue |
| **Capability SDK** | Declare + handle invocations | Capability API (§7) |
| **Commerce SDK** | Price · order · settlement hooks | Composition to payment platforms |
| **Agent SDK** | Discovery metadata · approval UX | Capability registry |
| **Storage SDK** | Images · files (scoped blob) | `storage.<platform>.*` permission |

**Rule:** SDK calls are **typed wrappers** — they cannot bypass Permission Model checks.

---

## 5. Data API

### 5.1 Tenant isolation

```text
Rimvio Platform Database
└── tenant: platform.used-market
    ├── listings
    ├── orders
    ├── messages
    └── reviews
```

- **Platform A data never reads Platform B** unless explicit `composition.imports` + user Commit on cross-platform action.
- Row-level ACL: `ownerUserId` required on user-generated collections.

### 5.2 TypeScript surface

```ts
const listing = await rimvio.db.collection("listings").create({
  title,
  priceKrw: { value: 350_000, unit: "KRW", basis: "total" },
  sellerId: rimvio.auth.userId,
  images: await rimvio.storage.upload(files),
});

const nearby = await rimvio.db.collection("listings").search({
  where: { category: "bicycle" },
  near: rimvio.context.location,
  radiusKm: 10,
});
```

### 5.3 Permissions

| Permission | Meaning |
|------------|---------|
| `data.<collection>.read` | Read collection |
| `data.<collection>.write` | Create/update own rows |
| `data.<collection>.admin` | Platform operator (seller dashboard stats) |

Denied by default; declared in manifest `permissions.required`.

---

## 6. Context API

Platforms receive **granted slices** of Rimvio Context — not the full graph.

### 6.1 Read contract

```ts
const ctx = await rimvio.context.read([
  "user.id",
  "user.preferences",
  "location.coords",
  "intent.summary",
]);
```

### 6.2 Context catalog (SSOT)

`lib/hub/capability/context-catalog.ts` seeds Hub UI; published manifest `context.read[]` is the runtime grant list.

### 6.3 Rules

- **Confirmed** context is never silently overwritten (ADR-040).
- Platform cannot write Context — only emit **events** that Agent/Workspace may absorb via Reality Provider loop (ADR-051).
- Location requires `location.read` + user Field approval when precision &gt; city.

---

## 7. Capability API

### 7.1 Discovery

On publish, each `capabilities[]` entry registers in **Hub Capability Index**:

```text
market.create_listing
  platform: platform.used-market
  input: market.create_listing.v1
  risk: medium
  approval: required
```

Agent flow:

```text
User: "이 자전거 팔고 싶어"
  → Intent: sell + object(bicycle)
  → Discovery: market.create_listing
  → Platform: Used Market
  → Surface: SellForm (prefilled from Context)
  → Prepare listing
  → User Commit
  → Data: listings row + optional Globe pin
```

### 7.2 Invocation

```ts
// Agent / Runtime host
const result = await rimvio.capabilities.invoke({
  capabilityId: "market.create_listing",
  platformId: "platform.used-market",
  input: { title: "자전거", priceKrw: 150_000 },
  approvalPolicy: "user_required",
});
```

### 7.3 Auto-generated capabilities

When a platform defines collections + UI routes, Rimvio MAY synthesize CRUD capabilities:

```text
market.search          ← listings + search index
market.create_listing  ← explicit or synthesized
market.update_listing
market.delete_listing
```

Synthesized capabilities still appear in manifest review before publish.

---

## 8. Permission model (unified)

Four layers — all must pass before execution.

```text
┌─────────────────────────────────────┐
│ 1. Manifest declaration (static)    │
├─────────────────────────────────────┤
│ 2. Runtime grant (install / session)│
├─────────────────────────────────────┤
│ 3. User approval (Field / Commit)   │
├─────────────────────────────────────┤
│ 4. Sandbox policy (L2 only)         │
└─────────────────────────────────────┘
```

### 8.1 Permission classes

| Class | Examples | Risk |
|-------|----------|------|
| **Browser** | `browser.read`, `browser.write` | medium–high |
| **Account** | `coupang.account`, `payment.charge` | high |
| **Context** | `location.read`, `user.preferences.read` | low–medium |
| **Data** | `data.listings.write` | medium |
| **Network** | `network.outbound`, `network.<domain>` | medium |
| **Storage** | `storage.upload`, `storage.<platform>.*` | low |
| **Cross-platform** | `compose.platform.payments` | high |

### 8.2 Forbidden (always deny)

Same spirit as `FORBIDDEN_PLUGIN_PERMISSIONS` in `lib/platform/plugin-contract.ts`:

- `credential.extract`
- `truth_log.append`
- `bypass_sandbox`
- `cross_tenant.data.read`
- `auto_reality_commit`

### 8.3 Cross-platform composition

```json
"composition": {
  "imports": [
    { "platformId": "platform.payments", "capabilities": ["payment.charge"] }
  ]
}
```

- User sees **composed approval** — one Field flow for listing + payment + shipping.
- Each platform keeps tenant data; composition passes **references** (orderId, listingId), not raw DB access.

---

## 9. Runtime

### 9.1 Execution pipeline

```text
Capability invoke
  → Permission gate (§8)
  → Runtime tier router
       ├─ L1 Native: host SDK handler
       ├─ L2 Sandbox: isolated worker + policy
       └─ L3 External: signed webhook / RPC
  → Data / Context accessors (scoped)
  → Result + events
  → Verification (ADR-045 spine)
  → Prepare surface update (not auto Commit)
```

### 9.2 L2 sandbox policy

| Policy | Default |
|--------|---------|
| Network | allowlist from manifest |
| CPU / memory | quota per invoke |
| Storage | tenant prefix only |
| Secrets | platform vault refs only |

### 9.3 L3 external protocol

```text
Rimvio Hub
   ↕ HTTPS + capability JWT
Developer Runtime (self-hosted)
```

Manifest declares `runtime.tier: "external"` and `runtime.endpoint`.

---

## 10. UI rendering

L1 Native platforms register routes; Rimvio host renders inside Workspace / Field surfaces.

```text
Agent opens market.create_listing
  → Host loads platform.used-market bundle
  → Route /sell with Context props
  → Native components (not iframe) when L1
  → Sandboxed iframe / micro-frontend when L2
```

**Globe rule (ADR-022):** Search/listing **pins on 3D Globe** only after Reality Commit — not at draft/search.

---

## 11. Example: Used Market end-to-end

| User says | System path |
|-----------|-------------|
| "자전거 팔고 싶어" | `market.create_listing` → SellForm |
| "근처 자전거 찾아줘" | `market.search` + `location.read` |
| "팔고 배송까지" | `create_listing` → `payment.charge` → `shipping.quote` (composition) |

Developer A never teaches user B the UI — **Intent + Capability** is the entry.

---

## 12. Implementation map (Rimvio repo)

| Spec section | Current wire | Next |
|--------------|--------------|------|
| Manifest v1 | `lib/hub/capability/*` | Align wizard export to `RimvioPlatformManifest` |
| Permission | Hub step 3 · `lib/platform-sdk/permissions.ts` | Unified validator |
| Context catalog | `lib/hub/capability/context-catalog.ts` | Runtime grant enforcement |
| Capability registry | `lib/platform/extension-registry.ts` | Hub publish → registry |
| Data API | — | `lib/platform-sdk/data-api.ts` (host stub) |
| Agent discovery | ADR-045 `planObjectDiscovery` | Index from manifest `capabilities[]` |

**Do not:** second Runtime package · chat SSOT for capabilities · cross-tenant queries.

---

## 13. PR gate checklist

- [ ] Manifest validates against `rimvio.platform.manifest.v1`
- [ ] Every capability has input/output schema refs
- [ ] Permissions ⊆ declared manifest; no forbidden ids
- [ ] Data collections declare `isolation: tenant_strict`
- [ ] Context read ⊆ catalog; no write to Rimvio Context from platform
- [ ] Cross-platform imports listed in `composition`
- [ ] L2/L3 have sandbox or protocol block in manifest
- [ ] Unit Canon for money on cards (nightly + `/1박` vs total) — platform commerce obeys ADR-047 unit canon
- [ ] No auto Reality Commit from platform handler

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Platform** | Tenant-isolated SaaS package on Rimvio |
| **Capability** | Agent-discoverable unit of work |
| **Manifest** | Single published contract for a platform |
| **Composition** | Cross-platform capability import |
| **Prepare** | Mutate workspace / draft — pre-Commit |
| **Commit** | Human-owned Reality mutation |

---

## 15. Rimvio Builder (non-developer path)

**Canonical:** [RIMVIO_BUILDER_SPEC.md](./RIMVIO_BUILDER_SPEC.md) · ADR-055 · `/hub/build`

Natural language → **RIR** → Compiler → same `rimvio.platform.manifest.v1` as `/hub/submit`.

```text
Describe → Clarify → Blueprint → Generate → Preview → Test → Submit Review
```

General users never see code on L1; developers may open **Code** tab to export manifest.
