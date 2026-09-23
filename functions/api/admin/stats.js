/* GET /api/admin/stats?days=7 — ملخص اللوحة: الأرقام الرئيسية والتوزيعات */
import { json } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  const now = Date.now(), from = now - days * 864e5, online = now - 75e3;
  const db = env.DB;
  const q = (sql, ...b) => db.prepare(sql).bind(...b);

  const [tot, onl, leads, series, pages, countries, cities, refs, utm, devices, oss, browsers, clicks, ret] =
    await db.batch([
      q(`SELECT COUNT(DISTINCT vid) visitors, COUNT(*) sessions, COALESCE(SUM(pages),0) pageviews,
                COALESCE(AVG(dur_ms),0) avg_ms, SUM(CASE WHEN pages<=1 THEN 1 ELSE 0 END) bounces
         FROM sessions WHERE started >= ?`, from),
      q(`SELECT COUNT(*) n FROM sessions WHERE last_ping >= ?`, online),
      q(`SELECT COUNT(*) n FROM leads WHERE ts >= ?`, from),
      q(`SELECT strftime('%Y-%m-%d', started/1000, 'unixepoch') d, COUNT(DISTINCT vid) v, COUNT(*) s, SUM(pages) p
         FROM sessions WHERE started >= ? GROUP BY d ORDER BY d`, from),
      q(`SELECT path k, COUNT(*) n, COUNT(DISTINCT vid) u FROM events WHERE type='pageview' AND ts >= ?
         GROUP BY path ORDER BY n DESC LIMIT 20`, from),
      q(`SELECT COALESCE(country,'—') k, COUNT(DISTINCT vid) n FROM sessions WHERE started >= ? GROUP BY k ORDER BY n DESC LIMIT 25`, from),
      q(`SELECT COALESCE(city,'—') k, COALESCE(country,'') c, COUNT(DISTINCT vid) n FROM sessions WHERE started >= ?
         GROUP BY k, c ORDER BY n DESC LIMIT 25`, from),
      q(`SELECT COALESCE(ref_host,'مباشر') k, COUNT(*) n FROM sessions WHERE started >= ? GROUP BY k ORDER BY n DESC LIMIT 15`, from),
      q(`SELECT COALESCE(utm_source,'—') src, COALESCE(utm_medium,'—') med, COALESCE(utm_campaign,'—') k, COUNT(*) n,
                COUNT(DISTINCT vid) u
         FROM sessions WHERE started >= ? AND utm_source IS NOT NULL GROUP BY src, med, k ORDER BY n DESC LIMIT 20`, from),
      q(`SELECT device k, COUNT(DISTINCT vid) n FROM sessions WHERE started >= ? GROUP BY k ORDER BY n DESC`, from),
      q(`SELECT os k, COUNT(DISTINCT vid) n FROM sessions WHERE started >= ? GROUP BY k ORDER BY n DESC`, from),
      q(`SELECT browser k, COUNT(DISTINCT vid) n FROM sessions WHERE started >= ? GROUP BY k ORDER BY n DESC`, from),
      q(`SELECT COALESCE(label, target) k, target t, COUNT(*) n FROM events WHERE type='click' AND ts >= ?
         GROUP BY k, t ORDER BY n DESC LIMIT 20`, from),
      q(`SELECT SUM(CASE WHEN c>1 THEN 1 ELSE 0 END) ret, COUNT(*) total FROM
         (SELECT vid, COUNT(*) c FROM sessions WHERE started >= ? GROUP BY vid)`, from)
    ]);

  const t = tot.results[0] || {};
  return json({
    days,
    totals: {
      visitors: t.visitors || 0, sessions: t.sessions || 0, pageviews: t.pageviews || 0,
      avg_sec: Math.round((t.avg_ms || 0) / 1000),
      bounce: t.sessions ? Math.round(100 * (t.bounces || 0) / t.sessions) : 0,
      online: onl.results[0]?.n || 0, leads: leads.results[0]?.n || 0,
      returning: ret.results[0]?.ret || 0
    },
    series: series.results, pages: pages.results, countries: countries.results, cities: cities.results,
    referrers: refs.results, campaigns: utm.results, devices: devices.results, os: oss.results,
    browsers: browsers.results, clicks: clicks.results
  });
}
