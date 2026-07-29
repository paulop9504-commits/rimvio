# ADR-038: Context Work Manager (Cursor working memory)

**Status:** accepted 2026-07  
**Wire:** `lib/workstream/sync-context-work-state.ts` · `resolve-next-work-action.ts` · Workspace progress strip  
**Related:** ADR-036 · ADR-037 · ADR-021

## One sentence

> **Keep Work State, not chat history.** Conversation proposes; Context State + Action Queue + Commit Ledger carry the job.

## Cursor ↔ Rimvio loop

| Cursor | Rimvio |
|--------|--------|
| User input | User intent |
| Grasp current files | Context analysis / Work State snapshot |
| Edit code | Reality / Workspace patch |
| Test | Verify (completeness · ask gate) |
| Next edit | Next Action prep |

## Separated stores

| Layer | Role | Not |
|-------|------|-----|
| Conversation | User ↔ AI turns | SSOT for trip facts |
| Context Work State | completed · pending · next_actions · % | Chat essay |
| Workstream Event Log | HotelSelected → HotelCommitted… | Search inventory |
| Commit Ledger | Field Reality Commit stamps | Soft prepare |

## “계속해”

Resolves via `resolveNextWorkAction` → enqueue first `nextActions[].enqueueUtterance` (e.g. `숙소 찾아줘`). User never re-explains the whole trip.

## UX

Workspace prompt strip: title · % · completed / in-progress / next · **[계속 진행]**

## PR reject

- Carrying trip SSOT only in conversation history + long prompts  
- Asking users to recreate Context when Work State already exists  
- Empty “골라 주세요” without next_actions
