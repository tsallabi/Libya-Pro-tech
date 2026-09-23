-- قاعدة التحليلات والعملاء المحتملين — Cloudflare D1 (libyapro-analytics)
-- التطبيق:  npx wrangler d1 execute libyapro-analytics --remote --file=db/schema.sql
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY, vid TEXT NOT NULL,
  started INTEGER NOT NULL, last_ping INTEGER NOT NULL,
  pages INTEGER DEFAULT 0, dur_ms INTEGER DEFAULT 0,
  entry TEXT, exit_path TEXT, current_path TEXT,
  ref TEXT, ref_host TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  country TEXT, city TEXT, region TEXT, tz TEXT, org TEXT, lang TEXT,
  device TEXT, os TEXT, browser TEXT, screen TEXT, ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_s_vid ON sessions(vid);
CREATE INDEX IF NOT EXISTS idx_s_started ON sessions(started);
CREATE INDEX IF NOT EXISTS idx_s_ping ON sessions(last_ping);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
  vid TEXT NOT NULL, sid TEXT NOT NULL, type TEXT NOT NULL,
  path TEXT, title TEXT, target TEXT, label TEXT, dur_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_e_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_e_sid ON events(sid);
CREATE INDEX IF NOT EXISTS idx_e_vid ON events(vid);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
  vid TEXT, sid TEXT, name TEXT, phone TEXT, email TEXT, company TEXT,
  sector TEXT, message TEXT, page TEXT, country TEXT, city TEXT,
  utm_source TEXT, utm_campaign TEXT, status TEXT DEFAULT 'new', note TEXT
);
CREATE INDEX IF NOT EXISTS idx_l_ts ON leads(ts);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
