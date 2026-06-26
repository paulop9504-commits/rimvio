# Market trade Pull UI (experiment)

**Bookmark / revert point:** `bookmark/pre-transaction-dashboard` (commit `d71d85d`)

## What this adds

- `market_alignment_handshakes` trade fields (`trade_status`, `meet_at`, `meet_place_label`, …)
- **진행 중 거래** section on Field dashboard (`/field` + globe sheet)
- Pull UX: buyer starts trade from Field → stays on dashboard (no chat navigation)
- Seller confirms schedule from transaction card (no chat message for time/place)

## Revert entirely

```bash
git checkout bookmark/pre-transaction-dashboard
# or
git revert <experiment-commit-range>
```

## Revert only DB (Supabase)

Run in SQL editor (drops experiment columns):

```sql
alter table public.market_alignment_handshakes
  drop column if exists trade_status,
  drop column if exists meet_at,
  drop column if exists meet_place_label,
  drop column if exists meet_lat,
  drop column if exists meet_lng,
  drop column if exists schedule_candidates;
```

## Apply DB

Run `supabase/sql-editor/13-market-trade-session.sql` through `16-market-trade-schedule-v2.sql`, or migrations `055`–`058`.

## Scheduling v2 (buyer day → seller propose → buyer accept)

- Buyer picks **오늘/내일** date chips on Field **진행 중** card
- Seller proposes **time + meet-up place**
- Buyer taps **이대로 예약** → `confirmed`
- Handshake complete (**받았어요/넘겼어요**) only on dashboard — not in chat

## Try flow

1. Seeking user opens Field → taps listing → sends message (Pull mode)
2. **진행 중 거래** card appears (`scheduling`)
3. Buyer picks a date → seller proposes time/place → buyer accepts
4. Seeking card shows time · place · progress · **출발하기**
5. After meet → **받았어요/넘겼어요** on dashboard card
6. After depart → seller sees ETA · buyer sees **이동 중**
