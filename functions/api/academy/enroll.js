/* POST /api/academy/enroll { course_id, name, phone, email, gateway, vid }
   دورة بسعر → إنشاء دفعة ماي باي وإرجاع رابط الدفع. دورة بلا سعر بعد (قريباً) → تسجيل اهتمام فقط.
   ماي باي غير مفعّل → يُحفظ التسجيل وينتقل الطالب إلى واتساب لإتمام الدفع يدوياً. */
import { json, bad, clip } from "../../_lib.js";
import { newRef } from "../../_academy.js";
import { config, createPayment, libyanPhone } from "../../_mypay.js";

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const name = clip((d.name || "").trim(), 120), phone = clip((d.phone || "").trim(), 40);
  if (!name || !phone) return bad("missing");
  const c = await env.DB.prepare("SELECT * FROM courses WHERE id = ? AND published = 1").bind(Number(d.course_id) || 0).first();
  if (!c) return bad("course", 404);
  if (c.seats) {
    const t = await env.DB.prepare("SELECT COUNT(*) n FROM enrollments WHERE course_id = ? AND status = 'paid'").bind(c.id).first();
    if (t.n >= c.seats) return json({ error: "full" }, 409);
  }
  const ref = newRef(), price = Number(c.price) || 0;
  const cfg = await config(env);
  const method = price <= 0 ? "interest" : cfg.ready ? "mypay" : "manual";
  if (method === "mypay" && !libyanPhone(phone)) return json({ error: "phone", field: "phone" }, 400);
  const r = await env.DB.prepare(`INSERT INTO enrollments (ts, ref, course_id, name, phone, email, status, amount, method, gateway, vid)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(Date.now(), ref, c.id, name, phone, clip(d.email, 160),
      method === "interest" ? "interest" : "pending", price, method, clip(d.gateway, 30), clip(d.vid, 40)).run();
  const id = r.meta?.last_row_id;
  if (method !== "mypay") return json({ ok: true, ref, method });

  const origin = new URL(request.url).origin;
  try {
    const p = await createPayment(cfg, { amount: price, custom: String(id), fullName: name, email: d.email, phone, gateway: d.gateway,
      returnUrl: `${origin}/api/academy/return?ref=${ref}&type=success`, cancelUrl: `${origin}/api/academy/return?ref=${ref}&type=cancel`,
      webhookUrl: `${origin}/api/academy/webhook` });
    await env.DB.prepare("UPDATE enrollments SET mypay_token = ?, pay_url = ? WHERE id = ?").bind(p.token, p.url, id).run();
    return json({ ok: true, ref, method, pay_url: p.url });
  } catch (e) {
    await env.DB.prepare("UPDATE enrollments SET method = 'manual', note = ? WHERE id = ?").bind(clip("MyPay: " + e.message, 500), id).run();
    return json({ ok: true, ref, method: "manual", gateway_error: true });
  }
}
export const onRequest = () => json({ error: "method" }, 405);
