CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  path TEXT,
  page TEXT,
  session_id TEXT,
  data TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON analytics_events (created_at);

CREATE INDEX IF NOT EXISTS analytics_events_event_idx
  ON analytics_events (event);
