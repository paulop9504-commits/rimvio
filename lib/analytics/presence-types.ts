/**
 * Guest-first presence — count active devices/sessions, not logged-in users.
 */

export const PRESENCE_ACTIVE_WINDOW_MS = 2 * 60_000;
export const PRESENCE_HEARTBEAT_MS = 45_000;

export type PresenceHeartbeatInput = {
  readonly deviceId: string;
  readonly sessionId: string;
  readonly surface?: string | null;
  readonly path?: string | null;
  /** Focused tab + recent interaction. */
  readonly working?: boolean;
};

export type PresenceActiveCounts = {
  readonly windowMinutes: number;
  readonly activeDevices: number;
  readonly activeSessions: number;
  readonly workingDevices: number;
  readonly asOfIso: string;
};

export function normalizePresenceIds(input: {
  deviceId?: string | null;
  sessionId?: string | null;
}): { deviceId: string; sessionId: string } | null {
  const deviceId = input.deviceId?.trim() ?? "";
  const sessionId = input.sessionId?.trim() ?? "";
  if (deviceId.length < 8 || deviceId.length > 80) {
    return null;
  }
  if (sessionId.length < 8 || sessionId.length > 80) {
    return null;
  }
  if (!/^[\w:-]+$/u.test(deviceId) || !/^[\w:-]+$/u.test(sessionId)) {
    return null;
  }
  return { deviceId, sessionId };
}

export function countPresenceRows(
  rows: readonly {
    device_id: string;
    session_id: string;
    working: boolean;
  }[],
  windowMinutes = PRESENCE_ACTIVE_WINDOW_MS / 60_000,
): PresenceActiveCounts {
  const devices = new Set<string>();
  const sessions = new Set<string>();
  let workingDevices = 0;
  for (const row of rows) {
    devices.add(row.device_id);
    sessions.add(row.session_id);
    if (row.working) {
      workingDevices += 1;
    }
  }
  return {
    windowMinutes,
    activeDevices: devices.size,
    activeSessions: sessions.size,
    workingDevices,
    asOfIso: new Date().toISOString(),
  };
}
