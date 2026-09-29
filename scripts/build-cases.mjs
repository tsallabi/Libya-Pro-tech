/* يولّد صفحة دراسة حالة ثابتة لكل نظام في cases/<id>.html وصفحة فهرس cases/index.html
   من data/projects.json (الاسم واللقطات والتقنيات) و data/cases.json (التحدي والحل والأرقام).
   صفحات ثابتة حتى تفهرسها محركات البحث وتُشارك بروابط مستقلة في الإعلانات.
   يُشغَّل بعد أي تعديل على البيانات:  node scripts/build-cases.mjs && node scripts/stamp.mjs */
import fs from "fs";

const SITE = "https://libyaprotech.com";
const projects = JSON.parse(fs.readFileSync("data/projects.json", "utf8"));
const cases = JSON.parse(fs.readFileSync("data/cases.json", "utf8"));
const SECTORS = {
  finance: "مصرفي ومالي", gov: "حكومي", erp: "منظومات المؤسسات", auctions: "مزادات",
  commerce: "تجارة", logistics: "لوجستيات", apps: "تطبيقات", ai: "ذكاء اصطناعي"
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shots = p => [{ src: p.shot, cap: p.shotAlt || p.tag }]
  .concat((p.gallery || []).map(g => typeof g === "string" ? { src: g, cap: "" } : { src: g.src, cap: g.cap || g.alt || "" }))
  .filter((s, i, a) => s.src && a.findIndex(x => x.src === s.src) === i);

const head = ({ title, desc, path, image }) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ليبيا برو للتقنية">
<meta property="og:locale" content="ar_LY">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F3F5F9">
<meta name="build" content="">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
<script src="/assets/boot.js"></script>`;

const nav = `<header class="nav">
  <a href="/" class="mark" aria-label="LIBYA PRO TECH"><span class="logo logo-word" aria-hidden="true"></span><small>TECH</small></a>
  <nav class="nav-links">
    <a href="/#work">الأعمال</a>
    <a href="/cases/">دراسات الحالة</a>
    <a href="/banks.html">المصارف</a>
    <a href="/government.html">الحكومة</a>
    <a href="/business.html">الشركات</a>
    <a href="/#estimate">احسب نظامك</a>
  </nav>
  <a href="/assets/libya-pro-tech-profile.pdf" class="pdf-link" download>الملف التعريفي <bdi dir="ltr" class="lat">PDF</bdi></a>
  <a href="#contact" class="btn btn-gold btn-sm">اطلب عرضاً</a>
  <button class="burger" id="burger" aria-expanded="false">القائمة</button>
</header>`;

const footer = `<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a href="/" class="mark mark-stack" aria-label="LIBYA PRO TECH"><span class="logo logo-word" aria-hidden="true"></span><small>TECH</small></a>
        <p class="mut foot-about">شركة ليبيا برو للتقنية — فرع من Egypt Pro Orspra. بناء وتشغيل المنظومات الرقمية للمؤسسات في ليبيا.</p>
      </div>
      <div>
        <h4>القطاعات</h4>
        <a href="/banks.html">المصارف والمؤسسات المالية</a>
        <a href="/government.html">الجهات الحكومية</a>
        <a href="/business.html">الشركات والمتاجر</a>
        <a href="/cases/">كل دراسات الحالة</a>
      </div>
      <div>
        <h4>تواصل</h4>
        <a href="/assets/libya-pro-tech-profile.pdf" download>تحميل الملف التعريفي <bdi dir="ltr" class="lat">PDF</bdi></a>
        <a href="#contact">طلب نظام مشابه</a>
        <a data-wa href="#contact" target="_blank" rel="noopener">واتساب</a>
        <a href="tel:+218929222122" class="numline" data-contact="phone_ly">ليبيا <bdi dir="ltr" class="num">+218 92 922 2122</bdi></a>
        <a href="tel:+353894435368" class="numline" data-contact="phone_ie">أيرلندا <bdi dir="ltr" class="num">+353 89 443 5368</bdi></a>
        <a href="#" class="numline" data-contact="email" hidden>البريد <bdi dir="ltr" class="lat num"></bdi></a>
      </div>
    </div>
    <div class="bottom">
      <span>© <span id="y"></span> Libya Pro Tech — A subsidiary of Egypt Pro Orspra</span>
      <span class="num">بناء المستقبل الرقمي العربي</span>
    </div>
  </div>
</footer>
<script src="/assets/app.js"></script>
<script src="/assets/engage.js" defer></script>
<script src="/assets/track.js" defer></script>
</body>
</html>
`;

const contact = (p) => `<section class="sec" id="contact">
  <div class="wrap case-cta">
    <div>
      <div class="eyebrow"><span>نظام مثله لجهتك</span></div>
      <h2>تريد ${esc(p.name)} مُفصَّلاً على عملك؟</h2>
      <p class="sec-lead">اترك اسمك ورقمك، ونرسل لك على واتساب خلال 24 ساعة: جلسة عرض حي للنظام، ثم تقدير أولي للمدة والتكلفة.</p>
    </div>
    <form class="case-form" id="case-form" data-project="${esc(p.id)}" data-name="${esc(p.name)}">
      <label>الاسم<input name="name" required autocomplete="name"></label>
      <label>رقم الواتساب<input name="phone" required inputmode="tel" autocomplete="tel" dir="ltr" placeholder="+218 9x xxx xxxx"></label>
      <label>الجهة أو الشركة <small>(اختياري)</small><input name="company" autocomplete="organization"></label>
      <label>ما الذي تريد تغييره عن هذا النظام؟ <small>(اختياري)</small><textarea name="details" rows="3"></textarea></label>
      <button class="btn btn-gold" type="submit">أريد نظاماً مثله</button>
      <p class="mut case-form-note">لا نشارك رقمك مع أي جهة. نرسل لك جديد قطاعك مرة في الشهر على واتساب، وتوقفه بكلمة «إيقاف».</p>
    </form>
  </div>
</section>`;

function page(p, i) {
  const c = cases[p.id];
  const all = shots(p);
  const sector = SECTORS[p.sector] || "";
  const path = `/cases/${p.id}.html`;
  const desc = `دراسة حالة ${p.name}: ${c.challenge}`.slice(0, 158);
  const prev = projects[(i - 1 + projects.length) % projects.length], next = projects[(i + 1) % projects.length];
  const related = projects.filter(x => x.id !== p.id && x.sector === p.sector)
    .concat(projects.filter(x => x.id !== p.id && x.sector !== p.sector)).slice(0, 3);
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: `${p.name} — ${p.tag}`, description: desc, image: all.map(s => `${SITE}/${s.src}`),
    inLanguage: "ar", mainEntityOfPage: `${SITE}${path}`,
    author: { "@type": "Organization", name: "Libya Pro Tech", url: SITE },
    publisher: { "@type": "Organization", name: "Libya Pro Tech", logo: { "@type": "ImageObject", url: `${SITE}/assets/share.png` } },
    about: { "@type": "SoftwareApplication", name: p.name, applicationCategory: "BusinessApplication" }
  };
  return `${head({ title: `${p.name} — دراسة حالة | ليبيا برو للتقنية`, desc, path, image: p.shot })}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body data-case="${esc(p.id)}" data-case-name="${esc(p.name)}">
<div class="scroll-line" id="scroll-line" aria-hidden="true"></div>
${nav}
<main id="top">
<section class="case-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><a href="/cases/">دراسات الحالة</a><span>/</span><span>${esc(p.name)}</span></nav>
    <div class="eyebrow"><span>دراسة حالة · ${esc(sector)}</span></div>
    <h1>${esc(p.name)}</h1>
    <p class="hero-sub">${esc(p.tag)}. <span class="mut">لـ${esc(c.client)}.</span></p>
    <div class="hero-cta">
      <a href="#contact" class="btn btn-gold">أريد نظاماً مثله</a>
      ${p.demo ? `<a href="${esc(p.demo)}" class="btn" target="_blank" rel="noopener" data-track="demo-live:${esc(p.id)}">جرّب النسخة الحية ↗</a>` : `<a href="#screens" class="textlink">شاهد لقطات النظام</a>`}
    </div>
    <figure class="panel case-shot"><img src="/${esc(p.shot)}" width="2000" height="1250" fetchpriority="high" decoding="async" alt="${esc(p.shotAlt || p.tag)}"></figure>
    <p class="panel-cap"><span class="live">لقطة حقيقية من النظام</span><span>${esc(p.shotAlt || p.tag)}</span></p>
  </div>
</section>

<section class="proof">
  <div class="wrap"><div class="proof-in">
    ${c.facts.map(([v, l]) => `<div><b><bdi>${esc(v)}</bdi></b><span>${esc(l)}</span></div>`).join("\n    ")}
    <div><b><bdi>${c.roles.length}</bdi></b><span>أدوار مستخدمين: ${esc(c.roles.join("، "))}</span></div>
  </div></div>
</section>

<section class="sec">
  <div class="wrap case-grid">
    <div class="case-block">
      <div class="eyebrow"><span>التحدي</span></div>
      <h2>ما الذي كان يعطّل العمل</h2>
      <p class="case-lead">${esc(c.challenge)}</p>
    </div>
    <div class="case-block">
      <div class="eyebrow"><span>الحل</span></div>
      <h2>ما الذي بنيناه</h2>
      <ol class="case-steps">
        ${c.solution.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("\n        ")}
      </ol>
    </div>
  </div>
</section>

${all.length > 1 ? `<section class="sec light" id="screens">
  <div class="wrap">
    <div class="sec-head">
      <div class="eyebrow"><span>من داخل النظام</span></div>
      <h2>${all.length} لقطات حقيقية من ${esc(p.name)}</h2>
    </div>
    <div class="case-gallery">
      ${all.map(s => `<figure><div class="panel"><img src="/${esc(s.src)}" width="2000" height="1250" loading="lazy" decoding="async" alt="${esc(s.cap || p.name)}"></div>${s.cap ? `<figcaption>${esc(s.cap)}</figcaption>` : ""}</figure>`).join("\n      ")}
    </div>
  </div>
</section>` : `<span id="screens"></span>`}

<section class="sec">
  <div class="wrap case-grid">
    <div class="case-block">
      <div class="eyebrow"><span>التقنية</span></div>
      <h2>بماذا بُني</h2>
      <div class="tech case-tech">${(p.tech || []).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      <p class="mut">نختار التقنية حسب حجم التشغيل ومكان الاستضافة، ونسلّم الكود والتوثيق لجهتك.</p>
    </div>
    <div class="case-block">
      <div class="eyebrow"><span>من يستخدمه</span></div>
      <h2>كل دور يرى ما يخصّه</h2>
      <ul class="case-roles">${c.roles.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    </div>
  </div>
</section>

${contact(p)}

<section class="sec light">
  <div class="wrap">
    <div class="sec-head"><div class="eyebrow"><span>دراسات حالة أخرى</span></div><h2>أنظمة قريبة من هذا</h2></div>
    <div class="case-cards">
      ${related.map(card).join("\n      ")}
    </div>
    <nav class="case-pager" aria-label="التنقل بين دراسات الحالة">
      <a href="/cases/${esc(prev.id)}.html">→ ${esc(prev.name)}</a>
      <a href="/cases/${esc(next.id)}.html">${esc(next.name)} ←</a>
    </nav>
  </div>
</section>
</main>
${footer}`;
}

const card = x => `<a class="case-card" href="/cases/${esc(x.id)}.html">
        <div class="panel"><img src="/${esc(x.shot)}" width="2000" height="1250" loading="lazy" decoding="async" alt="${esc(x.shotAlt || x.name)}"></div>
        <span class="sector">${esc(SECTORS[x.sector] || "")}</span>
        <b>${esc(x.name)}</b>
        <span class="mut">${esc(cases[x.id]?.challenge.split("،")[0] || x.tag)}</span>
      </a>`;

function index() {
  const groups = Object.keys(SECTORS).filter(k => projects.some(p => p.sector === k));
  return `${head({ title: "دراسات الحالة — ليبيا برو للتقنية", desc: `${projects.length} دراسة حالة لأنظمة بنتها ليبيا برو للتقنية: التحدي، والحل، ولقطات حقيقية من كل نظام في المصارف والتجارة والمزادات واللوجستيات.`, path: "/cases/", image: "assets/share.png" })}
</head>
<body>
<div class="scroll-line" id="scroll-line" aria-hidden="true"></div>
${nav}
<main id="top">
<section class="case-hero">
  <div class="wrap">
    <div class="eyebrow"><span>دراسات الحالة</span></div>
    <h1>${projects.length} نظاماً. <span class="thin">كل واحد حلّ مشكلة حقيقية.</span></h1>
    <p class="hero-sub">لكل نظام: ما الذي كان يعطّل العمل، وما الذي بنيناه، ولقطات حقيقية من داخله.</p>
    <div class="case-filter" role="tablist">
      <button class="on" data-f="">الكل</button>
      ${groups.map(k => `<button data-f="${k}">${SECTORS[k]}</button>`).join("\n      ")}
    </div>
  </div>
</section>
<section class="sec">
  <div class="wrap">
    <div class="case-cards" id="case-cards">
      ${projects.map(x => card(x).replace('<a class="case-card"', `<a class="case-card" data-sector="${esc(x.sector)}"`)).join("\n      ")}
    </div>
  </div>
</section>
<section class="sec light" id="contact">
  <div class="wrap case-cta">
    <div>
      <div class="eyebrow"><span>لم تجد ما يشبه عملك؟</span></div>
      <h2>أجب عن خمسة أسئلة واعرف ما يحتاجه نظامك.</h2>
    </div>
    <a href="/#estimate" class="btn btn-gold">احسب نظامك</a>
  </div>
</section>
</main>
${footer}`;
}

fs.mkdirSync("cases", { recursive: true });
const missing = projects.filter(p => !cases[p.id]).map(p => p.id);
if (missing.length) throw new Error("لا توجد دراسة حالة لـ: " + missing.join(", "));
projects.forEach((p, i) => fs.writeFileSync(`cases/${p.id}.html`, page(p, i)));
fs.writeFileSync("cases/index.html", index());

/* خريطة الموقع */
const urls = ["/", "/banks.html", "/government.html", "/business.html", "/cases/"].concat(projects.map(p => `/cases/${p.id}.html`));
fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><changefreq>${u === "/" ? "weekly" : "monthly"}</changefreq><priority>${u === "/" ? "1.0" : u.startsWith("/cases/") && u !== "/cases/" ? "0.7" : "0.8"}</priority></url>`).join("\n")}
</urlset>
`);
console.log(`cases: ${projects.length} + index`);
