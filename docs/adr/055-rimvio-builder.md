# ADR-055: Rimvio Builder — natural language to Platform via RIR

**Status:** accepted 2026-08-28  
**Canonical:** [RIMVIO_BUILDER_SPEC.md](../RIMVIO_BUILDER_SPEC.md)  
**Wire:** `lib/platform-builder/` · `/hub/build`  
**Parent:** ADR-054 Platform SDK Spec

## One sentence

> **General users describe ideas; Rimvio Builder compiles RIR into the same Platform Manifest developers submit — no separate "easy mode" ecosystem.**

## Decision

1. **RIR** (`rimvio.builder.rir.v1`) sits between AI and `rimvio.platform.manifest.v1`.
2. **Vibe loop** — Describe → Blueprint → Generate → Preview → Test → Modify; no one-shot publish.
3. **Three levels** — Visual (L1) · Logic/Data (L2) · Code (L3) in one Builder shell.
4. **AI Product Agent** clarifies before generate; outputs blueprint card, not code.
5. **Capability Builder** is a smaller RIR `kind: capability` with optional platform link.
6. **Hub `/hub/submit`** remains developer path; **`/hub/build`** is Builder path — same manifest output.

## PR reject

- Builder-only manifest format
- LLM writes manifest JSON without RIR
- Code-first UI for L1 users
- Publish skipping preview/test gates
- Cursor clone (file tree SSOT) instead of RIR SSOT
