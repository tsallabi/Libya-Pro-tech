/* GET /api/settings — معلومات الاتصال العامة التي يعرضها الموقع (يعدّلها المدير من اللوحة) */
import { json, CONTACT_KEYS, CONTACT_DEFAULTS } from "../_lib.js";

export async function onRequestGet({ env }) {
  const out = { ...CONTACT_DEFAULTS };
  try {
    const { results } = await env.DB.prepare(
      `SELECT key, value FROM settings WHERE key IN (${CONTACT_KEYS.map(() => "?").join(",")})`
    ).bind(...CONTACT_KEYS).all();
    for (const r of results) out[r.key] = r.value;
  } catch {}
  return json(out, 200, { "cache-control": "public, max-age=60" });
}
