/* GET/PUT /api/admin/settings — معلومات الاتصال في الموقع · POST — تغيير كلمة مرور اللوحة */
import { json, bad, clip, getSetting, setSetting, hashPassword, randomHex, CONTACT_KEYS, CONTACT_DEFAULTS } from "../../_lib.js";

export async function onRequestGet({ env }) {
  const out = { ...CONTACT_DEFAULTS };
  for (const k of CONTACT_KEYS) { const v = await getSetting(env, k); if (v != null) out[k] = v; }
  return json(out);
}

export async function onRequestPut({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  for (const k of CONTACT_KEYS) {
    if (d[k] == null) continue;
    let v = clip(String(d[k]).trim(), 200);
    if (k === "whatsapp") v = v.replace(/[^\d]/g, "");             // wa.me يقبل الأرقام فقط
    if (k === "meta_pixel" && v && !/^\d{10,20}$/.test(v)) return bad("meta_pixel");
    if (k === "google_tag") { v = v.toUpperCase(); if (v && !/^(G|AW|GT)-[A-Z0-9]{4,20}$/.test(v)) return bad("google_tag"); }
    await setSetting(env, k, v);
  }
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const cur = String(d.current || ""), next = String(d.next || "");
  if (next.length < 10) return bad("weak");
  const salt = await getSetting(env, "admin_salt"), hash = await getSetting(env, "admin_hash");
  if (!(salt && hash && (await hashPassword(cur, salt)) === hash) && !(env.ADMIN_PASSWORD && cur === env.ADMIN_PASSWORD))
    return json({ error: "wrong" }, 401);
  const ns = randomHex(16);
  await setSetting(env, "admin_salt", ns);
  await setSetting(env, "admin_hash", await hashPassword(next, ns));
  return json({ ok: true });
}
