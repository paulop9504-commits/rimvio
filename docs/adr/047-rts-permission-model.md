# ADR-047: RTS Permission Model — shared Map, owned Units

**Status:** accepted 2026-08-05  
**Wire:** `lib/context-workspace/rts-share/` · `lib/globe/resume-sidebar/` · `commit-workspace-invite-accept` · Resume invite ✓/✗ · Share settings sheet  
**Related:** ADR-005 · ADR-014 · ADR-022 · ADR-037

## One sentence

> **Same Map (Context), different Players — each Reality Object has one Owner; allies ping and propose, never drive another player's units.**

## Share settings (Sheets-style)

| Sheets | Rimvio role |
|--------|-------------|
| Owner | `map_owner` |
| Editor | `player` (own Objects only) |
| Commenter | `suggest` |
| Viewer | `viewer` |

Object field: `ContextWorkspaceNode.ownerUserId`.

## Workspace Invite Commit

```
Invite → sidebar ✓/✗ → ✓ = Shared Capsule + sync start
```

≠ Reality Commit (payment/reserve).

## PR reject

- Ally Edit+Commit on foreign Objects
- Ownerless Commit on shared POI
- Friends ROOM listed as Workspace Capsule kind
- Spreadsheet co-edit as the collab story
