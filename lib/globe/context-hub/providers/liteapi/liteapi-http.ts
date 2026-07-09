import { readLiteApiKey } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";

export type LiteApiHttpError = {
  status: number;
  body: unknown;
};

export async function liteApiFetch<T>(input: {
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<{ ok: true; data: T } | { ok: false; error: LiteApiHttpError }> {
  const apiKey = readLiteApiKey();
  if (!apiKey) {
    return { ok: false, error: { status: 0, body: "liteapi_not_configured" } };
  }

  const response = await fetch(input.url, {
    method: input.method ?? "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-API-Key": apiKey,
    },
    body: input.body != null ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return { ok: false, error: { status: response.status, body } };
  }

  return { ok: true, data: body as T };
}
