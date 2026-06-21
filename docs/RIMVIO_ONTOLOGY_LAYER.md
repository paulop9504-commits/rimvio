# Rimvio Ontology Layer (Personal Action Ontology)

> **Status:** locked 2026-06  
> **Rule:** EventCandidate remains SSOT — ontology objects are **read-only projections**.  
> **Companion:** `docs/RIMVIO_SEMANTIC_LAYER.md` (SPO triples), `docs/ACTION_OS_SPINE.md`

---

## Three pillars (2026-06)

### 1. Notification objects

Single inbox queue — no map banners / stack duplicate cards.

```text
bridge invite · bridge activity · location confirm
  → projectPendingNotifications()
  → GlobeInboxSheet · Stack inbox hint
```

Dismiss SSOT: `lib/ontology/notifications/notification-store.ts` (mirrors legacy keys).

### 2. Experience subgraph

```text
EventCandidate
  → projectExperienceSubgraph()
      experience (node)
      captures[] (nodes)
      bridge | null (node)
```

Use for Bridge media trust, companion status, and future cross-object queries — **never** a second event store.

### 3. Action types (@ + hub)

```text
mention.{featureId}  — @ registry
hub.{connect_*|enable_*} — context hub services
  → rankWeight → scoreHubServiceRowBase → MAIN / hub rail
```

LLM reads PRM; execution stays on contract gate + hub handlers.

---

## Forbidden

- Persisted notification / capture / bridge tables parallel to EventCandidate
- Graph explorer UI
- LLM-invented action types outside registry

---

## Modules

| Path | Role |
|------|------|
| `lib/ontology/notifications/*` | Notification projection + dismiss store |
| `lib/ontology/nodes/*` | Experience · Capture · Bridge nodes |
| `lib/ontology/actions/*` | Unified action type registry |
| `hooks/use-globe-inbox.ts` | Inbox hook → notifications |
| `scripts/test-ontology-layer.ts` | Regression |
