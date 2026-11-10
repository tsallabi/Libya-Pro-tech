/* إدارة الدورات: GET الكل مع الأعداد · POST إنشاء/تعديل · DELETE ?id */
import { json, bad, clip } from "../../../_lib.js";
import { TRACKS } from "../../../_academy.js";

export async function onRequestGet({ env }) {
  const [c, l, e] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM courses ORDER BY sort, id"),
    env.DB.prepare("SELECT id, course_id, title, size, sort FROM lessons ORDER BY sort, id"),
    env.DB.prepare("SELECT course_id, SUM(status = 'paid') paid, SUM(status = 'pending') pending, SUM(status = 'interest') interest FROM enrollments GROUP BY course_id")
  ]);
  const cnt = Object.fromEntries(e.results.map(r => [r.course_id, r]));
  return json({ courses: c.results.map(x => ({ ...x, lessons: l.results.filter(y => y.course_id === x.id), counts: cnt[x.id] || {} })) });
}

const F = ["title", "title_en", "summary", "summary_en", "level", "level_en", "platform", "starts_at", "schedule", "schedule_en", "join_url"];
export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const v = {};
  for (const k of F) v[k] = clip((d[k] ?? "").toString().trim(), k.startsWith("summary") ? 1200 : 300) || null;
  if (!v.title) return bad("title");
  if (v.join_url && !/^https:\/\//.test(v.join_url)) return bad("join_url");
  v.track = TRACKS.includes(d.track) ? d.track : "content";
  v.mode = d.mode === "recorded" ? "recorded" : "live";
  v.price = Math.max(0, Number(d.price) || 0); v.seats = Math.max(0, parseInt(d.seats) || 0);
  v.published = d.published ? 1 : 0; v.sort = parseInt(d.sort) || 0;
  const keys = Object.keys(v);
  if (d.id) {
    await env.DB.prepare(`UPDATE courses SET ${keys.map(k => k + " = ?").join(", ")} WHERE id = ?`).bind(...keys.map(k => v[k]), Number(d.id)).run();
    return json({ ok: true, id: Number(d.id) });
  }
  const r = await env.DB.prepare(`INSERT INTO courses (${keys.join(",")}, ts) VALUES (${keys.map(() => "?").join(",")}, ?)`).bind(...keys.map(k => v[k]), Date.now()).run();
  return json({ ok: true, id: r.meta?.last_row_id });
}

export async function onRequestDelete({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id")) || 0;
  const paid = await env.DB.prepare("SELECT COUNT(*) n FROM enrollments WHERE course_id = ? AND status = 'paid'").bind(id).first();
  if (paid.n) return json({ error: "has_paid", n: paid.n }, 409);   // دورة فيها مشتركون دفعوا لا تُحذف — تُخفى بإلغاء النشر
  const { results } = await env.DB.prepare("SELECT r2_key FROM lessons WHERE course_id = ?").bind(id).all();
  const c = await env.DB.prepare("SELECT cover FROM courses WHERE id = ?").bind(id).first();
  const keys = results.map(r => r.r2_key).concat(c?.cover || []).filter(Boolean);
  if (keys.length) await env.ACADEMY.delete(keys);
  await env.DB.batch([env.DB.prepare("DELETE FROM lessons WHERE course_id = ?").bind(id), env.DB.prepare("DELETE FROM courses WHERE id = ?").bind(id)]);
  return json({ ok: true });
}
