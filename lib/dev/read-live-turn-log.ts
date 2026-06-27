import { readFileSync, existsSync } from "node:fs";
import type { LiveTurnLogEntry } from "@/lib/self-learning/live-turn-types";
import { getLiveTurnLogPath } from "@/lib/self-learning/append-live-turn";

export function readLiveTurnLog(limit = 80): LiveTurnLogEntry[] {
  const path = getLiveTurnLogPath();
  if (!existsSync(path)) {
    return [];
  }

  try {
    const raw = readFileSync(path, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const entries: LiveTurnLogEntry[] = [];

    for (const line of lines.slice(-limit)) {
      try {
        const parsed = JSON.parse(line) as LiveTurnLogEntry;
        if (parsed?.type === "live_turn" && parsed.userMessage) {
          entries.push(parsed);
        }
      } catch {
        // skip malformed line
      }
    }

    return entries.reverse();
  } catch {
    return [];
  }
}
