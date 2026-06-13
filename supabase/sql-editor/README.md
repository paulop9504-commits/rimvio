# Supabase SQL Editor — Experience Bridge

프로젝트: **qbvvtzccmiufxgwehdnx**

## Private에 저장할 것 — **검증 스크립트 1개만**

Dashboard → SQL Editor → Private에서 **아래 3개 setup 스크립트는 삭제**하고,  
**`99-verify-experience-bridge.sql` 내용만** Private로 저장하세요.

| Private 저장 이름 (권장) | 파일 |
|---|---|
| `Schema and RLS Verification Checks` | `99-verify-experience-bridge.sql` |

01~03은 **이미 Run 완료**면 Private에 둘 필요 없습니다. (repo에만 보관)

## Private 정리 순서

1. Private 목록에서 아래 **전부 Delete**
   - Create Experience-Bridge Storage Bucket & Policies
   - Experience Bridge Contributions Tracking
   - Experience Bridge Contribution Storage
   - (옛) Schema and RLS Verification Checks — 있으면 삭제 후 새로 저장
2. `99-verify-experience-bridge.sql` 붙여넣기 → **Save → Private**
3. **Run** (Explain 말고 Run — 쿼리 여러 개면 Explain 에러 남)

## 정상 결과 (스크린샷 기준 OK)

| 체크 | 기대 |
|---|---|
| Storage policies | 4행 (delete / insert / public read / update) |
| Bridge table policies | 10행 (contributions **4** + participants 3 + bridges 3) |
| Bucket | `experience-bridge`, public, 50MB |
| Tables | 3개 · Functions 2개 (위쪽 쿼리 결과) |

## 처음부터 다시 적용해야 할 때만

Private가 아니라 **New query**에서 순서대로 Run:

1. `01-experience-bridge-core.sql`
2. `02-experience-bridge-contributions.sql`
3. `03-experience-bridge-media-storage.sql`
4. `04-experience-bridge-contribution-delete.sql` ← **043 · 본인 미디어 삭제**
5. `99-verify-experience-bridge.sql`

저장은 **99 하나만** Private에 두면 됩니다.
