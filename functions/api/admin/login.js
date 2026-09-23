/* POST /api/admin/login { password } — يصدر كوكي جلسة موقّعة لأسبوع */
import { json, bad, getSetting, hashPassword, issueSession } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const pw = String(d.password || "");
  let ok = false;
  if (env.ADMIN_PASSWORD) ok = pw === env.ADMIN_PASSWORD;
  if (!ok) {
    const salt = await getSetting(env, "admin_salt"), hash = await getSetting(env, "admin_hash");
    if (salt && hash) ok = (await hashPassword(pw, salt)) === hash;
  }
  if (!ok) {
    await new Promise(r => setTimeout(r, 800));        // إبطاء محاولات التخمين
    return json({ error: "wrong" }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": await issueSession(env) });
}
