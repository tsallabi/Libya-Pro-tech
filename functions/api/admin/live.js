/* GET /api/admin/live — المتصفّحون الآن (نبضة خلال آخر 75 ثانية) */
import { json } from "../../_lib.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT sid, vid, started, last_ping, pages, dur_ms, current_path, entry, ref_host, utm_source, utm_campaign,
            country, city, region, device, os, browser, org
     FROM sessions WHERE last_ping >= ? ORDER BY last_ping DESC LIMIT 200`).bind(Date.now() - 75e3).all();
  return json({ now: Date.now(), online: results });
}
