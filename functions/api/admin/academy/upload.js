/* PUT /api/admin/academy/upload?kind=lesson|cover&course_id=&title=&name= — جسم الطلب هو الملف نفسه (يُبثّ إلى R2 دون تحميله في الذاكرة) */
import { json, bad, clip, randomHex } from "../../../_lib.js";

export async function onRequestPut({ request, env }) {
  const p = new URL(request.url).searchParams;
  const kind = p.get("kind"), cid = Number(p.get("course_id")) || 0;
  const size = Number(request.headers.get("content-length")) || 0;
  const mime = (request.headers.get("content-type") || "").split(";")[0];
  if (!size) return bad("empty");
  const c = await env.DB.prepare("SELECT id, cover FROM courses WHERE id = ?").bind(cid).first();
  if (!c) return bad("course", 404);
  if (kind === "cover") {
    const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" }[mime];
    if (!ext || size > 5e6) return bad("image");
    const key = `covers/${randomHex(12)}.${ext}`;
    await env.ACADEMY.put(key, request.body, { httpMetadata: { contentType: mime } });
    if (c.cover && !c.cover.startsWith("/")) await env.ACADEMY.delete(c.cover);   // الأغلفة الافتراضية ملفات ثابتة في الموقع
    await env.DB.prepare("UPDATE courses SET cover = ? WHERE id = ?").bind(key, cid).run();
    return json({ ok: true, cover: key });
  }
  if (kind === "lesson") {
    if (!/^video\/(mp4|webm|quicktime)$/.test(mime)) return bad("video");
    const key = `lessons/${cid}/${randomHex(12)}.${mime === "video/webm" ? "webm" : "mp4"}`;
    await env.ACADEMY.put(key, request.body, { httpMetadata: { contentType: mime } });
    const n = await env.DB.prepare("SELECT COALESCE(MAX(sort), 0) + 1 s FROM lessons WHERE course_id = ?").bind(cid).first();
    const title = clip((p.get("title") || p.get("name") || "درس").trim(), 200);
    const r = await env.DB.prepare("INSERT INTO lessons (course_id, title, r2_key, size, mime, sort, ts) VALUES (?,?,?,?,?,?,?)")
      .bind(cid, title, key, size, mime === "video/quicktime" ? "video/mp4" : mime, n.s, Date.now()).run();
    return json({ ok: true, id: r.meta?.last_row_id });
  }
  return bad("kind");
}
