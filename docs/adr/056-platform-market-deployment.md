# ADR-056: Platform Market Deployment

**Status:** Accepted  
**Parent:** ADR-054 Platform SDK · ADR-055 Rimvio Builder

## Context

Commerce platforms (resale, payments, shipping, booking, hiring) are **country-shaped**. Law, tax, privacy, payment rails, address systems, and language differ per market. Treating `Country: Korea` as a single field on Platform registration is insufficient.

## Decision

Separate **Platform Identity** from **Market Deployment**.

```text
Developer → Platform Owner → Platform (Core) → Market Deployments (KR · JP · US · SG)
```

### Invariants

1. **Platform Core** stays country-agnostic (product model, capabilities graph, UI routes).
2. **Market Deployment** owns country-bound config: locale, currency, timezone, address, payment, tax, legal, privacy, data residency, shipping, seller flow.
3. **Capabilities** may declare `markets[]` — omit = all approved deployments.
4. **Capability Index** entries are keyed by `(platformId, capabilityId, marketCountry)`.
5. **Discovery** filters by resolved user market — never GPS alone.
6. **Publish** requires ≥1 market at 100% readiness.
7. **Global** is a product intent flag, not a deployable market — each country still needs its own deployment.

### User market dimensions (Context)

| Field | Use |
|-------|-----|
| `accountCountry` | Default discovery |
| `residenceCountry` | Tax / eligibility |
| `currentLocationCountry` | Nearby / pickup |
| `billingCountry` | Payments |
| `shippingCountry` | Fulfillment |
| `platformMarket` | Explicit override |

Platforms declare `markets.contextPolicy` for which dimension wins.

### Wire

- Types: `lib/platform-sdk/markets.ts` · `user-market-context.ts`
- Manifest: `operator` + `markets` on `rimvio.platform.manifest.v1`
- Hub: `MarketDeploymentPanel` on package + review steps
- Builder: RIR `markets` + utterance-driven market add (e.g. Japan)
- Discovery: `planCapabilityDiscovery({ utterance, userMarket })`

### SDK surface (host)

Platform code reads standard context paths — not `if (country === "KR")` in product logic:

- `market.country`
- `locale.currency`
- `user.country` / `user.residence_country`
- `rimvio.commerce.*` (future — country-abstracted commerce)

## Consequences

- Adding a country = new Market Deployment + review, not a new Platform.
- Partial rollout: KR approved, JP pending — Hub shows availability per market.
- Tests must include `markets` on manifests and `marketCountry` on index entries.

## Reject

- Single `country` field as only market SSOT
- Discovery without market filter
- Publishing markets below 100% readiness
- GPS-only user country inference for commerce routing
