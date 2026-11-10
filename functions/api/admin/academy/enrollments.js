/* GET التسجيلات · PATCH { id, action: "paid" | "cancel" | "pending", note } — تأكيد دفع يدوي يصدر رمز الدخول */
import { json, bad, clip } from "../../../_lib.js";
import { markPaid } from "../../../_academy.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`SELECT e.*, c.title course FROM enrollments e LEFT JOIN courses c ON c.id = e.course_id
    ORDER BY e.ts DESC LIMIT 500`).all();
  return json({ rows: results.map(r => ({ ...r, mypay_token: undefined })) });
}
export async function onRequestPatch({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const id = Number(d.id) || 0;
  if (d.note != null) await env.DB.prepare("UPDATE enrollments SET note = ? WHERE id = ?").bind(clip(d.note, 1000), id).run();
  if (d.action === "paid") return json({ ok: true, row: await markPaid(env, id, "admin") });
  if (d.action === "cancel") await env.DB.prepare("UPDATE enrollments SET status = 'cancelled' WHERE id = ?").bind(id).run();
  if (d.action === "pending") await env.DB.prepare("UPDATE enrollments SET status = 'pending' WHERE id = ? AND status != 'paid'").bind(id).run();
  return json({ ok: true });
}
