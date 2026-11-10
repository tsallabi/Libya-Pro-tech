/* يبني النسخة الإنجليزية من الموقع في en/ :
   - يقرأ كل صفحة عربية بمتصفح (بلا JavaScript) ويجمع النصوص العربية من العناصر والسمات
   - يترجم الجديد فقط عبر Gemini، ويحفظ الترجمات في data/i18n-en.json (ذاكرة لا تُترجم مرتين)
   - يكتب en/<الصفحة> باتجاه LTR وروابط إلى النسخ الإنجليزية، ويولّد data/projects.en.json و assets/i18n-en.js
   التشغيل بعد أي تعديل:  node scripts/build-cases.mjs && GEMINI_API_KEY=... node scripts/translate-en.mjs && node scripts/stamp.mjs */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright-core'); } catch { pw = require('/opt/node-tools/node_modules/playwright-core'); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MAP_FILE = path.join(ROOT, 'data/i18n-en.json');
const map = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : {};
const AR = /[؀-ۿ]/;
const PAGES = ['index.html', 'banks.html', 'government.html', 'business.html', 'marketing.html', 'academy.html', '404.html', 'profile.html']
  .concat(fs.readdirSync(path.join(ROOT, 'cases')).filter(f => f.endsWith('.html')).map(f => 'cases/' + f));

/* ── الترجمة ── */
const GLOSSARY = `Rules: Libya Pro Tech for ليبيا برو للتقنية / ليبيا برو. Keep product names in their usual Latin form:
أمان برو=AmanPro, ماكينا=Macchina, أوتوبرو/أوتو برو=AutoPro, هدهد=HUDHUDE, أجّرلي=Ajrly, توّا=Tawwa, المكتبة الطيبة=Taybaa Library,
مصحف ليبيا=Mushaf Libya, مجموعة المزاد الدولي=International Auction Group, الحاج خليفة=Hajj Khalifa. د.ل = LYD.
Write clear, confident, concise B2B marketing English (US spelling). Keep numbers, URLs, emojis, arrows (← →) and punctuation style.
Arrows: replace a trailing "←" with "→". Keep any {placeholders} untouched. Do not add quotes or explanations.
Strings that start with "html:" contain inline HTML: keep the "html:" prefix, keep every tag and attribute exactly as given (same tags, same order),
and translate only the text so the whole sentence reads naturally in English (you may move words between tags if needed for grammar).`;
async function gemini(list) {
  const body = { contents: [{ parts: [{ text: `${GLOSSARY}\n\nTranslate each Arabic string in this JSON array into English. Return a JSON array of the same length and order.\n\n${JSON.stringify(list)}` }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } };
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      const out = JSON.parse(j.candidates[0].content.parts[0].text);
      if (Array.isArray(out) && out.length === list.length) return out;
    } catch (e) { /* يعاد */ }
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('translation failed');
}
async function translateAll(strings) {
  const todo = [...new Set(strings)].filter(s => s && AR.test(s) && !(s in map));
  if (process.env.DUMP_TODO) { fs.writeFileSync(process.env.DUMP_TODO, JSON.stringify(todo, null, 1)); process.exit(0); }
  for (let i = 0; i < todo.length; i += 60) {
    const chunk = todo.slice(i, i + 60);
    const out = await gemini(chunk);
    chunk.forEach((s, k) => { map[s] = String(out[k]); });
    fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));
    process.stdout.write(`  ترجمة ${Math.min(i + 60, todo.length)}/${todo.length}\r`);
  }
  if (todo.length) console.log(`  ترجمة ${todo.length} نصاً جديداً`);
}

/* ── الصفحات ── */
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ javaScriptEnabled: false });
const page = await ctx.newPage();
const ATTRS = ['alt', 'placeholder', 'title', 'aria-label', 'content', 'data-name', 'data-case-name', 'data-note'];

