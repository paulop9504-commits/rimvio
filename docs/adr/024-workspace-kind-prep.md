# ADR-024: Workspace Kind Prep — resources ready, one-tap open

**Status:** accepted 2026-07  
**Wire:** `lib/workspace-kind/` · `lib/copy/human-ko.ts` (`workspacePrep*`)  
**Related:** ADR-022 Context Workspace · ADR-013 · ADR-025 One Focus · Article 0

## One sentence

> 의도를 말하면 Rimvio가 **자원을 준비**하고, 사용자는 **버튼 한 번**으로 그 작업장을 연다.  
> 열린 뒤에는 **One Focus**만 보인다 (ADR-025).

Not “search results as the product.” Not “chat essay as the answer.” Not “all slots at once.”

## UX contract (locked)

```
NL Intent (Globe prompt)
  → classifyWorkspaceKind
  → Context create (「생성」) or Resume
  → runWorkspaceIntentContinuum
      · Workspace prep card (1 CTA)
      · One Focus surface
      · booking path seed (Execution Inbox + lodging Workspace)
  → Hotel Focus → booking.prepare → Field Commit
  → pending_payment → Hub checkout → Reality
```

| Layer | Owns |
|-------|------|
| Globe AI (Ingress) | Which **WorkspaceKind** |
| Prep card | Ready feel + **one CTA** |
| Context AI | Work **inside** the open workspace |
| Commit | Reality |

## v1 kinds only

| Kind | Example NL | Open hint |
|------|------------|-----------|
| `travel` | 오사카 4박 5일 여행 갈 거야 | `travel_workspace` → existing Context Workspace |
| `driver` | 오늘 대리 뛰러 갈게 | `driver_workspace_shell` (slots ready; live demand = stub) |

Further kinds (delivery, factory, trading, …) stay **out** until travel + driver 1-tap loop ships.

## Laws

1. **Slots are SSOT** — LLM must not invent the rail each turn.  
2. **Prep ≠ Commit** — opening workspace does not book / pay / write calendar.  
3. **Stub values OK** for driver demand/earnings until real tools exist — never fake confidence as live truth in user copy.  
4. **One primary CTA** — `workspacePrepOpenCta` (“작업장 열기”). No dashboard of competing opens on first paint.

## Reject in review

- Search hit list as the hero after trip/driver intent  
- Multi-CTA first paint (“검색 · 지도 · 채팅 · 열기”)  
- New WorkspaceKind without template + prep card + fail-closed classifier  
- Driver UI claiming live call density without a tool filler
