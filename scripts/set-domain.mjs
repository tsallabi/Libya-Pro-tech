/* يبدّل نطاق الموقع في كل مكان يعتمد عليه: robots و sitemap و canonical و بطاقات المشاركة والتوثيق.
   الاستخدام:  node scripts/set-domain.mjs libyaprotech.ly
   يقبل النطاق بصيغة example.com أو https://example.com. */
import fs from "fs";

const raw = process.argv[2];
if (!raw) { console.error("أعطِ النطاق:  node scripts/set-domain.mjs example.com"); process.exit(1); }
const host = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
const base = `https://${host}`;
const OLD = /https:\/\/libya-pro-tech\.pages\.dev/g;

/* 1) الملفات التي تحمل الرابط نصاً */
for (const f of ["robots.txt", "sitemap.xml", "README.md", "docs/DEPLOY.md", "docs/PLAN.md", "profile.html"]) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, "utf8");
  const out = s.replace(OLD, base).replace(/libya-pro-tech\.pages\.dev/g, host);
  if (out !== s) { fs.writeFileSync(f, out); console.log("حدّث", f); }
}

/* 2) canonical وبطاقات المشاركة في كل صفحة */
const pages = {
  "index.html":      { path: "/",               title: "ليبيا برو للتقنية — نبني الأنظمة التي لا يُسمح لها بالتوقف" },
  "banks.html":      { path: "/banks.html",      title: "أنظمة مالية تتحمّل التدقيق — ليبيا برو للتقنية" },
  "government.html": { path: "/government.html", title: "منظومات للجهات الحكومية — ليبيا برو للتقنية" },
  "business.html":   { path: "/business.html",   title: "أنظمة الشركات والمتاجر — ليبيا برو للتقنية" },
};
for (const [f, meta] of Object.entries(pages)) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, "utf8");
  const url = base + meta.path;
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1];
  const block = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="ليبيا برو للتقنية">`,
    `<meta property="og:locale" content="ar_LY">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${meta.title}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:image" content="${base}/assets/share.png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n");

  s = s.replace(/\n<link rel="canonical"[\s\S]*?<meta name="twitter:card"[^>]*>/, "");  // أزل القديم إن وُجد
  s = s.replace(/(<meta name="description"[^>]*>)/, `$1\n${block}`);
  fs.writeFileSync(f, s);
  console.log("حدّث وسوم المشاركة في", f);
}
console.log("\nالنطاق الآن:", base);
console.log("لا تنسَ في لوحة كلودفلاير: Workers & Pages ← المشروع ← Custom domains ← Set up a domain");
