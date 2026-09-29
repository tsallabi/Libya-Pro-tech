/* GET  /api/admin/newsletter?issue=2026-09 — المشتركون (كل من ترك رقمه) مع حالة الإيقاف والإرسال لهذا العدد
   POST /api/admin/newsletter { action:"sent", phone, issue, grp } — تسجيل أن الرسالة أُرسلت
        { action:"optout", phone, on:true|false } — إيقاف/إعادة اشتراك (من يرسل «إيقاف») */
import { json, bad, clip } from "../../_lib.js";

/* رقم موحّد للمقارنة والإرسال: أرقام فقط، 09x الليبي يصبح 2189x، و00 تُحذف */
const normPhone = p => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^0(9\d{8})$/.test(d)) d = "218" + d.slice(1);
  return d;
};

export async function onRequestGet({ request, env }) {
  const issue = new URL(request.url).searchParams.get("issue") || new Date().toISOString().slice(0, 7);
  const [leads, out, sent] = await Promise.all([
    env.DB.prepare(`SELECT ts, name, phone, company, sector, project, answers, kind, utm_campaign, city, country
                    FROM leads ORDER BY ts DESC LIMIT 5000`).all(),
    env.DB.prepare("SELECT phone FROM wa_optout").all(),
    env.DB.prepare("SELECT phone, MAX(ts) ts FROM wa_sends WHERE issue = ? GROUP BY phone").bind(issue).all()
  ]);
  const optout = new Set(out.results.map(r => r.phone));
  const sentMap = new Map(sent.results.map(r => [r.phone, r.ts]));
  const subs = new Map();
  for (const l of leads.results) {
    const phone = normPhone(l.phone);
    if (phone.length < 8) continue;
    let s = subs.get(phone);
    if (!s) subs.set(phone, s = { phone, name: l.name, company: l.company || "", first: l.ts, last: l.ts, n: 0,
                                  hints: [], city: l.city, country: l.country });
    s.n++; s.first = Math.min(s.first, l.ts);
    if (!s.company && l.company) s.company = l.company;
    s.hints.push({ sector: l.sector, project: l.project, answers: l.answers, campaign: l.utm_campaign });
  }
  const rows = [...subs.values()].map(s => ({ ...s, optout: optout.has(s.phone), sent: sentMap.get(s.phone) || null }));
  return json({ issue, rows });
}

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const phone = normPhone(d.phone);
  if (phone.length < 8) return bad("phone");
  if (d.action === "sent") {
    if (!/^\d{4}-\d{2}$/.test(d.issue || "")) return bad("issue");
    await env.DB.prepare("INSERT INTO wa_sends (ts, phone, issue, grp) VALUES (?,?,?,?)")
      .bind(Date.now(), phone, d.issue, clip(d.grp, 20)).run();
  } else if (d.action === "optout") {
    await (d.on ? env.DB.prepare("INSERT OR REPLACE INTO wa_optout (phone, ts) VALUES (?, ?)").bind(phone, Date.now())
                : env.DB.prepare("DELETE FROM wa_optout WHERE phone = ?").bind(phone)).run();
  } else return bad("action");
  return json({ ok: true });
}
