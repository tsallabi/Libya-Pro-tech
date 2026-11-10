/* GET /api/academy/video/:lessonId?code= — بث الدرس من R2 لمن يملك رمز دورته فقط، مع دعم Range للتقديم والتأخير */
import { byCode } from "../../../_academy.js";

export async function onRequestGet({ request, env, params }) {
  const code = new URL(request.url).searchParams.get("code");
  const e = await byCode(env, code);
  if (!e) return new Response("forbidden", { status: 403 });
  const l = await env.DB.prepare("SELECT * FROM lessons WHERE id = ? AND course_id = ?").bind(Number(params.id) || 0, e.course_id).first();
  if (!l || !l.r2_key) return new Response("not found", { status: 404 });
  const range = request.headers.get("range");
  let opt = {};
  const m = range && range.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(0, l.size - Number(m[2]));
    const end = m[1] && m[2] ? Number(m[2]) : l.size - 1;
    opt.range = { offset: start, length: Math.min(end, l.size - 1) - start + 1 };
  }
  const obj = await env.ACADEMY.get(l.r2_key, opt);
  if (!obj) return new Response("not found", { status: 404 });
  const h = new Headers({ "content-type": l.mime || "video/mp4", "accept-ranges": "bytes", "cache-control": "private, no-store",
    "content-disposition": "inline" });
  if (opt.range) {
    const { offset, length } = opt.range;
    h.set("content-range", `bytes ${offset}-${offset + length - 1}/${l.size}`); h.set("content-length", String(length));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(l.size));
  return new Response(obj.body, { headers: h });
}
