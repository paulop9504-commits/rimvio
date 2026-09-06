# Rimvio Development Workflow

## Branches

- `main` — stable integration branch.
- `feature/<area>-<short-name>` — feature work.
- `fix/<area>-<short-name>` — bug fixes.
- `docs/<short-name>` — documentation-only changes.

## Pull requests

All non-trivial changes should use a pull request. Keep PRs focused and explain the problem, scope, validation, and risk.

## Rimvio areas

- Agent
- Capability
- Runtime
- Standard
- Security / Permission
- Verification
- Hub / UX
- Infrastructure

## Definition of done

- Code is scoped to the issue.
- Relevant tests pass.
- Lint/build validation has been run when applicable.
- No credentials or secrets are committed.
- Behavior and failure modes are documented when the change affects the Agent Runtime or Standard.

## Commit style

Prefer concise conventional prefixes such as `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, and `chore:`.
