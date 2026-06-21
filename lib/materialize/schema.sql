-- Rimvio device materialization (SQLite / Capacitor Phase 2)
-- PWA v1: same schema mirrored in IndexedDB (lib/materialize/materialize-db.ts)
-- NOT logical SSOT — EventCandidate + feedCaptures remain SSOT.

CREATE TABLE IF NOT EXISTS capture_index (
  id TEXT PRIMARY KEY,
  file_hash TEXT UNIQUE,
  taken_at_iso TEXT NOT NULL,
  geohash TEXT,
  lat REAL,
  lng REAL,
  media_context_id TEXT NOT NULL,
  event_id TEXT,
  sync_state TEXT NOT NULL DEFAULT 'local'
    CHECK (sync_state IN ('local', 'queued', 'synced')),
  updated_at_iso TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS capture_index_taken_at_idx
  ON capture_index (taken_at_iso DESC);

CREATE INDEX IF NOT EXISTS capture_index_geohash_idx
  ON capture_index (geohash);

CREATE INDEX IF NOT EXISTS capture_index_sync_state_idx
  ON capture_index (sync_state);

CREATE TABLE IF NOT EXISTS vault_sync_queue (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('capture', 'media_blob', 'life_event')),
  media_context_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'syncing', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at_iso TEXT NOT NULL,
  updated_at_iso TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vault_sync_queue_status_idx
  ON vault_sync_queue (status, created_at_iso);

CREATE TABLE IF NOT EXISTS place_cache (
  geohash TEXT PRIMARY KEY,
  label TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  updated_at_iso TEXT NOT NULL
);
