import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import type { AlignmentChatListItem } from "@/lib/peer-chat/alignment-chat-types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchAlignmentChatsRemote(): Promise<{
  items: AlignmentChatListItem[];
}> {
  const response = await fetchWithTimeout(
    `${resolveAppOrigin()}/api/peers/alignment-chats`,
    { credentials: "include", timeoutMs: 12_000 },
  );
  return parseJson(response);
}