async function collect(file) {
  await page.goto('file://' + path.join(ROOT, file), { waitUntil: 'domcontentloaded' });
  return page.evaluate(({ ATTRS }) => {
    const AR = /[؀-ۿ]/, out = [];
    const INL = /^(SPAN|B|I|EM|STRONG|BDI|BR|SMALL|SUP|SUB|CODE|ABBR|MARK)$/;
    const mixed = e => e.children.length && AR.test(e.textContent) && [...e.querySelectorAll('*')].every(x => INL.test(x.tagName)) && !/^(SCRIPT|STYLE)$/.test(e.tagName);
    document.querySelectorAll('body *').forEach(e => { if (mixed(e) && !(e.parentElement && mixed(e.parentElement))) { e.setAttribute('data-mx', '1'); out.push('html:' + e.innerHTML.replace(/\s+/g, ' ').trim()); } });
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      if (n.parentElement && /^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) continue;
      if (n.parentElement && n.parentElement.closest('[data-mx]')) continue;
      const t = n.nodeValue.trim(); if (t && AR.test(t)) out.push(t);
    }
    document.querySelectorAll('*').forEach(e => ATTRS.forEach(a => { const v = e.getAttribute(a); if (v && AR.test(v)) out.push(v.trim()); }));
    document.querySelectorAll('input[type=hidden][value]').forEach(e => { if (AR.test(e.value)) out.push(e.value.trim()); });
    return out;
  }, { ATTRS });
}

const all = [];
for (const f of PAGES) all.push(...await collect(f));
/* بيانات المشاريع ونصوص الواجهة في ملفات JavaScript */
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/projects.json'), 'utf8'));
const pStr = p => [p.name, p.tag, p.desc, p.shotAlt, ...(p.gallery || []).flatMap(g => typeof g === 'string' ? [] : [g.alt, g.cap]), ...(p.reels || []).map(r => r.cap)];
P.forEach(p => all.push(...pStr(p).filter(Boolean)));
const jsFrags = [];
/* قارئ بسيط لشيفرة JavaScript: يستخرج النصوص بين علامات التنصيص ويتجاهل التعليقات والتعابير النمطية */
function jsStrings(src) {
  const out = []; let i = 0, prev = '';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 2; if (i < 2) break; continue; }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(prev)) {          /* تعبير نمطي */
      let k = i + 1, cls = false; while (k < src.length) { const e = src[k]; if (e === '\\') { k += 2; continue; } if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break; else if (e === '\n') break; k++; }
      i = k + 1; prev = '/'; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let k = i + 1, buf = '', depth = 0;
      while (k < src.length) {
        const e = src[k];
        if (e === '\\') { buf += src[k] + src[k + 1]; k += 2; continue; }
        if (c === '`' && e === '$' && src[k + 1] === '{') {
          depth = 1; buf += '\u0000'; k += 2; const st = k; let q = null;
          while (k < src.length && depth) { const x = src[k];
            if (q) { if (x === '\\') k++; else if (x === q) q = null; }
            else if (x === '"' || x === "'" || x === '`') q = x; else if (x === '{') depth++; else if (x === '}') depth--;
            k++; }
          out.push(...jsStrings(src.slice(st, k - 1)));   /* النصوص داخل ${…} */
          continue; }
        if (e === c) break; buf += e; k++;
      }
      out.push(buf); i = k + 1; prev = 'x'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
for (const f of ['assets/app.js', 'assets/engage.js', 'assets/track.js']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const s of jsStrings(src)) {
    s.split(/\u0000|\\n|<[^>]+>|\$\{[^}]*\}/).map(x => x.trim()).filter(x => AR.test(x) && x.length > 1).forEach(x => jsFrags.push(x));
  }
}
all.push(...jsFrags);
console.log(`نصوص فريدة: ${new Set(all).size}`);
await translateAll(all);

