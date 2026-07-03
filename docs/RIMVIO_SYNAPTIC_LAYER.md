# Rimvio Synaptic Layer

> **Product truth:** Rimvio is a **synaptic context graph** — facts and resources connect like neural edges; when context matches, edges **fire** and Rimvio **re-executes** via `@` contracts and prep surface.  
> **Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · **Active spine:** [ACTION_OS_SPINE.md](./ACTION_OS_SPINE.md) · **Experience layers:** [RIMVIO_EXPERIENCE_LAYERS.md](./RIMVIO_EXPERIENCE_LAYERS.md)

**One-liner (KO):** 맥락이 연결되면, Rimvio가 다시 실행한다.

Rimvio behaves like **neural synapses**: connections **grow**, **strengthen**, or **shrink** based on use. Product RECALL = **trigger edge**; ACTION = **re-execution** when the edge fires.

## Metaphor → mechanism

| Synapse behavior | Rimvio signal | Effect |
|------------------|---------------|--------|
| **확장 (Expand)** | New active surface path | New edge, small +weight, salience ↑ |
| **강화 (Strengthen)** | Execution success, habit | LTP-like +weight |
| **약화 (Weaken)** | Ignore, fail, cancel | LTD-like −weight |
| **축소 (Prune)** | Dismiss, repeated prune | −weight; removed if below cutoff |

**Spine alignment:** Context ingress → `@` registry → prep MAIN → archive rollup → MAIN ranking is the **synaptic spine** (`ACTION_OS_SPINE.md` § Synaptic law). Plasticity here affects which re-execution path surfaces next — not passive resurfacing.

## Storage

- `localStorage` key: `rimvio.synaptic-edges.v1`
- Edge id: `{surfaceId}:{capabilityId}`

## Write paths

- `expandSynapse` — surface collapse selects active primary
- `strengthenSynapse` / `weakenSynapse` / `pruneSynapse` — explicit API
- `applySynapticFromExecution` — execution dispatcher
- `applySynapticFromLearningObservation` — learning ingest

## Read path

- `getSynapticPriorityBoost` → Surface Engine priority score (with learning boost)

## Debug

Console: `[Rimvio Synapse] SYNAPSE_PLASTICITY`, `SYNAPSE_PRUNED`, `SYNAPSE_DECAY`

## UI

- `hooks/use-synaptic-snapshot.ts` — subscribe to synapse store
- `components/surface-composition/synaptic-habit-strip.tsx` — “자주 쓰는 경로” chips on feed
- `use-surface-engine` listens to `rimvio:synapse-updated` so ranking refreshes after plasticity

## Test

- `npm run test:synaptic` — plasticity cycle + priority boost
- `npm run test:synaptic-framing` — constitution/spine/experience-layer product keywords
