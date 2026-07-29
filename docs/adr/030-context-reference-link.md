# ADR-030: Context Reference Link — connect only with approval

**Status:** accepted 2026-07  
**Wire:** `lib/context-reference/` · pending create / Command Bar  
**Related:** ADR-029 New Intent → New Context · ADR-025 · ADR-027 One Globe · Article 0

## One sentence

> Context는 **독립 Reality Space**다. 연결은 병합·복사가 아니라 **사용자 승인 Reference Link**.

## Default (locked with ADR-029)

```
「오사카 4박5일 여행 짜줘」
  → NEW Osaka Trip Context
  → 기존 둔산동 맛집 Context는 그대로 (오염 ❌)
```

Globe grows as independent spaces:

```
Travel · Work · Life
  ├ 제주
  ├ 오사카
  ├ 둔산동 맛집
  └ …
```

## Link (opt-in)

```
User: 「제주 여행 스타일 적용해줘」 / chip 「제주 여행 스타일 적용」
  → AI finds Jeju Context
  → Preference extract (가격 · 이동 · 음식 · 속도)
  → Reference Link: Osaka ──ref──▶ Jeju
  → Apply preferences into Osaka Workspace (does NOT mutate Jeju)
```

| Verb | Meaning |
|------|---------|
| **Link / Reference** | Edge only — both Contexts stay whole |
| **Clone** (ADR-028) | New Context + same criteria, new place |
| **Migrate** (ADR-028) | Same Context, new anchor |
| **Merge / overwrite** | ❌ Forbidden as default |

## Cursor isomorphism

| Cursor | Rimvio |
|--------|--------|
| New project / codebase | New Context |
| Import / reference | Context Reference Link |
| Edit file in place | Work inside one Context |

## UI (spawn)

After NEW Context is created (or pending 「생성」):

```
📍 Osaka Trip
기존 Context 연결 (선택):
  □ 제주 여행 스타일 적용
  □ 내 맛집 취향 적용
  □ 이전 여행 예산 참고
```

No chip selected = no link. Trust = AI never silently binds memories.

## B2B later

Personal Context ⊥ Company Context — same rule: separate spaces, approved links only.

## PR reject

- Auto-linking related trips without a chip / explicit NL  
- Mutating the **source** Context when applying preference  
- Treating Link as merge into one EventCandidate  
- Re-introducing “always continue open hub” (violates ADR-029)

## Ship order

1. Link store + create API + list linkable candidates  
2. Offer chips after new Context commit  
3. Preference extract → Workspace / scout bias (thin first)  
4. NL 「스타일 적용」→ same create-link path  
