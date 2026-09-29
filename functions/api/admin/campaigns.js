/* GET  /api/admin/campaigns — نتائج حملات واتساب لكل رمز إعلان (BNK-A ...): زيارات الموقع، الطلبات، المحادثات المسجّلة، التعاقدات
   POST /api/admin/campaigns { name, phone, code, company, note } — تسجيل محادثة وصلت من إعلان «النقر إلى واتساب»
   (هذه الإعلانات تفتح واتساب مباشرة ولا تمرّ بالموقع، فرمز الإعلان في الرسالة الجاهزة هو ما يربط المحادثة بالإعلان) */
import { json, bad, clip } from "../../_lib.js";
const CODE = /^(BNK|GOV|BIZ|CAR)-[A-Z0-9]{1,3}$/;

export async function onRequestGet({ env }) {
  const [v, l] = await Promise.all([
    env.DB.prepare(`SELECT utm_campaign code, COUNT(*) n FROM sessions
      WHERE utm_campaign GLOB '[BGC][NOIA][KVZR]-*' GROUP BY utm_campaign`).all(),
    env.DB.prepare(`SELECT utm_campaign code, COUNT(*) n, SUM(kind = 'wa_ad') chats,
        SUM(status IN ('meeting','proposal','won')) hot, SUM(status = 'won') won
      FROM leads WHERE utm_campaign GLOB '[BGC][NOIA][KVZR]-*' GROUP BY utm_campaign`).all()
  ]);
  const rows = {};
  for (const r of v.results) rows[r.code] = { code: r.code, visits: r.n, leads: 0, chats: 0, hot: 0, won: 0 };
  for (const r of l.results) Object.assign(rows[r.code] ||= { code: r.code, visits: 0 }, { leads: r.n, chats: r.chats, hot: r.hot, won: r.won });
  return json({ rows: Object.values(rows).sort((a, b) => a.code.localeCompare(b.code)) });
}

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return bad("json"); }
  const name = clip((d.name || "").trim(), 120), phone = clip((d.phone || "").trim(), 40);
  const code = String(d.code || "").toUpperCase().trim();
  if (!name || !phone) return bad("missing");
  if (!CODE.test(code)) return bad("code");
  const r = await env.DB.prepare(`INSERT INTO leads (ts, name, phone, company, message, page, utm_source, utm_campaign, kind, project)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(Date.now(), name, phone, clip(d.company, 160), clip(d.note, 2000) || `محادثة واتساب من إعلان ${code}`,
          "whatsapp", "whatsapp_ad", code, "wa_ad", null).run();
  return json({ ok: true, id: r.meta?.last_row_id });
}
