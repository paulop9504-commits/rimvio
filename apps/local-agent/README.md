# Rimvio Local Agent

PC에서 실행하는 Rimvio Local Agent MVP.

## Setup

```bash
cd apps/local-agent
npm install
npm run install-browser
```

## Environment

`.env` 파일 또는 환경변수:

| Variable | Description |
|----------|-------------|
| `RIMVIO_API_BASE_URL` | Rimvio API base (e.g. `http://localhost:3000`) |
| `RIMVIO_DEVICE_ID` | Paired device UUID |
| `RIMVIO_DEVICE_TOKEN` | One-time token from pairing |
| `RIMVIO_EXECUTION_ENGINE` | `browser` (default) or `mock` |
| `RIMVIO_HEARTBEAT_INTERVAL_MS` | Optional, default 15000 |
| `RIMVIO_TASK_POLL_INTERVAL_MS` | Optional, default 2000 |

## First pairing

1. Rimvio 웹 → 설정 → PC Agent → **페어링 코드 생성**
2. Local Agent 실행:

```bash
RIMVIO_API_BASE_URL=http://localhost:3000 \
RIMVIO_PAIRING_CODE=123456 \
RIMVIO_DEVICE_NAME="My PC" \
npm start -- --pair
```

3. 출력된 `RIMVIO_DEVICE_ID` / `RIMVIO_DEVICE_TOKEN`을 `.env`에 저장
4. `npm start`로 정상 실행

## Phase D — PDF module + install progress

- **PDF Reader** (`file.pdf`): user-approved `npm install pdf-parse` into `capability-modules/`
- Install progress reported to Rimvio UI (realtime `progress_pct`)
- WAITING tasks expire after 15 minutes without approval

### Tests in Rimvio UI

| Button | Flow |
|--------|------|
| 테스트 실행 | OPEN_URL only (browser.basic) |
| Capability 테스트 | demo.module → approve → install → resume |
| PDF Reader 설치 테스트 | file.pdf → approve → npm install → resume |

## Prerequisites

- `SUPABASE_SERVICE_ROLE_KEY` in Rimvio `.env.local` (API routes use service role after auth gate)
- Paired device credentials in `apps/local-agent/.env`


```
[AGENT] Connected
[AGENT] Device registered
[AGENT] Heartbeat started
[TASK] Received task ...
[BROWSER] Launching browser
[TASK] Completed ...
```
