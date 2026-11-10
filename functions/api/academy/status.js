/* GET /api/academy/status?ref= — حالة تسجيل من سجلّنا نحن (يُسأل بعد العودة من الدفع). الرمز يظهر لصاحب المرجع فقط */
import { json, bad } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  const ref = new URL(request.url).searchParams.get("ref") || "";
  if (!/^[a-f0-9]{24}$/.test(ref)) return bad("ref");
  const e = await env.DB.prepare("SELECT e.status, e.access_code, e.method, c.title, c.title_en FROM enrollments e LEFT JOIN courses c ON c.id = e.course_id WHERE e.ref = ?").bind(ref).first();
  if (!e) return bad("ref", 404);
  return json({ status: e.status, method: e.method, course: e.title, course_en: e.title_en, code: e.status === "paid" ? e.access_code : null });
}
