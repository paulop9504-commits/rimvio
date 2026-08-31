/**
 * P9 — Shared Agent Event Log SSOT (Hub Operator + Agent home).
 */

import {
  applyControllerEventToLog,
  type AgentEventLog,
} from "@/lib/agent/events";
import type { HubAgentControllerEvent } from "@/lib/hub/dev/hub-agent-controller";
import { createEmptyAgentEventLog } from "@/lib/agent/events/agent-event-types";

const STORAGE_KEY = "rimvio.agent.event-log.v1";
const UPDATE_EVENT = "rimvio:agent-event-log-updated";

let memoryLog: AgentEventLog | null = null;

function readStoredLog(): AgentEventLog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AgentEventLog;
  } catch {
    return null;
  }
}

function persistLog(log: AgentEventLog): void {
  memoryLog = log;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(log));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    } catch {
      // ignore quota
    }
  }
}

export function readSharedAgentEventLog(): AgentEventLog {
  if (memoryLog) return memoryLog;
  memoryLog = readStoredLog() ?? createEmptyAgentEventLog();
  return memoryLog;
}

export function writeSharedAgentEventLog(log: AgentEventLog): void {
  persistLog(log);
}

export function mergeControllerEventToSharedLog(event: HubAgentControllerEvent): AgentEventLog {
  const next = applyControllerEventToLog(readSharedAgentEventLog(), event);
  persistLog(next);
  return next;
}

export function subscribeSharedAgentEventLog(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => listener();
  window.addEventListener(UPDATE_EVENT, handler);
  return () => window.removeEventListener(UPDATE_EVENT, handler);
}

export function clearSharedAgentEventLogForTests(): void {
  memoryLog = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