const T = s => { const k = s.trim(); return map[k] != null ? s.replace(k, map[k]) : s; };
const LINK_SKIP = /^\/(assets|data|api|admin|brand|en)\b|\.(pdf|png|jpe?g|webp|svg|mp4|xml|txt)$/i;
const toEn = href => {
  if (!href || /^(https?:|mailto:|tel:|#|javascript:)/.test(href)) return href;
  if (href.startsWith('/')) return LINK_SKIP.test(href) ? href : '/en' + href;
  return href;
};
const abs = (src, file) => (!src || /^(https?:|data:|\/|#)/.test(src)) ? src : '/' + path.posix.join(path.posix.dirname(file), src).replace(/^\.\//, '');

for (const f of PAGES) {
  await page.goto('file://' + path.join(ROOT, f), { waitUntil: 'domcontentloaded' });
  const html = await page.evaluate(({ map, ATTRS, f }) => {
    const AR = /[؀-ۿ]/;
    const T = s => { const k = s.trim(); return map[k] != null ? s.replace(k, map[k]) : s; };
    const INL = /^(SPAN|B|I|EM|STRONG|BDI|BR|SMALL|SUP|SUB|CODE|ABBR|MARK)$/;
    const mixed = e => e.children.length && AR.test(e.textContent) && [...e.querySelectorAll('*')].every(x => INL.test(x.tagName)) && !/^(SCRIPT|STYLE)$/.test(e.tagName);
    const tags = h => (h.match(/<[a-z]+/gi) || []).length;
    [...document.querySelectorAll('body *')].filter(e => mixed(e) && !(e.parentElement && mixed(e.parentElement))).forEach(e => {
      const k = 'html:' + e.innerHTML.replace(/\s+/g, ' ').trim(), v = map[k];
      if (v && v.startsWith('html:') && tags(v) === tags(k)) e.innerHTML = v.slice(5);   /* وإلا تبقى ترجمة الأجزاء أدناه */
    });
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      if (n.parentElement && /^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) continue;
      { const z = n.parentElement && n.parentElement.closest('[lang=ar]'); if (z && z !== document.documentElement) continue; }
      if (AR.test(n.nodeValue)) n.nodeValue = T(n.nodeValue);
    }
    document.querySelectorAll('*').forEach(e => ATTRS.forEach(a => { const v = e.getAttribute(a); if (v && AR.test(v)) e.setAttribute(a, T(v)); }));
    document.querySelectorAll('input[type=hidden][value]').forEach(e => { if (AR.test(e.value)) e.setAttribute('value', T(e.value)); });
    /* بيانات منظّمة JSON-LD */
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try { const j = JSON.parse(s.textContent); const walk = o => { for (const k in o) { if (typeof o[k] === 'string' && AR.test(o[k])) o[k] = T(o[k]); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } }; walk(j); j.inLanguage = 'en'; s.textContent = JSON.stringify(j).replace(/</g, '\\u003c'); } catch (e) {}
    });
    document.querySelectorAll('.vbox').forEach(b => { const v = b.querySelector('video'); if (!v || !b.dataset.en) return;
      v.setAttribute('src', '/' + b.dataset.en.replace(/^\//, '')); if (b.dataset.pen) v.setAttribute('poster', '/' + b.dataset.pen.replace(/^\//, ''));
      v.dataset.trackId = (b.dataset.id || '') + ':en';
      b.querySelectorAll('.vtabs button').forEach(x => x.classList.toggle('on', x.dataset.l === 'en')); });
    document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
    return '<!doctype html>\n' + document.documentElement.outerHTML;
  }, { map, ATTRS, f });
  let out = html
    .replace(/(<(?:a|link)\b[^>]*?\bhref=")([^"]*)"/g, (m, a, h) => a + toEn(abs(h, f).startsWith('/') && !/^(https?:|#|mailto:|tel:)/.test(h) ? abs(h, f) : h) + '"')
    .replace(/(\s(?:src|poster|data-src|data-ar|data-en|data-par|data-pen)=")([^"]*)"/g, (m, a, s) => a + abs(s, f) + '"')
    .replace(/data-src="\/data\/projects\.json"/, 'data-src="/data/projects.en.json"')
    .replace(/(<link rel="canonical" href="https:\/\/libyaprotech\.com)(\/[^"]*)"/, (m, a, p) => a + '/en' + p + '"')
    .replace(/(<meta property="og:url" content="https:\/\/libyaprotech\.com)(\/[^"]*)"/, (m, a, p) => a + '/en' + p + '"')
    .replace('content="ar_LY"', 'content="en_US"')
    .replace(/assets\/(share(?:-[a-z]+)?)\.png/g, 'assets/$1-en.png')
    .replace(/\/assets\/libya-pro-tech-profile\.pdf/g, '/assets/libya-pro-tech-profile-en.pdf')
    .replace(/<head>/, '<head>\n<script src="/assets/i18n-en.js"></script>');
  /* زر اللغة يشير إلى النسخة العربية */
  const arPath = '/' + f.replace(/^index\.html$/, '').replace(/(^|\/)index\.html$/, '$1');
  out = out.replace(/<a class="lang-sw"[^>]*>[^<]*<\/a>/, `<a class="lang-sw" href="${arPath}" hreflang="ar" lang="ar" data-lang="ar">العربية</a>`);
  const dest = path.join(ROOT, 'en', f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out);
}
await browser.close();

/* بيانات المشاريع الإنجليزية */
const PE = JSON.parse(JSON.stringify(P)).map(p => {
  for (const k of ['name', 'tag', 'desc', 'shotAlt']) if (p[k]) p[k] = T(p[k]);
  (p.gallery || []).forEach(g => { if (typeof g === 'object') { g.alt = T(g.alt || ''); g.cap = T(g.cap || ''); } });
  (p.reels || []).forEach(r => { r.cap = T(r.cap || ''); });
  return p;
});
fs.writeFileSync(path.join(ROOT, 'data/projects.en.json'), JSON.stringify(PE, null, 1));

/* قاموس نصوص الواجهة لملفات JavaScript في النسخة الإنجليزية */
const dict = {}; [...new Set(jsFrags)].sort((a, b) => b.length - a.length).forEach(s => { if (map[s]) dict[s] = map[s]; });
fs.writeFileSync(path.join(ROOT, 'assets/i18n-en.js'), `/* نصوص الواجهة بالإنجليزية — يولّده scripts/translate-en.mjs، لا تعدّله يدوياً */
(function () {
  var D = ${JSON.stringify(dict)};
  var K = Object.keys(D);
  var AR = /[\\u0600-\\u06FF]/;
  function t(s) { if (!s || !AR.test(s)) return s; var k = s.trim(); if (D[k]) return s.replace(k, D[k]);
    for (var i = 0; i < K.length; i++) if (s.indexOf(K[i]) > -1) s = s.split(K[i]).join(D[K[i]]); return s; }
  window.LP_T = t; window.LP_LANG = "en";
  /* لا نكتب إلا إذا تغيّر النص، وإلا عاد المراقب يستدعي نفسه بلا نهاية */
  function set(n) { var v = n.nodeValue; if (!AR.test(v) || (n.parentElement && n.parentElement.closest("body [lang=ar]"))) return; var x = t(v); if (x !== v) n.nodeValue = x; }
  function fix(root) {
    if (root.nodeType === 3) { set(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.tagName) || root.closest && root.closest("[lang=ar]")) return;
    ["placeholder", "aria-label", "title", "alt"].forEach(function (a) { var v = root.getAttribute(a); if (v && AR.test(v)) { var x = t(v); if (x !== v) root.setAttribute(a, x); } });
    for (var c = root.firstChild; c; c = c.nextSibling) fix(c);
  }
  new MutationObserver(function (ms) { ms.forEach(function (m) {
    if (m.type === "characterData") set(m.target);
    else m.addedNodes.forEach(fix);
  }); }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
`);
console.log(`en/: ${PAGES.length} صفحة · قاموس الواجهة: ${Object.keys(dict).length} نصاً`);
