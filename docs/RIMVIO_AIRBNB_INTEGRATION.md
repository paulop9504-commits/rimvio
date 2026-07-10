# Rimvio × Airbnb 연동 가이드

## 요약

| 단계 | 방식 | Rimvio에서 가능한 것 | 승인 |
|------|------|---------------------|------|
| **0 — Handoff** | `airbnb.com` 딥링크 | 스카우트·예매 CTA → Airbnb 검색/지도 | 불필요 |
| **1 — 인벤토리** | Google Places + Airbnb UI | 지도 핀·피드 카드 (현재) | Google API 키 |
| **2 — Partner API** | [Homes API](https://developer.withairbnb.com/) | 실시간 리스팅·캘린더·예약 동기화 | **파트너 심사 필수** |

공식 Airbnb API는 일반 앱 개발자용 공개 API가 **아닙니다**. PMS·채널 매니저 등 **승인된 연결 파트너**만 `api.airbnb.com` Homes API를 사용할 수 있습니다.

비공식 스크래핑·역공학 API는 ToS 위반·차단 위험이 있어 Rimvio에서는 사용하지 않습니다.

---

## Rimvio 아키텍처 (Hub · Resource)

`docs/GLOBE_HUB_RESOURCE.md` 기준:

```
Integration (Airbnb / Google Places)
  → Factory (load-lodging-inventory-rows)
  → Resource (mapLodgingRowToContextResource)
  → ACTION (buildContextLodgingBookingHandoff)
```

### 코드 위치

| 파일 | 역할 |
|------|------|
| `lib/globe/context-hub/providers/airbnb/` | Airbnb 모드·URL·파트너 스텁 |
| `lib/globe/context-hub/resolve-lodging-booking-provider.ts` | `lodgingKind=airbnb` → Airbnb 핸드오프 |
| `lib/globe/context-action-injection/build-context-action-handoff.ts` | 예매 URL 생성 |
| `lib/globe/context-condition-ai/resolve-local-discovery-action.ts` | 「에어비앤비」→ `lodgingKind: airbnb` |

### Phase 0 (지금 동작)

사용자가 스카우트에서 **에어비앤비**를 선택하거나 「에어비앤비 숙소」라고 말하면:

1. 인벤토리는 기존처럼 **Google Places** (또는 mock)
2. **[예매] / Airbnb에서 보기** 탭 시 → `buildAirbnbLodgingSearchUrl()` 로 Airbnb 검색 URL 오픈
3. 체크인·체크아웃·인원·지도 bbox가 URL에 포함

환경 변수 없이도 `lodgingKind=airbnb`이면 handoff가 기본입니다.

### Phase 2 (파트너 승인 후)

`.env`에 파트너 자격 증명 설정:

```env
AIRBNB_PARTNER_CLIENT_ID=...
AIRBNB_PARTNER_CLIENT_SECRET=...
# 선택: AIRBNB_INTEGRATION_MODE=partner_api
```

`fetchAirbnbPartnerListings()` 에 OAuth + listing search를 구현하면 `LodgingProviderId`에 `airbnb`를 추가하고 Factory에서 병합할 수 있습니다.

---

## 파트너 신청 절차 (공식)

1. [developer.withairbnb.com](https://developer.withairbnb.com/) 에서 Connectivity / Homes API 프로그램 문의
2. NDA · API Terms · **데이터 보안 리뷰** 완료
3. 스코프 부여 후 OAuth 클라이언트 발급
4. `fetch-airbnb-partner-listings.ts` 에 실제 호출 구현

요구 사항 예: 운영 규모, 24/7 지원, 데이터 정확도 유지, mandatory feature 6개월 내 반영 ([API Terms](https://www.airbnb.com/help/article/3418)).

---

## 환경 변수

| 변수 | 설명 |
|------|------|
| `AIRBNB_INTEGRATION_MODE` | `handoff` (기본) · `disabled` · `partner_api` |
| `AIRBNB_PARTNER_CLIENT_ID` | 파트너 OAuth 클라이언트 ID |
| `AIRBNB_PARTNER_CLIENT_SECRET` | 서버 전용 시크릿 |
| `AIRBNB_PARTNER_API_BASE_URL` | 기본 `https://api.airbnb.com` |

---

## 테스트

```bash
npx tsx scripts/test-airbnb-lodging-handoff.ts
```

---

## 다음에 할 일 (선택)

1. 파트너 승인 전: handoff URL A/B · affiliate 파라미터 (정책 확인 후)
2. `lodgingKind=airbnb`일 때 Hub carousel에 「Airbnb에서 더 보기」 보조 CTA
3. 파트너 승인 후: `loadLodgingInventoryRows` 에 Airbnb inventory merge
4. Hub checkout (`prepare-lodging-hub-checkout`) 과 Partner reservation API 연동
