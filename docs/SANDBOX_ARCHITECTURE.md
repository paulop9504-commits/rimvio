# Sandbox Architecture (Phase 1)

**SSOT:** `lib/sandbox/` · **Server entry:** `lib/sandbox/server.ts`  
**UI wire:** `lib/dev/rimvio-dev-agent/use-dev-agent-runtime.ts`

## Flow

```
Dev Agent UI
  → POST /api/sandbox/sessions
  → POST /api/sandbox/sessions/[id]/run  (async)
  → GET  /api/sandbox/sessions/[id]      (poll 500ms)
  → SandboxController
  → CapabilityRunner (hotel.search | hotel.detail)
  → PlaywrightBrowserRuntime | SimulatedBrowserRuntime
  → /sandbox/osakastay
```

## Session model

- In-memory store (`session-store.ts`) — Phase 2 adds persistence
- Events: `browser.launch`, `page.goto`, `input`, `click`, `extract`, `result`, …
- Screenshots: JPEG/WebP or SVG fallback → React `LiveSandboxFrame`
- Verification: `lib/sandbox/verify.ts` — output schema gate
- Ledger: `record-sandbox-execution.ts` → capability-ledger on success/fail

## Environment

| Variable | Purpose |
|----------|---------|
| `SANDBOX_BASE_URL` | Playwright navigation origin |
| `SANDBOX_PLAYWRIGHT=0` | Force simulated browser |
| `NEXT_PUBLIC_APP_URL` | Fallback base URL |

## Legacy

`lib/hub/dev/sandbox-preview.ts` — platform-host invoke for `?full=1` Hub workspace. Deprecated for default Dev Agent.
