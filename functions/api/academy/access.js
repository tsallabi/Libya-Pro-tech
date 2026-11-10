/* POST /api/academy/access { code } — منطقة الطالب: دورته، رابط الجلسة المباشرة، والدروس المسجّلة */
import { json, bad } from "../../_lib.js";
import { byCode } from "../../_academy.js";

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const e = await byCode(env, d.code);
  if (!e) { await new Promise(r => setTimeout(r, 600)); return json({ error: "code" }, 404); }
  const c = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(e.course_id).first();
  const { results } = await env.DB.prepare("SELECT id, title, size FROM lessons WHERE course_id = ? ORDER BY sort, id").bind(e.course_id).all();
  return json({ name: e.name, course: c && { id: c.id, title: c.title, title_en: c.title_en, mode: c.mode, platform: c.platform,
    starts_at: c.starts_at, schedule: c.schedule, schedule_en: c.schedule_en, join_url: c.join_url || null }, lessons: results });
}
