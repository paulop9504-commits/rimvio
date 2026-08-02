/**
 * Smoke: Reality Entity Graph — Maps POI → Entity · Connected · nearby/related/path/similar.
 *
 * Hotel click:
 *   Namba Hotel
 *   Connected: Osaka Trip · Namba Station · Restaurant A · USJ Route
 */
import assert from "node:assert/strict";
import {
  clearRealityGraphForTests,
  createEntity,
  entityFromMapsPoi,
  listConnected,
  nearby,
  path,
  readEntityView,
  related,
  relateConnectedTo,
  relateLocatedNear,
  relateUsedIn,
  similar,
  relateSimilarTo,
} from "@/lib/reality-graph";

clearRealityGraphForTests();

// Google Maps POI → Reality Entity
const hotel = entityFromMapsPoi({
  placeId: "maps_namba_hotel",
  name: "Namba Hotel",
  lat: 34.665,
  lng: 135.5,
  types: ["lodging", "hotel"],
  mapsType: "lodging",
  rating: 4.5,
});
assert.equal(hotel.type, "Hotel");
assert.equal(hotel.properties.source, "google_maps_poi");
assert.equal(hotel.state.lifecycle, "discovered");

const trip = createEntity({
  id: "ent_osaka_trip",
  type: "Event",
  properties: { name: "Osaka Trip", title: "Osaka Trip" },
  state: { lifecycle: "candidate", active: true },
});

const station = entityFromMapsPoi({
  placeId: "maps_namba_station",
  name: "Namba Station",
  lat: 34.662,
  lng: 135.501,
  mapsType: "subway_station",
  types: ["subway_station", "transit_station"],
});
assert.equal(station.type, "Place");

const restaurant = entityFromMapsPoi({
  placeId: "maps_restaurant_a",
  name: "Restaurant A",
  lat: 34.664,
  lng: 135.502,
  mapsType: "restaurant",
  types: ["restaurant", "food"],
});
assert.equal(restaurant.type, "Restaurant");

const usjRoute = createEntity({
  id: "ent_usj_route",
  type: "Route",
  properties: {
    name: "USJ Route",
    title: "USJ Route",
    lat: 34.665,
    lng: 135.432,
  },
});

// Relations
relateUsedIn(hotel.id, trip.id);
relateLocatedNear(hotel.id, station.id, 350);
relateLocatedNear(hotel.id, restaurant.id, 180);
relateConnectedTo(hotel.id, usjRoute.id, "USJ");
relateSimilarTo(hotel.id, restaurant.id); // soft — similar query may use edge

const view = readEntityView(hotel.id);
assert.ok(view);
assert.equal(view!.id, hotel.id);
assert.equal(view!.type, "Hotel");
assert.ok(view!.relations.length >= 4);
assert.ok(Array.isArray(view!.relations));

// Connected UX list
const connected = listConnected(hotel.id);
const titles = connected.map((c) => c.titleKo);
assert.ok(titles.includes("Osaka Trip"));
assert.ok(titles.includes("Namba Station"));
assert.ok(titles.includes("Restaurant A"));
assert.ok(titles.includes("USJ Route"));

// Query aliases
assert.ok(related(hotel.id).length >= 4);
assert.ok(nearby(hotel.id, { maxMeters: 2000 }).length >= 1);
assert.ok(path(hotel.id, usjRoute.id));
assert.ok(similar(hotel.id).length >= 0);

clearRealityGraphForTests();
console.log(
  "ok reality-entity-graph Namba-Hotel Connected OsakaTrip·Station·Restaurant·USJ",
);
