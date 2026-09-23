/* أدوات مشتركة لدوال الموقع: ردود JSON، الجلسة الإدارية، تحليل المتصفح، التجزئة */

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });

export const bad = (msg, status = 400) => json({ error: msg }, status);

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

export async function sha256(s) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

export function randomHex(n = 32) {
  const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a);
}

/* PBKDF2 لكلمة مرور المدير — لا تُخزَّن كلمة المرور نفسها أبداً */
export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return hex(bits);
}

export async function getSetting(env, key) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return r ? r.value : null;
}
export async function setSetting(env, key, value) {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, value).run();
}

/* سرّ توقيع الجلسات: يُولَّد مرة ويُحفظ في القاعدة */
async function sessionSecret(env) {
  let s = await getSetting(env, "session_secret");
  if (!s) { s = randomHex(32); await setSetting(env, "session_secret", s); }
  return s;
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

const COOKIE = "lp_admin";
const TTL = 60 * 60 * 24 * 7; // أسبوع

export async function issueSession(env) {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const sig = await hmac(await sessionSecret(env), "admin." + exp);
  return `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
}
export const clearSession = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isAdmin(request, env) {
  const c = request.headers.get("cookie") || "";
  const m = c.match(new RegExp(COOKIE + "=(\\d+)\\.([a-f0-9]{64})"));
  if (!m) return false;
  if (Number(m[1]) < Date.now() / 1000) return false;
  const want = await hmac(await sessionSecret(env), "admin." + m[1]);
  return want === m[2];
}

/* تحليل مبسّط لنوع الجهاز والنظام والمتصفح من User-Agent */
export function parseUA(ua = "") {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const os = /Windows/i.test(ua) ? "Windows" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung"
    : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other";
  return { device, os, browser };
}

export const isBot = ua => /bot|crawler|spider|crawling|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|slurp/i.test(ua || "");

export const clip = (v, n = 300) => (v == null ? null : String(v).slice(0, n));

/* الإعدادات العامة لمعلومات الاتصال (تظهر في الموقع ويعدّلها المدير) */
export const CONTACT_KEYS = ["whatsapp", "phone_ly", "phone_ie", "email", "address", "meta_pixel", "google_tag"];
export const CONTACT_DEFAULTS = {
  whatsapp: "353894435368",
  phone_ly: "+218 92 922 2122",
  phone_ie: "+353 89 443 5368",
  email: "",
  address: "",
  meta_pixel: "",     // Meta (Facebook) Pixel ID — أرقام فقط
  google_tag: ""      // Google tag: G-XXXX (Analytics) أو AW-XXXX (Ads)
};
