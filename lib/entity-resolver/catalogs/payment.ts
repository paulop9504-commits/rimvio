import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";

/** P3 — Currency / payment. */
export const PAYMENT_CATALOG: readonly EntityCatalogEntry[] = [
  {
    id: "payment:jpy",
    labelKo: "엔",
    queryKo: "엔화",
    kind: "Product",
    pattern: /엔화|\bjpy\b|japanese\s*yen|円(?!\w)/iu,
    aliases: ["JPY", "円", "yen"],
    semanticPath: ["Currency", "JPY", "Finance"],
    confidence: 0.85,
  },
  {
    id: "payment:paypay",
    labelKo: "PayPay",
    queryKo: "PayPay",
    kind: "Product",
    pattern: /pay\s*pay|페이페이|ペイペイ/iu,
    aliases: ["PayPay"],
    semanticPath: ["Payment", "Wallet", "Finance"],
    confidence: 0.92,
  },
  {
    id: "payment:cash",
    labelKo: "현금",
    queryKo: "현금",
    kind: "Product",
    pattern: /현금|cash\s*only|現金/iu,
    aliases: ["cash", "現金"],
    semanticPath: ["Payment", "Cash", "Finance"],
    confidence: 0.84,
  },
];
