import assert from "node:assert/strict";
import { verifySandboxOutput } from "../lib/sandbox/verify";

function main() {
  const ok = verifySandboxOutput("hotel.search", {
    hotelsFound: 8,
    location: "오사카, 일본",
    checkIn: "2024-06-01",
    checkOut: "2024-06-03",
  });
  assert.equal(ok.ok, true);

  const bad = verifySandboxOutput("hotel.search", { hotelsFound: -1 });
  assert.equal(bad.ok, false);

  const detail = verifySandboxOutput("hotel.detail", {
    hotelId: "grand-osaka",
    name: "호텔 그랜드 오사카",
  });
  assert.equal(detail.ok, true);

  const products = verifySandboxOutput("product.search", {
    products: [{ name: "MacBook Pro 14\"", price: "₩2,890,000", url: "/sandbox/shop/products/mbp-14" }],
  });
  assert.equal(products.ok, true);

  console.log("sandbox verify ok");
}

main();
