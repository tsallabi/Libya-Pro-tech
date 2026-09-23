/* GET /api/admin/visitors?days=7&country=LY&q=... — قائمة الزيارات مع الفلاتر (للاستهداف والتصدير) */
import { json } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const days = Math.min(365, Math.max(1, Number(p.get("days")) || 7));
  const where = ["s.started >= ?"], bind = [Date.now() - days * 864e5];
  if (p.get("country")) { where.push("s.country = ?"); bind.push(p.get("country")); }
  if (p.get("city")) { where.push("s.city = ?"); bind.push(p.get("city")); }
  if (p.get("device")) { where.push("s.device = ?"); bind.push(p.get("device")); }
  if (p.get("source")) { where.push("(s.utm_source = ? OR s.ref_host = ?)"); bind.push(p.get("source"), p.get("source")); }
  if (p.get("page")) { where.push("EXISTS (SELECT 1 FROM events e WHERE e.sid = s.sid AND e.path = ?)"); bind.push(p.get("page")); }
  const { results } = await env.DB.prepare(
    `SELECT s.sid, s.vid, s.started, s.last_ping, s.pages, s.dur_ms, s.entry, s.exit_path, s.ref_host,
            s.utm_source, s.utm_medium, s.utm_campaign, s.country, s.city, s.region, s.device, s.os, s.browser, s.org, s.lang,
            (SELECT COUNT(*) FROM sessions x WHERE x.vid = s.vid) visits,
            (SELECT name FROM leads l WHERE l.vid = s.vid ORDER BY ts DESC LIMIT 1) lead_name
     FROM sessions s WHERE ${where.join(" AND ")} ORDER BY s.started DESC LIMIT 300`).bind(...bind).all();
  return json({ rows: results });
}
