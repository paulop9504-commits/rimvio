/** Default passive burst cadence while the app is open (no continuous watch). */
export const GPS_PING_INTERVAL_MS = 15 * 60 * 1000;

/** Slower passive bursts while dwelling in one place. */
export const GPS_PING_INTERVAL_DWELL_MS = 30 * 60 * 1000;

/** Shorter passive bursts while recent movement suggests travel. */
export const GPS_BURST_MOVEMENT_INTERVAL_MS = 5 * 60 * 1000;

/** Movement session length after a step change is detected. */
export const GPS_BURST_MOVEMENT_SESSION_MS = 30 * 60 * 1000;

/** Min gap between passive bursts (also used for foreground stale check). */
export const GPS_BURST_PASSIVE_MIN_GAP_MS = 5 * 60 * 1000;

/** Foreground return — passive burst only if last ping is older than this. */
export const GPS_BURST_FOREGROUND_STALE_MS = GPS_BURST_PASSIVE_MIN_GAP_MS;

/** Dedupe rapid active bursts (capture/upload). */
export const GPS_BURST_ACTIVE_DEDUPE_MS = 15_000;

/** Step distance (km) between last two pings → movement session. */
export const GPS_BURST_MOVEMENT_STEP_KM = 0.4;

/** Keep pings for 48 hours (enough for same-day uploads). */
export const GPS_PING_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export const GPS_PING_MAX_COUNT = 500;

/** Match upload time to a ping within ±15 minutes. */
export const GPS_PING_MATCH_WINDOW_MS = 15 * 60 * 1000;

/** Fall back to the latest ping within 30 minutes before upload. */
export const GPS_PING_FALLBACK_LOOKBACK_MS = 30 * 60 * 1000;
