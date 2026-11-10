/* أدوات الأكاديمية المشتركة */
import { randomHex } from "./_lib.js";

export const TRACKS = ["content", "marketing", "code", "english"];
const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بلا 0/O و1/I حتى لا يخطئ الطالب في القراءة

export function accessCode() {
  const a = new Uint8Array(8); crypto.getRandomValues(a);
  const s = [...a].map(b => ALNUM[b % ALNUM.length]).join("");
  return `LP-${s.slice(0, 4)}-${s.slice(4)}`;
}
export const newRef = () => randomHex(12);

/* يحوّل التسجيل إلى «مدفوع» مرة واحدة ويصدر رمز الدخول — الاستدعاء الثاني لا يغيّر شيئاً */
export async function markPaid(env, id, by) {
  const e = await env.DB.prepare("SELECT * FROM enrollments WHERE id = ?").bind(id).first();
  if (!e) return null;
  if (e.status === "paid") return e;
  const code = e.access_code || accessCode();
  await env.DB.prepare("UPDATE enrollments SET status = 'paid', access_code = ?, paid_at = ?, paid_by = ? WHERE id = ? AND status != 'paid'")
    .bind(code, Date.now(), by, id).run();
  return { ...e, status: "paid", access_code: code };
}

export function publicCourse(c, taken, lessons) {
  return { id: c.id, track: c.track, title: c.title, title_en: c.title_en, summary: c.summary, summary_en: c.summary_en,
    level: c.level, level_en: c.level_en, mode: c.mode, platform: c.platform, starts_at: c.starts_at,
    schedule: c.schedule, schedule_en: c.schedule_en, duration: c.duration, duration_en: c.duration_en,
    audience: c.audience, audience_en: c.audience_en, curriculum: c.curriculum, curriculum_en: c.curriculum_en,
    outcomes: c.outcomes, outcomes_en: c.outcomes_en, price: c.price, seats: c.seats,
    left: c.seats ? Math.max(0, c.seats - (taken || 0)) : null, lessons: lessons || 0,
    cover: !c.cover ? null : c.cover.startsWith("/") ? c.cover : `/api/academy/cover/${c.cover}` };
}

/* الدخول برمز الطالب: يعيد التسجيل المدفوع أو null */
export async function byCode(env, code) {
  const c = String(code || "").toUpperCase().replace(/\s+/g, "").trim();
  if (!/^LP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) return null;
  return env.DB.prepare("SELECT * FROM enrollments WHERE access_code = ? AND status = 'paid'").bind(c).first();
}
