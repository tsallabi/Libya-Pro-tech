/* ماي باي (MyPay.ly) — نفس العقد المستخدم في ليبيا أوتو برو (lib/mypayBank.ts) بعد مطابقته بوثائقهم وإضافتهم الرسمية:
   - التوكن:  POST {base}/authentication/token  { client_id, secret_id } → data.access_token (600 ثانية، لكل طلب)
   - الدفع:   POST {base}/payment/create  Bearer  { amount:"200.00", currency:"LYD", return_url, cancel_url, webhook_url, custom, full_name, email, phone, payment_gateway? }
              → data.payment_url + data.token
   - الإشعار: POST webhook  رأس X-MyPay-Signature = hex HMAC-SHA256 للجسم الخام بسرّ الويب هوك؛ بلا سرّ يُرفض كل شيء
   - لا شيء يُعتبر مدفوعاً من رابط العودة؛ الإشعار الموقّع وحده يثبت الدفع.
   المفاتيح تُحفظ في جدول settings من لوحة الإدارة (لا تُعرض أبداً)، ومتغيرات البيئة MYPAY_* احتياط. */
import { getSetting } from "./_lib.js";

export const PROD = "https://mypay.ly/pay/api/v1";
export const SANDBOX = "https://mypay.ly/pay/sandbox/api/v1";
export const GATEWAYS = ["yasr-pay", "masrafi-pay", "sahary-pay", "moamalat", "edfali", "sadad", "mobicash", "prepaid-card"];

export async function config(env) {
  const g = async (k, e) => (await getSetting(env, k)) || env[e] || "";
  const clientId = await g("mypay_client_id", "MYPAY_CLIENT_ID");
  const clientSecret = await g("mypay_client_secret", "MYPAY_CLIENT_SECRET");
  const webhookSecret = await g("mypay_webhook_secret", "MYPAY_WEBHOOK_SECRET");
  const sandbox = ((await getSetting(env, "mypay_sandbox")) || env.MYPAY_SANDBOX || "") === "1";
  return { clientId, clientSecret, webhookSecret, sandbox, base: sandbox ? SANDBOX : PROD, ready: !!(clientId && clientSecret) };
}

/* رقم ليبي بالصيغة الوحيدة التي تقبلها البوابة 09XXXXXXXX، أو null (لا تخمين: رقم خاطئ يرسل رسالة التأكيد لغريب) */
export function libyanPhone(raw) {
  let d = String(raw ?? "").replace(/\D+/g, "");
  if (!d) return null;
  if (d.startsWith("00218")) d = d.slice(5);
  else if (d.startsWith("218") && d.length > 10) d = d.slice(3);
  if (/^9\d{8}$/.test(d)) d = "0" + d;
  return /^09\d{8}$/.test(d) ? d : null;
}

const why = (data, text) => (data?.message?.error || []).join(", ") || String(text).slice(0, 300);

export async function token(cfg) {
  const r = await fetch(`${cfg.base}/authentication/token`, { method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: cfg.clientId, secret_id: cfg.clientSecret }) });
  const text = await r.text(); let data = {}; try { data = JSON.parse(text); } catch {}
  if (!r.ok) throw new Error(`authentication/token: HTTP ${r.status} — ${why(data, text)}`);
  const t = data?.data?.access_token || data?.access_token;
  if (!t) throw new Error("authentication/token: no access_token");
  return String(t);
}

export async function createPayment(cfg, a) {
  const payload = { amount: Number(a.amount).toFixed(2), currency: "LYD", return_url: a.returnUrl, cancel_url: a.cancelUrl,
    webhook_url: a.webhookUrl, custom: a.custom };
  if (a.fullName) payload.full_name = a.fullName;
  if (a.email) payload.email = a.email;
  const ph = libyanPhone(a.phone); if (ph) payload.phone = ph;
  if (GATEWAYS.includes(a.gateway)) payload.payment_gateway = a.gateway;
  const r = await fetch(`${cfg.base}/payment/create`, { method: "POST",
    headers: { authorization: `Bearer ${await token(cfg)}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload) });
  const text = await r.text(); let data = {}; try { data = JSON.parse(text); } catch {}
  if (!r.ok) throw new Error(`payment/create: HTTP ${r.status} — ${why(data, text)}`);
  const d = data.data || data;
  if (!d.payment_url || !d.token) throw new Error("payment/create: no payment_url/token");
  return { token: String(d.token), url: String(d.payment_url) };
}

export function verdict(b) {
  const ev = String(b?.event ?? "").trim().toLowerCase(), st = String(b?.status ?? "").trim().toLowerCase();
  if (ev === "payment.success" || ["success", "completed", "paid"].includes(st)) return "paid";
  if (/^payment\.(failed|cancelled|canceled|expired)$/.test(ev) || ["failed", "cancelled", "canceled", "declined", "expired", "rejected"].includes(st)) return "failed";
  return "unknown";
}

export async function signatureOk(secret, raw, sig) {
  if (!secret || !sig) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(raw)))].map(b => b.toString(16).padStart(2, "0")).join("");
  const s = String(sig).trim().toLowerCase();
  if (s.length !== mac.length) return false;
  let diff = 0; for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ mac.charCodeAt(i);
  return diff === 0;
}
