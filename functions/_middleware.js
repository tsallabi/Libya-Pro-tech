/* اللغة حسب دولة الزائر: من خارج الدول العربية يُحوَّل إلى النسخة الإنجليزية /en/
   - مرة واحدة فقط: اختيار الزائر بزر اللغة يُحفظ في الكوكي lp_lang ويُحترم دائماً
   - محركات البحث لا تُحوَّل (تقرأ النسختين عبر hreflang) */
const ARAB = new Set(["LY", "EG", "SA", "AE", "QA", "KW", "BH", "OM", "YE", "JO", "IQ", "SY", "LB", "PS", "TN", "DZ", "MA", "SD", "MR", "SO", "DJ", "KM"]);
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|lighthouse/i;

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const p = url.pathname;
  const isPage = request.method === "GET" && (p === "/" || p.endsWith(".html") || p.startsWith("/cases") || /^\/(banks|government|business|marketing)$/.test(p));
  if (!isPage || p.startsWith("/en") || p.startsWith("/admin") || p.startsWith("/profile")) return next();
  const cookie = request.headers.get("cookie") || "";
  if (/(?:^|;\s*)lp_lang=/.test(cookie)) return next();
  if (BOT.test(request.headers.get("user-agent") || "")) return next();
  const country = request.cf && request.cf.country;
  if (!country || ARAB.has(country)) return next();
  const res = Response.redirect(new URL("/en" + p + url.search, url).toString(), 302);
  return new Response(null, { status: 302, headers: { location: res.headers.get("location"), "cache-control": "no-store", vary: "cookie" } });
}
