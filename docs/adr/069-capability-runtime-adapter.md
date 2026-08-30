# ADR-069: Capability Connector / Runtime Adapter

**Status:** accepted · 2026-08  
**Wire:** `lib/capability-runtime/` · ADR-045 (one Agent Runtime) · ADR-068  
**Related:** ADR-061 · ADR-066

## One sentence

> Main Agent invokes a Capability ID through a Policy Gateway into an Isolated Runtime. It never receives source, GitHub tokens, or raw secrets.

## Execution path

```
Main Agent → product.search (Capability ID)
  → Policy Gateway
  → Isolated Runtime (signed artifact / hosted / remote adapter)
  → Result
```

Not:

```
Main Agent → GitHub Token → Private Repo clone → execute
```

## Deploy models

| Model | Who builds | Who runs |
|-------|------------|----------|
| A `rimvio_hosted` | Rimvio | Rimvio sandbox |
| B `private_artifact` (default) | Dev CI → signed artifact | Rimvio runtime |
| C `dev_hosted` | Dev | Dev endpoint behind gateway |

## Secrets

Code holds **references**. Runtime injects values ephemerally. Logs are redacted (`sk-••••••••`).

## Verification

Private source is allowed. Rimvio still black-box tests Input / Output / Latency / Errors / Network.

## PR reject

- Agent prompt or loop receiving `GITHUB_TOKEN`
- Per-turn git clone as the execute path
- Secrets written into capability source
- Account-wide GitHub OAuth for a single repo connect
