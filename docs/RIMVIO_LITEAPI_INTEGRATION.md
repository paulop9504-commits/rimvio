# Rimvio × Nuitee Connect (LiteAPI) 연동

가입: [Nuitee Connect](https://connect.nuitee.com/login/)

## 1. 대시보드에서 API 키 복사

1. [connect.nuitee.com](https://connect.nuitee.com/) 로그인  
2. **API Keys** 메뉴에서 키 생성  
3. 샌드박스: `sandbox_` 접두사 · 프로덕션: `prod_` 접두사  
   ([인증 문서](https://docs.liteapi.travel/reference/authentication))

## 2. Rimvio `.env.local` 설정

```env
LITEAPI_API_KEY=sandbox_xxxxxxxx
LITEAPI_DISPLAY_CURRENCY=KRW
LITEAPI_GUEST_NATIONALITY=KR
LITEAPI_SEARCH_RADIUS_M=5000
LITEAPI_MARGIN_PERCENT=10
```

> API 키는 **서버 전용**. 클라이언트에 노출 금지 ([CORS 제한](https://docs.liteapi.travel/reference/prompt-for-vibe-coding-tools)).

## 3. 동작

| 단계 | Rimvio | LiteAPI |
|------|--------|---------|
| 스카우트 | `searchLiteApiLodgingNearby` | `POST /hotels/rates` |
| 객실 카드 | `roomOffers` (실 rate) + `mappedRoomId` → 객실 사진 | `offerId` / `rateId` |
| 결제 (다음 PR) | `prebook` → Payment SDK → `book` | [예약 플로우](https://docs.liteapi.travel/reference/prompt-for-vibe-coding-tools) |

`LITEAPI_API_KEY`가 있으면 `/api/globe/lodging-inventory`가 **LiteAPI 우선**, 없으면 Google Places fallback.

## 4. 테스트

```bash
# .env.local에 키 설정 후
npx tsx scripts/test-liteapi-lodging-search.ts
```

오사카 좌표(34.69, 135.50) 기준 호텔+객실이 나오면 OK.

## 5. 결제까지 (완료)

```
객실 선택 → GlobeHubCheckoutSheet
  → prebook (POST /api/hub/checkout/liteapi/prebook)
  → Nuitee Payment SDK (#liteapi-payment-target)
  → returnUrl /?hub_liteapi=return
  → book (POST /api/hub/checkout/liteapi/book)
  → HubActionRecord reserve + purchase
```

LiteAPI 재고(`provider=liteapi`)는 **rimvio_pg 대신** Nuitee 결제 SDK를 사용합니다.

## 코드 위치

- `lib/globe/context-hub/providers/liteapi/`
- `lib/globe/hub-checkout/liteapi/`
- `app/api/hub/checkout/liteapi/prebook/route.ts`
- `app/api/hub/checkout/liteapi/book/route.ts`
- `app/api/globe/lodging-inventory/route.ts`
