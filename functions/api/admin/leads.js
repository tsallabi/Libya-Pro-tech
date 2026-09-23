/* GET /api/admin/leads — العملاء المحتملون · PATCH { id, status, note } — تحديث الحالة */
import { json, bad, clip } from "../../_lib.js";
const STATUS = new Set(["new", "contacted", "meeting", "proposal", "won", "lost"]);

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM sessions s WHERE s.vid = l.vid) visits,
            (SELECT SUM(pages) FROM sessions s WHERE s.vid = l.vid) pages
     FROM leads l ORDER BY ts DESC LIMIT 500`).all();
  return json({ rows: results });
}

export async function onRequestPatch({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  if (!Number.isInteger(d.id)) return bad("id");
  if (d.status && !STATUS.has(d.status)) return bad("status");
  await env.DB.prepare("UPDATE leads SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ?")
    .bind(d.status || null, d.note != null ? clip(d.note, 2000) : null, d.id).run();
  return json({ ok: true });
}
