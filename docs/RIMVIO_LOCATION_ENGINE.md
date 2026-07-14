# Rimvio Location Engine

**Role:** World location understanding OS — not a map product shell.

```
User text / GPS
  → Location Engine
  → Reality Graph (`geo:*`) + Location Entity
  → Context / Planner / Scout
```

Downstream must prefer **Location Entity** / `geo:*` over raw vendor payloads.

## Have vs need

| Capability | Status |
|------------|--------|
| Reality Graph hierarchy (Country→…→Ward) | Have — `lib/reality-graph/` |
| Japan / China / Korea seed centroids | Have — expand seed over time |
| KR Kakao/Naver + Google Places (inventory) | Have — domain scouts / geocode paths |
| Nominatim forward + reverse + suggest | Have — `lib/location-engine/` MVP |
| World Provider failover hook | Have — graph → registry → Nominatim |
| Polygon boundaries | Need later (V2 `WorldGeoBoundary`) |
| Places POI live details in Location Entity | Partial — inventory APIs separate |
| Mapbox / HERE providers | Need later |

## API

| Route | Use |
|-------|-----|
| `GET /api/location/resolve?q=` | Text → Location Entity |
| `GET /api/location/reverse?lat=&lng=` | GPS → Location Entity |
| `GET /api/location/suggest?q=` | Autocomplete entities |
| `GET /api/location/geocode?q=` | Legacy area chips (Naver) |

## Entity ids

- Stable catalog: `geo:jp:tokyo:shinjuku`
- OSM bridge (outside seed): `geo:osm:node-123`
- Registry bridge: `geo:reg:목동`

Do **not** invent parallel `loc_*` types.

## Providers

```
reality_graph → registry (KR/overseas) → nominatim
```

Google / Kakao remain on scout / pin geocode paths; Location Engine is the shared normalize layer for world understanding.
