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
  utm_source TEXT, utm_campaign TEXT, status TEXT DEFAULT 'new', note TEXT,
  kind TEXT DEFAULT 'quote',   -- quote: طلب عرض سعر · demo: تسجيل لفتح الأنظمة · estimate: الحاسبة
  project TEXT,                -- المنظومة التي كان يشاهدها عند التسجيل
  answers TEXT                 -- إجابات الحاسبة (JSON)
);
CREATE INDEX IF NOT EXISTS idx_l_ts ON leads(ts);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- الرسالة الشهرية للمسجّلين على واتساب
CREATE TABLE IF NOT EXISTS wa_optout (phone TEXT PRIMARY KEY, ts INTEGER);
CREATE TABLE IF NOT EXISTS wa_sends (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, phone TEXT, issue TEXT, grp TEXT);
CREATE INDEX IF NOT EXISTS wa_sends_issue ON wa_sends(issue, phone);

-- ═══ الأكاديمية: الدورات والدروس والتسجيلات والدفع عبر ماي باي ═══
CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT, title TEXT NOT NULL, title_en TEXT,
  summary TEXT, summary_en TEXT, level TEXT, level_en TEXT, mode TEXT DEFAULT 'live', platform TEXT, starts_at TEXT,
  schedule TEXT, schedule_en TEXT, price REAL DEFAULT 0, seats INTEGER DEFAULT 0, cover TEXT, join_url TEXT,
  published INTEGER DEFAULT 0, sort INTEGER DEFAULT 0, ts INTEGER);
CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL, title TEXT,
  r2_key TEXT, size INTEGER, mime TEXT, sort INTEGER DEFAULT 0, ts INTEGER);
CREATE TABLE IF NOT EXISTS enrollments (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, ref TEXT UNIQUE, course_id INTEGER,
  name TEXT, phone TEXT, email TEXT, status TEXT DEFAULT 'pending', amount REAL, method TEXT, gateway TEXT,
  mypay_token TEXT, pay_url TEXT, access_code TEXT UNIQUE, paid_at INTEGER, paid_by TEXT, note TEXT, vid TEXT);
CREATE TABLE IF NOT EXISTS mypay_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, custom TEXT, token TEXT,
  status TEXT, event TEXT, sig_ok INTEGER, outcome TEXT, amount TEXT);
CREATE INDEX IF NOT EXISTS ix_enr_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS ix_les_course ON lessons(course_id);
-- تفاصيل الدورة (أضيفت 2026-11-10): المدة، لمن هي، المحاور، وما يخرج به المتدرب — سطر لكل بند
-- ALTER TABLE courses ADD COLUMN duration TEXT; duration_en, audience, audience_en, curriculum, curriculum_en, outcomes, outcomes_en
