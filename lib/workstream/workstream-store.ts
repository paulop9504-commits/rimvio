"use client";

import type { WorkstreamState } from "@/lib/workstream/types";
import { WORKSTREAM_UNTITLED } from "@/lib/workstream/types";

const STORAGE_KEY = "rimvio.workstream.v1";

type StoreShape = Record<string, WorkstreamState>;

/** Node / SSR — keep Act residue so soft-next + tests work without window. */
const memoryStore: StoreShape = {};

function readStore(): StoreShape {
  if (typeof window === "undefined") {
    return memoryStore;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape): void {
  if (typeof window === "undefined") {
    for (const key of Object.keys(memoryStore)) {
      if (!(key in store)) delete memoryStore[key];
    }
    Object.assign(memoryStore, store);
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function readWorkstream(
  contextEventId: string,
): WorkstreamState | null {
  const id = contextEventId.trim();
  if (!id) return null;
  return readStore()[id] ?? null;
}

export function ensureWorkstream(contextEventId: string): WorkstreamState {
  const id = contextEventId.trim();
  const existing = readWorkstream(id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const fresh: WorkstreamState = {
    contextEventId: id,
    title: WORKSTREAM_UNTITLED,
    phase: "scratch",
    events: [],
    updatedAtIso: now,
  };
  const store = readStore();
  store[id] = fresh;
  writeStore(store);
  return fresh;
}

export function writeWorkstream(state: WorkstreamState): WorkstreamState {
  const store = readStore();
  store[state.contextEventId] = state;
  writeStore(store);
  return state;
}
