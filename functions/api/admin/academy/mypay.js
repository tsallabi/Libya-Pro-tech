/* GET إعداد ماي باي (تلميحات فقط، لا يُعاد أي سرّ) وآخر الإشعارات · POST حفظ المفاتيح · POST ?test=1 اختبار الاتصال */
import { json, bad, setSetting } from "../../../_lib.js";
import { config, token } from "../../../_mypay.js";

const hint = v => v ? `••••${String(v).slice(-4)}` : "";
export async function onRequestGet({ env }) {
  const c = await config(env);
  const ev = await env.DB.prepare("SELECT * FROM mypay_events ORDER BY ts DESC LIMIT 30").all();
  return json({ ready: c.ready, sandbox: c.sandbox, base: c.base, client_id: hint(c.clientId), client_secret: hint(c.clientSecret),
    webhook_secret: hint(c.webhookSecret), webhook_url: "/api/academy/webhook", events: ev.results });
}
export async function onRequestPost({ request, env }) {
  if (new URL(request.url).searchParams.get("test")) {
    const c = await config(env);
    if (!c.ready) return json({ ok: false, error: "لم تُحفظ المفاتيح بعد" });
    try { await token(c); return json({ ok: true, base: c.base }); }
    catch (e) { return json({ ok: false, error: e.message, base: c.base }); }
  }
  let d; try { d = await request.json(); } catch { return bad("json"); }
  for (const [k, f] of [["mypay_client_id", "client_id"], ["mypay_client_secret", "client_secret"], ["mypay_webhook_secret", "webhook_secret"]]) {
    const v = String(d[f] || "").trim();
    if (v) await setSetting(env, k, v.slice(0, 300));   // حقل فارغ يُبقي القيمة المحفوظة
  }
  if (d.sandbox != null) await setSetting(env, "mypay_sandbox", d.sandbox ? "1" : "0");
  return json({ ok: true });
}
