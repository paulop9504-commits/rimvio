# Capability Architecture (Phase 1 stub)

**Status:** Phase 1 foundation  
**Canonical index:** `lib/platform-sdk/capability-index.ts`  
**Facade:** `lib/capability-core/`

## Namespaces (do not merge)

| Namespace | Module | Example IDs |
|-----------|--------|-------------|
| Hub published | `platform-sdk/capability-index` | `hotel.search` |
| Consumer catalog | `capability-registry` | `NAVIGATE`, `BOOK_HOTEL` |
| Runtime stages | `workstream/agent-capability-registry` | `booking`, `lodging` |
| Action OS `@` | `action-registry` | feature contracts |
| Hub dev tools | `hub/dev/agent-capability-registry` | `workspace.inspect` |

Import Hub capabilities via:

```typescript
import { readCapabilityIndex, publishStandaloneCapabilityEntry } from "@/lib/capability-core";
```

## Dev Agent Explorer

Fixtures (`lib/dev/rimvio-dev-agent/fixtures.ts`) seed the demo UI. Published entries from `capability-index` merge in at runtime via `listPublishedCapabilitySummaries()`.

## Sandbox execution

Default Dev Hub path: `lib/sandbox/` session API — **not** `sandbox-preview.ts` (legacy full Hub workspace).
