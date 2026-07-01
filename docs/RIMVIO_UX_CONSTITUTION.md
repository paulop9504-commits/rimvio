# Rimvio UX Constitution

**Status:** locked · PR review + Cursor tasks  
**Related:** `.cursor/rules/rimvio-globe-field.mdc` · `docs/RIMVIO_CONSTITUTION.md`

---

## 한 줄 분류기 (모든 기능 추가 시)

> **이 순간 사용자가 할 수 있는 답이 사실상 하나(Yes)뿐인가?**

| 판별 | UI | 이유 |
|------|-----|------|
| **예** — 확인·선택·실행만 남음 | **Field** 버튼 + 상태머신 | 모호함 없음. 채팅은 마찰 |
| **아니오** — 여러 방향·조건·의도 가능 | **Globe** 채팅 (기존 파이프라인) | AI가 유연하게 받아야 함. **새 UI 금지** |

**자연어가 필요 없어지는 순간 자연어를 강제하지 않는다.**

---

## 두 표면 (조건 아키텍처)

| | Globe | Field |
|---|--------|--------|
| **역할** | 무엇을 원하는가 — **조건 생성** | 그 원함이 어떻게 이루어지는가 — **매칭·실행** |
| **입력** | 채팅만 (유일한 생성 지점) | 버튼 · FSM · 실시간 동기화 |
| **지도** | 핀만 (박힌 결과) | — |
| **금지** | 지도 위 카드·체크리스트·설문 | 새 자원 생성 · 모호한 단계를 채팅으로 |

### Globe — 조건이 확정되기 전

- Intent spectrum: `chatting` → `soft_signal` → `confirmed` (draft는 confirmed 이후)
- 대화 페르소나 + 백그라운드 슬롯 추출 (한 프롬프트에 섞지 않음)
- 사진·텍스트 동일 메시지 파이프라인
- `AgentProgressList` — 진행 **표시**만 (읽기 전용)

### Field — 조건이 확정된 후

- 매칭·조회·문의·예약·출발·완료
- `MarketTradeProgressCard` · `ResourceStatus` · trades 탭
- 노쇼 방지·약속 확정 = 버튼 (채팅 라운드트립 금지)
- 거래 대화 진입은 **기존** peer chat 파이프라인 재사용

---

## 예시

| 기능 | 분류 | 이유 |
|------|------|------|
| "아이폰 얼마에 팔 수 있어?" | 채팅 | 의도·조건 미확정 |
| 등록 완료 후 [내 지구에서 보기] | 버튼 | 답 하나 |
| 날짜 고르기 · 약속 확정 · 출발하기 | Field FSM | 실행 단계 |
| 노쇼 신고 | 버튼 | 답 명확 |
| "오해였어요" 소명 | 채팅 (peer) | 여러 방향 |
| AI 매칭 찾는 중 | `AgentProgressList` (표시) | 생성 아님 · 모니터링 |

---

## PR reject

- 잡담·미분류 텍스트 → `context_connect` / 활성 클러스터 자동 바인딩
- 확정 후 "진짜 갈 거예요?" 같은 AI 재확인 채팅
- Field에서 새 compose UI / 별도 등록 폼
- Globe 지도 위 draft 카드·체크리스트
- 채팅 + JSON 추출 단일 LLM 호출 (페르소나와 추출 분리 필수)

---

## Cursor 프롬프트 헤더 (복붙용)

```
[Rimvio UX] 분류: Yes 하나뿐 → Field 버튼/FSM. 여러 방향 → Globe 채팅(기존 파이프라인, 새 UI 금지).
Globe=조건 생성, Field=조건 실행. docs/RIMVIO_UX_CONSTITUTION.md
```
