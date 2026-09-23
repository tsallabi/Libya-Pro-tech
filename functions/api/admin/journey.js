/* GET /api/admin/journey?vid=... — رحلة زائر واحد: كل زياراته، الصفحات بالترتيب، النقرات، وطلباته إن وُجدت */
import { json, bad } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const vid = new URL(request.url).searchParams.get("vid") || "";
  if (!/^[a-z0-9]{8,40}$/.test(vid)) return bad("vid");
  const [s, e, l] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM sessions WHERE vid = ? ORDER BY started DESC LIMIT 50").bind(vid),
    env.DB.prepare("SELECT ts, sid, type, path, title, target, label FROM events WHERE vid = ? ORDER BY ts ASC LIMIT 500").bind(vid),
    env.DB.prepare("SELECT * FROM leads WHERE vid = ? ORDER BY ts DESC").bind(vid)
  ]);
  return json({ sessions: s.results, events: e.results, leads: l.results });
}
