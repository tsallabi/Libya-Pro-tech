/* POST /api/lead — حفظ طلب عرض السعر من نموذج الموقع قبل تحويله إلى واتساب
   يربط الطلب بزيارة صاحبه (vid/sid) فيرى المدير ما تصفّحه قبل أن يتواصل. */
import { json, bad, clip } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return bad("json"); }
  const name = clip((d.name || "").trim(), 120);
  const phone = clip((d.phone || "").trim(), 40);
  if (!name || !phone) return bad("missing");

  const cf = request.cf || {};
  const sess = d.sid ? await env.DB.prepare("SELECT utm_source, utm_campaign FROM sessions WHERE sid = ?").bind(d.sid).first() : null;
  const message = [d.type && `نوع النظام: ${d.type}`, d.timeline && `الإطار الزمني: ${d.timeline}`, d.details]
    .filter(Boolean).join("\n");

  const r = await env.DB.prepare(`INSERT INTO leads (ts, vid, sid, name, phone, email, company, sector, message, page,
      country, city, utm_source, utm_campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(Date.now(), clip(d.vid, 40), clip(d.sid, 40), name, phone, clip(d.email, 160), clip(d.company, 160),
          clip(d.sector, 60), clip(message, 4000), clip(d.page, 300), cf.country || null, cf.city || null,
          sess?.utm_source || null, sess?.utm_campaign || null)
    .run();
  return json({ ok: true, id: r.meta?.last_row_id });
}

export const onRequest = () => json({ error: "method" }, 405);
