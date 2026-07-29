# ADR-031: Globe AI = OS Launcher · Context AI = Project Agent

**Status:** accepted 2026-07  
**Wire:** Globe compose / ingest · `lib/workspace-sdk/` · ADR-029 spawn · ADR-030 links  
**Related:** ADR-022 · ADR-025 · ADR-026 · ADR-028 · ADR-029 · ADR-030 · Article 0

## One sentence

> **Globe AI는 일하는 곳이 아니라 Reality 프로젝트를 여는 OS 런처다.**  
> **Context AI는 열린 Workspace 안에서 같이 Reality를 만드는 Agent다.**

## Cursor isomorphism

| Cursor | Rimvio |
|--------|--------|
| Command Palette | Globe AI (“무엇을 만들까요?”) |
| Open project | New Context + Workspace |
| Agent in repo | Context AI inside Workspace |
| Chat dump as product | ❌ |

## Flow

```
🌍 Globe
  [무엇을 만들까요?]
        ↓
  Intent Compiler
        ↓
  New Context? (ADR-029 — default YES)
        ↓
  Context + Workspace SDK open
        ↓
  Context AI: “같이 Reality를 만들어요”
        ↓
  Optional Reference chips (ADR-030) — inside Workspace
        ↓
  Focus → Action → Commit
```

Globe AI **does not** essay-answer “제가 여행 계획 만들어볼게요” alone.  
It **opens the work space**; Agent works **with** the user inside it.

## Feel

Toss-like: Intent → space appears → next step.  
Not: chat fills with a finished plan while user stays passive.

## Globe chrome (first paint)

```
🌍 Your Reality Globe
“무엇을 만들까요?”
```

No search-engine hero. No dual-planet toggle (ADR-027).

## Roles

| Surface | Owns | Forbidden |
|---------|------|-----------|
| **Globe AI** | Intent → spawn / route | Long trip essays · silent merge into open hub |
| **Context AI** | Focus · Command Bar · Links · prepare | Reality Commit without human |
| **Field** | Approve · trade · queue | Creating new trip Context |

## PR reject

- Globe compose as primary “chat product” that answers plans without opening Workspace  
- Context create that dumps full itinerary in Globe thread as SSOT  
- Auto-binding previous Context without ADR-030 chips / explicit NL  
- Calling Globe home “AI assistant app”

## Ship notes

1. L1: launcher placeholder + Workspace open strip (“같이…”)  
2. Continuum / 「생성」→ `dispatchWorkspaceSdkOpen` (already) + collaborative strip  
3. Reference chips after open (ADR-030) inside Context thread  
4. Motion polish (card fly Globe → Workspace) — progressive  
5. Marketplace Continuum — ADR-032 (`used_goods` WorkspaceKind)  
6. **Superseded product surface:** ADR-035 RIMVIO Command — one Command Bar; Globe AI hidden Create route  
