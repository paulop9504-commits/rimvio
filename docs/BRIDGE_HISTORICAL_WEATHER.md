# Bridge Historical Weather

> **Golden rule:** Always preserve the reality of the moment, not the reality of the upload.

Bridge weather is stored at **experience time (Event Date)**, never at bridge `createdAt`.

## Example

| Field | Value |
|-------|-------|
| Photo taken | 2025-01-01 |
| Bridge created | 2025-01-05 |
| Place | 상하이 |

**Store:** 상하이 · 2025-01-01 weather  
**Never store:** 상하이 · 2025-01-05 weather

## Weather Resolution Priority

1. Photo EXIF / capture timestamp (`feedCaptures`)
2. Event start date (`event.datetime`)
3. Visit date (`metadata.globeVisitDateIso`)
4. Check-in / check-out (`planWindowStart` / `planWindowEnd`)
5. Bridge created date (`event.createdAt`) — last resort

## Schema (`metadata.bridgeWeather`)

```ts
weather: {
  eventDate: "2025-01-01",
  location: "Shanghai",
  condition: "Cloudy",
  temperature: 6,
  high: 9,
  low: 3,
  source: "historical_weather",
  eventTimeSource: "photo_exif",
  resolvedAtIso: string,
}
```

## Code SSOT

| Piece | Path |
|-------|------|
| Event time | `lib/globe/bridge-weather/resolve-bridge-event-time.ts` |
| Weather target | `lib/globe/resolve-bridge-context-weather-target.ts` |
| Historical fetch | `lib/context-resolver/weather/fetch-historical-weather.ts` |
| Stamp / read | `lib/globe/bridge-weather/bridge-weather-metadata.ts` |
| API | `app/api/context/weather/forecast/route.ts` |

## Context principle

Bridge answers **when did you experience this?** — not when was it uploaded.

Weather, season, time-of-day, sunrise/sunset must anchor on **Event Time**.
