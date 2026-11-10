/* GET /api/academy/courses — الدورات المنشورة (بلا رابط الجلسة: يصل للمشترك بعد الدفع فقط) */
import { json } from "../../_lib.js";
import { publicCourse } from "../../_academy.js";

export async function onRequestGet({ env }) {
  const [c, t, l] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM courses WHERE published = 1 ORDER BY sort, id"),
    env.DB.prepare("SELECT course_id, COUNT(*) n FROM enrollments WHERE status = 'paid' GROUP BY course_id"),
    env.DB.prepare("SELECT course_id, COUNT(*) n FROM lessons GROUP BY course_id")
  ]);
  const taken = Object.fromEntries(t.results.map(r => [r.course_id, r.n]));
  const les = Object.fromEntries(l.results.map(r => [r.course_id, r.n]));
  return json({ courses: c.results.map(x => publicCourse(x, taken[x.id], les[x.id])) }, 200, { "cache-control": "public, max-age=30" });
}
