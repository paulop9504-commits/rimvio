import type { ProductSearchInput, ProductSearchOutput } from "../types";

export function validateProductSearchInput(input: Record<string, unknown>): {
  ok: true;
  value: ProductSearchInput;
} | {
  ok: false;
  errors: string[];
} {
  const errors: string[] = [];
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (!query) {
    errors.push("query must be a non-empty string");
  }
  const limit = input.limit;
  if (limit !== undefined && (typeof limit !== "number" || limit < 1 || limit > 50)) {
    errors.push("limit must be a number between 1 and 50");
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      query,
      limit: typeof limit === "number" ? limit : 5,
    },
  };
}

export function validateProductSearchOutput(output: unknown): {
  ok: true;
  value: ProductSearchOutput;
} | {
  ok: false;
  errors: string[];
} {
  const errors: string[] = [];
  if (!output || typeof output !== "object") {
    return { ok: false, errors: ["output must be an object"] };
  }
  const record = output as Record<string, unknown>;
  if (!Array.isArray(record.products)) {
    return { ok: false, errors: ["products must be an array"] };
  }
  const products: ProductSearchOutput["products"] = [];
  for (const [index, item] of record.products.entries()) {
    if (!item || typeof item !== "object") {
      errors.push(`products[${index}] must be an object`);
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string" || !row.name.trim()) {
      errors.push(`products[${index}].name must be a non-empty string`);
    }
    if (typeof row.price !== "string" || !row.price.trim()) {
      errors.push(`products[${index}].price must be a non-empty string`);
    }
    if (typeof row.url !== "string" || !row.url.trim()) {
      errors.push(`products[${index}].url must be a non-empty string`);
    }
    products.push({
      name: String(row.name ?? ""),
      price: String(row.price ?? ""),
      url: String(row.url ?? ""),
    });
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { products } };
}
