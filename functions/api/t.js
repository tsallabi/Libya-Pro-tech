/* POST /api/t — استقبال أحداث التصفح من assets/track.js
   الأنواع: pageview (فتح صفحة) · ping (نبضة كل 20 ثانية أثناء التصفح) · click (نقرة مهمة) · leave (مغادرة)
   الدولة والمدينة من شبكة كلودفلاير نفسها (request.cf)، وعنوان IP لا يُخزَّن — فقط بصمة يومية غير قابلة للعكس. */
import { json, bad, sha256, parseUA, isBot, clip } from "../_lib.js";

const ID = /^[a-z0-9]{8,40}$/;
const TYPES = new Set(["pageview", "ping", "click", "leave"]);

export async function onRequestPost({ request, env }) {
  const ua = request.headers.get("user-agent") || "";
  if (isBot(ua)) return new Response(null, { status: 204 });

  let d;
  try { d = JSON.parse(await request.text()); } catch { return bad("json"); }
  if (!d || !TYPES.has(d.type) || !ID.test(d.vid || "") || !ID.test(d.sid || "")) return bad("invalid");

  const now = Date.now();
  const path = clip(d.path, 300) || "/";
  const db = env.DB;

  if (d.type === "pageview") {
    const cf = request.cf || {};
    const { device, os, browser } = parseUA(ua);
    const ip = request.headers.get("cf-connecting-ip") || "";
    const day = new Date().toISOString().slice(0, 10);
    const ipHash = ip ? (await sha256(ip + "|" + day)).slice(0, 16) : null;
    let refHost = null;
    try { if (d.ref) refHost = new URL(d.ref).hostname.replace(/^www\./, ""); } catch {}
    const u = d.utm || {};

    await db.prepare(`
      INSERT INTO sessions (sid, vid, started, last_ping, pages, entry, exit_path, current_path,
        ref, ref_host, utm_source, utm_medium, utm_campaign, country, city, region, tz, org, lang,
        device, os, browser, screen, ip_hash)
      VALUES (?1, ?2, ?3, ?3, 1, ?4, ?4, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
      ON CONFLICT(sid) DO UPDATE SET last_ping = ?3, pages = pages + 1, exit_path = ?4, current_path = ?4`)
      .bind(d.sid, d.vid, now, path, clip(d.ref, 500), refHost,
            clip(u.source, 80), clip(u.medium, 80), clip(u.campaign, 120),
            cf.country || null, cf.city || null, cf.region || null, cf.timezone || clip(d.tz, 60),
            clip(cf.asOrganization, 120), clip(d.lang, 20), device, os, browser, clip(d.screen, 20), ipHash)
      .run();
    await db.prepare("INSERT INTO events (ts, vid, sid, type, path, title) VALUES (?, ?, ?, 'pageview', ?, ?)")
      .bind(now, d.vid, d.sid, path, clip(d.title, 200)).run();
    return new Response(null, { status: 204 });
  }

  const add = Math.max(0, Math.min(Number(d.dur) || 0, 60000));   // زمن نشاط منذ آخر نبضة (بحد أقصى دقيقة)
  await db.prepare("UPDATE sessions SET last_ping = ?, dur_ms = dur_ms + ?, current_path = ? WHERE sid = ?")
    .bind(now, add, path, d.sid).run();

  if (d.type === "click") {
    await db.prepare("INSERT INTO events (ts, vid, sid, type, path, target, label) VALUES (?, ?, ?, 'click', ?, ?, ?)")
      .bind(now, d.vid, d.sid, path, clip(d.target, 400), clip(d.label, 160)).run();
  }
  return new Response(null, { status: 204 });
}

export const onRequest = () => json({ error: "method" }, 405);
