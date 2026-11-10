/* PATCH { id, title, sort } تعديل درس · DELETE ?id حذف الدرس وملفه من R2 */
import { json, bad, clip } from "../../../_lib.js";
export async function onRequestPatch({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  await env.DB.prepare("UPDATE lessons SET title = COALESCE(?, title), sort = COALESCE(?, sort) WHERE id = ?")
    .bind(d.title ? clip(d.title, 200) : null, Number.isInteger(d.sort) ? d.sort : null, Number(d.id) || 0).run();
  return json({ ok: true });
}
export async function onRequestDelete({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id")) || 0;
  const l = await env.DB.prepare("SELECT r2_key FROM lessons WHERE id = ?").bind(id).first();
  if (!l) return bad("id", 404);
  if (l.r2_key) await env.ACADEMY.delete(l.r2_key);
  await env.DB.prepare("DELETE FROM lessons WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
