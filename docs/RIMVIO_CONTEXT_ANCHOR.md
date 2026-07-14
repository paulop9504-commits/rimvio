# Rimvio Context Anchor System

**Layer:** Globe Ingress (create) + Reality Commit (mutate)  
**Related:** [RIMVIO_GLOBE_INGRESS.md](./RIMVIO_GLOBE_INGRESS.md) · Article 0

## One-line

Travel Context is a **reality project** on the globe. Its **Anchor** is where search/recommend/run attach — not a raw GPS feed.

```
Travel Context
  └── Anchor (spatial truth for this context)
        ├── Shanghai (city, provisional)
        └── later → Hongqiao / People's Square / Disney
```

## Create path (V1)

1. User: 「다음주 목요일 상하이 2박3일 여행갈거야」
2. `compileGlobeIngress` — structure only (no Commit)
3. **Pending Context Draft** — Name · Duration · Date · Anchor · Reality=Draft
4. Chat preview + chip **「생성」** / **「취소」**
5. On **생성** → progress lines → `ensureTripContextEvent` (Reality Commit) → Context Globe + Assistant

Mint without existing hub context **never** writes EventCandidate until 「생성」.

Resume / converge attach / hub refresh keep immediate ensure (already-owned context).

## Anchor move

NL: 「홍차오 근처로 맥락 위치 옮겨」→ confirm current → proposed → **「확인」** → `relocateGlobeContextPin`.

Drag: `proposeContextAnchorMoveFromDrag` then same confirm (do not call relocate without approval).

## Code

| Piece | Path |
|-------|------|
| Pending create store | `lib/globe-ingress/pending-context-create-store.ts` |
| Offer / commit create | `offer-pending-context-create.ts` · `commit-pending-context-create.ts` |
| Anchor move | `commit-context-anchor-move.ts` |
| Dispatch gate | `lib/context-run/dispatch-context-run.ts` |

## Forbidden

- Auto-placing a new Travel Globe before 「생성」
- Silent Anchor relocate (drag or NL) without confirm
- Treating Anchor as live GPS while on a trip project
