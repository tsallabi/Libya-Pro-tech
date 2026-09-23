/* GET /api/admin/export?type=leads|visitors&days=30 — ملف CSV للحملات (يفتح في Excel بالعربية) */
import { bad } from "../../_lib.js";

const csv = rows => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = v => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
};

export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const type = p.get("type"), days = Math.min(365, Math.max(1, Number(p.get("days")) || 30));
  const from = Date.now() - days * 864e5;
  let rows;
  if (type === "leads") {
    rows = (await env.DB.prepare(`SELECT datetime(ts/1000,'unixepoch') date, name, phone, email, company, sector,
      country, city, utm_source, utm_campaign, status, message FROM leads WHERE ts >= ? ORDER BY ts DESC`).bind(from).all()).results;
  } else if (type === "visitors") {
    rows = (await env.DB.prepare(`SELECT vid visitor, COUNT(*) visits, SUM(pages) pages, ROUND(SUM(dur_ms)/1000) seconds,
      MAX(country) country, MAX(city) city, MAX(device) device, MAX(os) os, MAX(ref_host) referrer,
      MAX(utm_source) utm_source, MAX(utm_campaign) utm_campaign,
      datetime(MIN(started)/1000,'unixepoch') first_seen, datetime(MAX(last_ping)/1000,'unixepoch') last_seen
      FROM sessions WHERE started >= ? GROUP BY vid ORDER BY last_seen DESC`).bind(from).all()).results;
  } else return bad("type");
  return new Response("﻿" + csv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8",
               "content-disposition": `attachment; filename="libyapro-${type}-${days}d.csv"`, "cache-control": "no-store" }
  });
}
