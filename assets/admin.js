/* لوحة التحكم — تقرأ من /api/admin/* على النطاق نفسه (بلا مكتبات) */
(function () {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = new Intl.NumberFormat("ar-LY");
  const regionName = (() => { try { return new Intl.DisplayNames(["ar"], { type: "region" }); } catch { return null; } })();
  const flag = cc => cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : "🌐";
  const country = cc => {
    if (!cc || cc === "—") return "غير معروف";
    let name = cc; try { if (regionName) name = regionName.of(cc) || cc; } catch { /* رموز مثل T1 (Tor) */ }
    return `${flag(cc)} ${name}`;
  };
  const dev = { mobile: "📱 جوال", desktop: "💻 حاسوب", tablet: "📟 لوحي" };
  const dur = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} ث` : `${Math.floor(s / 60)} د ${s % 60} ث`; };
  const ago = ts => { const s = Math.round((Date.now() - ts) / 1000);
    return s < 60 ? `قبل ${s} ث` : s < 3600 ? `قبل ${Math.floor(s / 60)} د` : s < 86400 ? `قبل ${Math.floor(s / 3600)} س` : new Date(ts).toLocaleDateString("ar-LY"); };
  /* كلودفلاير يحذف .html من الروابط، فتصل الصفحات بالصيغتين */
  const PAGES = { "": "الرئيسية", "index": "الرئيسية", "banks": "المصارف", "government": "الحكومة",
    "business": "الشركات والمتاجر", "profile": "الملف التعريفي", "admin": "لوحة التحكم" };
  const pageName = p => {
    const [path, hash] = String(p || "/").split("#");
    const k = path.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    const name = PAGES[k] != null ? PAGES[k] : path;
    return hash ? `${name} · #${hash}` : name;
  };

  async function api(path, opt = {}) {
    const r = await fetch("/api/admin/" + path, { credentials: "same-origin", ...opt,
      headers: opt.body ? { "content-type": "application/json" } : undefined });
    if (r.status === 401) { showLogin(); throw new Error("auth"); }
    return r.json();
  }

  /* ─── الدخول ─── */
  function showLogin() { $("#app").hidden = true; $("#login").hidden = false; }
  function showApp() { $("#login").hidden = true; $("#app").hidden = false; load(); }
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: e.target.password.value }) });
    if (r.ok) { $("#login-err").hidden = true; showApp(); } else $("#login-err").hidden = false;
  });
  $("#logout").addEventListener("click", async () => { await fetch("/api/admin/logout", { method: "POST" }); showLogin(); });

  /* ─── التبويبات ─── */
  let tab = "overview";
  $$("#tabs button").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    $$("#tabs button").forEach(x => x.classList.toggle("on", x === b));
    $$("[data-view]").forEach(v => { v.hidden = v.dataset.view !== tab; });
    $("#page-title").textContent = b.childNodes[0].textContent.trim();
    load();
  }));
  $("#days").addEventListener("change", load);
  $("#refresh").addEventListener("click", load);
  const days = () => $("#days").value;

  /* ─── عناصر العرض ─── */
  function bars(el, rows, key = r => r.k, val = r => r.n) {
    if (!rows || !rows.length) { el.innerHTML = '<p class="adm-empty">لا بيانات بعد في هذه الفترة.</p>'; return; }
    const max = Math.max(...rows.map(val)) || 1;
    el.innerHTML = '<div class="adm-bars">' + rows.map(r =>
      `<div class="adm-bar"><span class="k">${key(r)}</span><em>${nf.format(val(r))}</em><i><s data-w="${(100 * val(r) / max).toFixed(1)}"></s></i></div>`
    ).join("") + "</div>";
    /* العرض عبر CSSOM لا عبر سمة style — سياسة الأمان تمنع الأنماط المضمّنة في HTML */
    el.querySelectorAll("s[data-w]").forEach(s => { s.style.width = s.dataset.w + "%"; });
  }
  function table(el, cols, rows, onRow) {
    if (!rows.length) { el.innerHTML = '<p class="adm-empty">لا بيانات بعد.</p>'; return; }
    el.innerHTML = '<div class="adm-scroll"><table class="adm-table"><thead><tr>' + cols.map(c => `<th>${c[0]}</th>`).join("") +
      "</tr></thead><tbody>" + rows.map((r, i) => `<tr data-i="${i}" class="${onRow ? "click" : ""}">` +
      cols.map(c => `<td>${c[1](r)}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
    if (onRow) el.querySelectorAll("tr[data-i]").forEach(tr => tr.addEventListener("click", () => onRow(rows[tr.dataset.i])));
  }
  function chart(el, series) {
    if (!series.length) { el.innerHTML = '<p class="adm-empty">لا زيارات بعد في هذه الفترة.</p>'; return; }
    const W = 900, H = 220, P = 30, max = Math.max(...series.map(s => s.v), 1);
    const x = i => P + (series.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (series.length - 1));
    const y = v => H - P - (v / max) * (H - 2 * P);
    const pts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join(" ");
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="الزوار يومياً">
      <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="rgba(11,11,12,.12)"/>
      <polyline points="${pts}" fill="none" stroke="#0B0B0C" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.v)}" r="3.5" fill="#0B0B0C"><title>${s.d}: ${s.v} زائر</title></circle>
        <text x="${x(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#868C99">${s.d.slice(5)}</text>
        <text x="${x(i)}" y="${y(s.v) - 9}" font-size="11" text-anchor="middle" fill="#0B0B0C" font-weight="700">${s.v}</text>`).join("")}
    </svg>`;
  }

  /* ─── تحميل التبويب الحالي ─── */
  async function load() {
    try {
      if (tab === "overview" || tab === "sources") await loadStats();
      if (tab === "live") await loadLive();
      if (tab === "visitors") await loadVisitors();
      if (tab === "leads") await loadLeads();
      if (tab === "wa") await loadWa();
      if (tab === "nl") await loadNl();
      if (tab === "settings") await loadSettings();
      badges();
    } catch (e) { if (e.message !== "auth") console.error(e); }
  }

  async function badges() {
    try {
      const l = await api("live"); $("#live-badge").textContent = l.online.length;
      const d = await api("leads"); $("#leads-badge").textContent = d.rows.filter(r => r.status === "new").length;
    } catch {}
  }

  async function loadStats() {
    const s = await api("stats?days=" + days());
    const t = s.totals;
    $("#kpis").innerHTML = [
      ["hot", "على الموقع الآن", t.online], ["", "زوار", t.visitors], ["", "زيارات", t.sessions],
      ["", "صفحات مشاهدة", t.pageviews], ["", "متوسط مدة الزيارة", dur(t.avg_sec * 1000)],
      ["", "غادروا من أول صفحة", t.bounce + "٪"], ["", "زوار عائدون", t.returning], ["", "طلبات عروض", t.leads]
    ].map(([c, k, v]) => `<div class="adm-kpi ${c}"><span>${k}</span><b>${typeof v === "number" ? nf.format(v) : v}</b></div>`).join("");
    chart($("#chart"), s.series);
    bars($("#t-pages"), s.pages, r => esc(pageName(r.k)));
    bars($("#t-clicks"), s.clicks, r => esc(r.k || r.t));
    bars($("#t-countries"), s.countries, r => esc(country(r.k)));
    bars($("#t-cities"), s.cities, r => `${esc(r.k)} <span class="mut">${flag(r.c)}</span>`);
    bars($("#t-devices"), s.devices, r => dev[r.k] || esc(r.k));
    bars($("#t-os"), [...s.os, ...s.browsers], r => esc(r.k));
    bars($("#t-refs"), s.referrers, r => esc(r.k));
    table($("#t-utm"), [["المصدر", r => esc(r.src)], ["الوسيلة", r => esc(r.med)], ["الحملة", r => esc(r.k)],
      ["زيارات", r => nf.format(r.n)], ["زوار", r => nf.format(r.u)]], s.campaigns);
  }

  let liveTimer = 0;
  async function loadLive() {
    const d = await api("live");
    table($("#live-table"), [
      ["المكان", r => `${esc(country(r.country))}<br><span class="mut">${esc(r.city || "")}${r.region ? "، " + esc(r.region) : ""}</span>`],
      ["يتصفّح الآن", r => `<b>${esc(pageName(r.current_path))}</b>`],
      ["صفحات", r => r.pages], ["مدة", r => dur(r.dur_ms)],
      ["جاء من", r => esc(r.utm_source || r.ref_host || "مباشر")],
      ["الجهاز", r => `${dev[r.device] || esc(r.device)}<br><span class="mut">${esc(r.os)} · ${esc(r.browser)}</span>`],
      ["آخر نشاط", r => ago(r.last_ping)]
    ], d.online, r => journey(r.vid));
    clearTimeout(liveTimer);
    if (tab === "live") liveTimer = setTimeout(loadLive, 10000);
  }

  function filterQS() {
    const p = new URLSearchParams({ days: days() });
    [["country", "#f-country"], ["city", "#f-city"], ["device", "#f-device"], ["source", "#f-source"], ["page", "#f-page"]]
      .forEach(([k, s]) => { const v = $(s).value.trim(); if (v) p.set(k, k === "country" ? v.toUpperCase() : v); });
    return p.toString();
  }
  $("#f-apply").addEventListener("click", loadVisitors);
  async function loadVisitors() {
    const d = await api("visitors?" + filterQS());
    $("#exp-visitors").href = "/api/admin/export?type=visitors&days=" + days();
    table($("#visitors-table"), [
      ["الوقت", r => ago(r.started)],
      ["المكان", r => `${esc(country(r.country))}<br><span class="mut">${esc(r.city || "")}</span>`],
      ["دخل من", r => esc(pageName(r.entry))], ["خرج من", r => esc(pageName(r.exit_path))],
      ["صفحات", r => r.pages], ["مدة", r => dur(r.dur_ms)],
      ["المصدر", r => esc(r.utm_campaign ? `${r.utm_source} · ${r.utm_campaign}` : r.ref_host || "مباشر")],
      ["الجهاز", r => dev[r.device] || esc(r.device)],
      ["الزائر", r => r.lead_name ? `<span class="adm-pill lead">${esc(r.lead_name)}</span>` : `<span class="adm-pill">${r.visits > 1 ? "عائد ×" + r.visits : "جديد"}</span>`]
    ], d.rows, r => journey(r.vid));
  }

  const KIND = { quote: "نموذج عرض", demo: "فتح الأنظمة", estimate: "حاسبة النظام", case: "دراسة حالة", wa_ad: "إعلان واتساب" };
  const pname = id => String(id).replace(/[-_]/g, " ");
  function answers(a) {
    if (!a) return "";
    try { const o = JSON.parse(a); return "<br>" + Object.entries(o).map(([k, v]) => `${esc(k)}: ${esc(Array.isArray(v) ? v.join("، ") : String(v))}`).join("<br>"); }
    catch { return ""; }
  }
  /* ─── حملات واتساب: عدّة جاهزة لكل قطاع + تسجيل المحادثات بالرمز ─── */
  let KITS = null, WA_NUM = "";
  async function loadWa() {
    if (!KITS) {
      KITS = await fetch("/data/campaigns.json", { cache: "no-store" }).then(r => r.json());
      WA_NUM = ((await api("settings")).whatsapp || "").replace(/\D/g, "");
      $("#wa-code").innerHTML = KITS.map(k => ["A", "B"].map(v => `<option value="${k.code}-${v}">${k.code}-${v} · ${esc(k.name)}</option>`).join("")).join("");
      renderKits();
    }
    const d = await api("campaigns");
    const by = Object.fromEntries(d.rows.map(r => [r.code, r]));
    const codes = KITS.flatMap(k => ["A", "B"].map(v => ({ code: `${k.code}-${v}`, name: k.name })));
    table($("#wa-results"), [
      ["الرمز", r => `<b dir="ltr">${r.code}</b><br><span class="mut">${esc(r.name)}</span>`],
      ["زيارات الموقع", r => (by[r.code] || {}).visits || 0],
      ["محادثات واتساب", r => (by[r.code] || {}).chats || 0],
      ["كل الطلبات", r => (by[r.code] || {}).leads || 0],
      ["اجتماع/عرض/تعاقد", r => (by[r.code] || {}).hot || 0],
      ["تعاقد", r => `<b>${(by[r.code] || {}).won || 0}</b>`]
    ], codes);
  }
  function renderKits() {
    const cp = (t, label = "نسخ") => `<button type="button" class="adm-ghost wa-copy" data-t="${esc(t)}">${label}</button>`;
    $("#wa-kits").innerHTML = KITS.map(k => `<div class="adm-card wa-kit">
      <h2>${esc(k.name)} <span class="adm-pill" dir="ltr">${k.code}</span></h2>
      <div class="wa-imgs">
        <a href="/brand/ads/${k.id}-feed-1080x1080.png" download><img src="/brand/ads/${k.id}-feed-1080x1080.png" alt=""><span>مربعة للمنشورات ↓</span></a>
        <a href="/brand/ads/${k.id}-story-1080x1920.png" download><img src="/brand/ads/${k.id}-story-1080x1920.png" alt=""><span>طولية للقصص ↓</span></a>
      </div>
      ${k.primary.map((t, i) => { const v = "AB"[i], code = `${k.code}-${v}`, pre = `${k.prefill} (رمز: ${code})`; return `
      <div class="wa-var"><h3>الإعلان ${v} <span class="adm-pill" dir="ltr">${code}</span></h3>
        <p class="mut">النص الأساسي</p><pre class="adm-pre">${esc(t)}</pre>${cp(t)}
        <p class="mut">العنوان</p><pre class="adm-pre">${esc(k.headline)}</pre>${cp(k.headline)}
        <p class="mut">الرسالة الجاهزة التي يرسلها العميل (فيها رمز الإعلان — لا تحذفه)</p><pre class="adm-pre">${esc(pre)}</pre>${cp(pre)}
        <a class="adm-ghost" target="_blank" rel="noopener" href="https://wa.me/${WA_NUM}?text=${encodeURIComponent(pre)}">جرّب الرسالة على واتساب ↗</a>
      </div>`; }).join("")}
      <div class="wa-var"><h3>رسالة الترحيب والأسئلة السريعة</h3>
        <pre class="adm-pre">${esc(k.greeting)}</pre>${cp(k.greeting)}
        <ul>${k.faq.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>
      <div class="wa-var"><h3>الجمهور المستهدف</h3>
        <ul><li><b>الأماكن:</b> ${esc(k.audience.locations)}</li><li><b>العمر:</b> ${esc(k.audience.age)}</li>
        <li><b>الاهتمامات (ابحث عنها واحدة واحدة في خانة «الاستهداف التفصيلي»):</b> ${esc(k.audience.interests)}</li><li>${esc(k.audience.extra)}</li></ul>
        <p class="mut">رابط الموقع لنفس الحملة (إن اخترت وجهة «موقع إلكتروني» بدل واتساب):</p>
        <pre class="adm-pre" dir="ltr">${esc(`${location.origin}${k.page}?utm_source=facebook&utm_medium=paid&utm_campaign=${k.code}-A`)}</pre>
      </div></div>`).join("");
    $$(".wa-copy").forEach(b => b.addEventListener("click", () => navigator.clipboard.writeText(b.dataset.t).then(() => {
      b.textContent = "نُسخ ✓"; setTimeout(() => { b.textContent = "نسخ"; }, 1500); })));
  }
  $("#wa-log").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, body = Object.fromEntries(new FormData(f));
    const r = await api("campaigns", { method: "POST", body: JSON.stringify(body) });
    const m = $("#wa-log-msg"); m.hidden = false;
    m.textContent = r.ok ? `سُجّلت محادثة ${body.name} على الرمز ${body.code} ✓ — تظهر أيضاً في «العملاء المحتملون»` : "تعذّر الحفظ: تأكد من الاسم والرقم";
    if (r.ok) { f.reset(); loadWa(); badges(); }
  });

  /* ─── الرسالة الشهرية للمسجّلين ─── */
  const NL_GROUPS = { finance: "المصارف والمالية", gov: "الجهات الحكومية", business: "الشركات والمتاجر", cars: "السيارات والمزادات", general: "عام" };
  const NL_DEFAULT = { finance: ["amanpro-full", "accounting"], gov: ["mazadna", "ajrly"], business: ["talin", "ajrly"],
                       cars: ["autopro", "mazadna"], general: ["mushaf", "talin"] };
  const NL_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  let NL = null;   /* { projects, picks:{grp:[ids]}, texts:{grp:text}, rows } */
  function nlGroup(s, P) {
    for (const h of s.hints) {
      const c = String(h.campaign || "").slice(0, 3);
      if (c === "BNK") return "finance"; if (c === "GOV") return "gov"; if (c === "BIZ") return "business"; if (c === "CAR") return "cars";
      try { const a = JSON.parse(h.answers || "null"); if (a && a.sector) return { finance: "finance", gov: "gov", company: "business", commerce: "business" }[a.sector] || "business"; } catch (_) {}
      const p = h.project && P.find(x => x.id === h.project);
      if (p) return { finance: "finance", auctions: "cars", logistics: "cars", gov: "gov" }[p.sector] || "business";
      const t = String(h.sector || "");
      if (/مصرف|مال|صراف/.test(t)) return "finance"; if (/حكوم|وزار|بلدي/.test(t)) return "gov";
      if (/سيار|مزاد|شحن/.test(t)) return "cars"; if (t) return "business";
    }
    return "general";
  }
  const nlIssue = () => $("#nl-issue").value || new Date().toISOString().slice(0, 7);
  function nlText(g) {
    const [y, m] = nlIssue().split("-"), tag = `NL-${nlIssue()}-${g}`;
    const items = (NL.picks[g] || []).map(id => NL.projects.find(p => p.id === id)).filter(Boolean);
    return `مرحباً {الاسم} 👋\nهذا جديد ليبيا برو لشهر ${NL_MONTHS[+m - 1]} ${y} في ${NL_GROUPS[g] === "عام" ? "أنظمتنا" : "قطاع " + NL_GROUPS[g]}:\n\n` +
      items.map(p => `• ${p.name} — ${p.tag}\n${location.origin}/cases/${p.id}.html?utm_source=whatsapp&utm_medium=newsletter&utm_campaign=${tag}`).join("\n\n") +
      `\n\nتريد عرضاً حياً لأيّ منها؟ ردّ على هذه الرسالة بكلمة «عرض».\n\nلإيقاف هذه الرسائل أرسل «إيقاف».`;
  }
  function nlCompose() {
    const used = [...new Set(NL.rows.map(r => r.grp))];
    $("#nl-compose").innerHTML = Object.keys(NL_GROUPS).filter(g => used.includes(g)).map(g => `<div class="adm-card nl-box" data-g="${g}">
      <h2>رسالة ${NL_GROUPS[g]} <span class="adm-pill">${NL.rows.filter(r => r.grp === g && !r.optout).length} مشترك</span></h2>
      <p class="mut">الأنظمة التي تُعرض في رسالة هذا الشهر:</p>
      <div class="nl-picks">${NL.projects.map(p => `<label><input type="checkbox" value="${p.id}" ${(NL.picks[g] || []).includes(p.id) ? "checked" : ""}> ${esc(p.name)}</label>`).join("")}</div>
      <p class="mut">نص الرسالة — يمكنك تعديله. {الاسم} يُستبدل باسم كل مشترك.</p>
      <textarea class="nl-text" rows="12">${esc(NL.texts[g] || nlText(g))}</textarea>
    </div>`).join("");
    $$(".nl-box").forEach(box => {
      const g = box.dataset.g, ta = box.querySelector(".nl-text");
      box.querySelectorAll(".nl-picks input").forEach(i => i.addEventListener("change", () => {
        NL.picks[g] = [...box.querySelectorAll(".nl-picks input:checked")].map(x => x.value); ta.value = NL.texts[g] = nlText(g);
      }));
      ta.addEventListener("input", () => { NL.texts[g] = ta.value; });
    });
  }
  function nlTable() {
    const gf = $("#nl-grp").value, rows = NL.rows.filter(r => !gf || r.grp === gf);
    const act = NL.rows.filter(r => !r.optout), done = act.filter(r => r.sent).length;
    $("#nl-progress").textContent = `أُرسلت رسالة ${nlIssue()} إلى ${done} من ${act.length} مشترك` + (NL.rows.length - act.length ? ` · ${NL.rows.length - act.length} أوقفوا الاشتراك` : "");
    table($("#nl-table"), [
      ["المشترك", r => `<b>${esc(r.name)}</b>${r.company ? `<br><span class="mut">${esc(r.company)}</span>` : ""}`],
      ["الرقم", r => `<span dir="ltr">+${esc(r.phone)}</span>`],
      ["القطاع", r => NL_GROUPS[r.grp]],
      ["المكان", r => `${esc(country(r.country))}<br><span class="mut">${esc(r.city || "")}</span>`],
      ["منذ", r => ago(r.first)],
      ["الإرسال", r => r.optout ? `<span class="mut">أوقف الاشتراك</span>` : r.sent ? `<span class="adm-pill lead">أُرسل ✓ ${ago(r.sent)}</span>`
        : `<a class="btn btn-gold btn-sm nl-send" data-p="${r.phone}" target="_blank" rel="noopener" href="#">أرسل</a>`],
      ["", r => `<button class="adm-ghost nl-opt" data-p="${r.phone}" data-on="${r.optout ? 0 : 1}">${r.optout ? "أعد الاشتراك" : "أوقف"}</button>`]
    ], rows);
    $$(".nl-send").forEach(a => {
      const r = NL.rows.find(x => x.phone === a.dataset.p);
      const fill = () => { const first = String(r.name || "").trim().split(/\s+/)[0] || "";
        a.href = `https://wa.me/${r.phone}?text=` + encodeURIComponent((NL.texts[r.grp] || nlText(r.grp)).replace(/\{الاسم\}/g, first)); };
      fill(); a.addEventListener("pointerdown", fill); a.addEventListener("focus", fill);
      a.addEventListener("click", () => {
        fill();
        api("newsletter", { method: "POST", body: JSON.stringify({ action: "sent", phone: r.phone, issue: nlIssue(), grp: r.grp }) })
          .then(() => { r.sent = Date.now(); nlTable(); });
      });
    });
    $$(".nl-opt").forEach(b => b.addEventListener("click", () =>
      api("newsletter", { method: "POST", body: JSON.stringify({ action: "optout", phone: b.dataset.p, on: b.dataset.on === "1" }) }).then(loadNl)));
  }
  async function loadNl() {
    if (!NL) {
      NL = { projects: await fetch("/data/projects.json").then(r => r.json()), picks: JSON.parse(JSON.stringify(NL_DEFAULT)), texts: {}, rows: [] };
      if (!$("#nl-issue").value) $("#nl-issue").value = new Date().toISOString().slice(0, 7);
      $("#nl-grp").innerHTML += Object.entries(NL_GROUPS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
      $("#nl-issue").addEventListener("change", () => { NL.texts = {}; loadNl(); });
      $("#nl-grp").addEventListener("change", nlTable);
    }
    const d = await api("newsletter?issue=" + nlIssue());
    NL.rows = d.rows.map(r => ({ ...r, grp: nlGroup(r, NL.projects) }));
    nlCompose(); nlTable();
  }

  const STATUS = { new: "جديد", contacted: "تم التواصل", meeting: "اجتماع", proposal: "عرض سعر", won: "تم التعاقد", lost: "لم يتم" };
  async function loadLeads() {
    const d = await api("leads");
    const kf = $("#lead-kind");
    if (!kf.dataset.b) { kf.dataset.b = 1; kf.addEventListener("change", loadLeads); }
    const rows = d.rows.filter(r => !kf.value || (r.kind || "quote") === kf.value);
    $("#exp-leads").href = "/api/admin/export?type=leads&days=365";
    table($("#leads-table"), [
      ["الوقت", r => ago(r.ts)],
      ["الاسم", r => `<b>${esc(r.name)}</b><br><span class="mut">${esc(r.company || "")}</span>`],
      ["التواصل", r => `<a href="tel:${esc(r.phone)}" dir="ltr">${esc(r.phone)}</a>${r.email ? `<br><a href="mailto:${esc(r.email)}" dir="ltr">${esc(r.email)}</a>` : ""}
        <br><a href="https://wa.me/${esc(String(r.phone).replace(/\D/g, ""))}" target="_blank" rel="noopener">واتساب ↗</a>`],
      ["المصدر", r => `<span class="adm-pill ${r.kind === "quote" || !r.kind ? "lead" : ""}">${KIND[r.kind] || KIND.quote}</span>${r.project ? `<br><span class="mut">${esc(pname(r.project))}</span>` : ""}`],
      ["الطلب", r => `${esc(r.sector || "")}<div class="mut adm-msg">${esc(r.message || "")}${r.message ? "" : answers(r.answers)}</div>`],
      ["المكان", r => `${esc(country(r.country))}<br><span class="mut">${esc(r.city || "")}</span>`],
      ["قبل الطلب", r => `${r.visits || 0} زيارة · ${r.pages || 0} صفحة`],
      ["الحالة", r => `<select data-id="${r.id}" class="lead-st">${Object.entries(STATUS).map(([k, v]) =>
        `<option value="${k}" ${r.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>`]
    ], rows, r => r.vid && journey(r.vid));
    $$(".lead-st").forEach(s => {
      s.addEventListener("click", e => e.stopPropagation());
      s.addEventListener("change", () => api("leads", { method: "PATCH", body: JSON.stringify({ id: +s.dataset.id, status: s.value }) }).then(badges));
    });
  }

  async function loadSettings() {
    const d = await api("settings");
    ["#contact-form", "#ads-form"].forEach(s => { const f = $(s);
      Object.entries(d).forEach(([k, v]) => { if (f[k]) f[k].value = v || ""; }); });
  }
  $("#ads-form").addEventListener("submit", async e => {
    e.preventDefault();
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    const d = await r.json().catch(() => ({}));
    const ok = $("#ads-ok"); ok.hidden = false;
    ok.textContent = r.ok ? "حُفظ ✓ — يعمل في الموقع خلال دقيقة"
      : d.error === "meta_pixel" ? "معرّف فيسبوك يجب أن يكون أرقاماً فقط (10–20 رقماً)"
      : d.error === "google_tag" ? "معرّف جوجل يبدأ بـ AW- أو G- أو GT-" : "تعذّر الحفظ";
    ok.style.color = r.ok ? "" : "#B42318";
  });
  $("#contact-form").addEventListener("submit", async e => {
    e.preventDefault();
    await api("settings", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    $("#contact-ok").hidden = false; setTimeout(() => { $("#contact-ok").hidden = true; }, 4000);
  });
  $("#pw-form").addEventListener("submit", async e => {
    e.preventDefault();
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    const ok = $("#pw-ok"); ok.hidden = false;
    ok.textContent = r.ok ? "تغيّرت كلمة المرور ✓" : "الحالية غير صحيحة أو الجديدة قصيرة";
    ok.style.color = r.ok ? "" : "#B42318";
    if (r.ok) e.target.reset();
  });

  /* ─── منشئ روابط الحملات ─── */
  function utmUrl() {
    const p = new URLSearchParams();
    [["utm_source", "#u-src"], ["utm_medium", "#u-med"], ["utm_campaign", "#u-camp"]].forEach(([k, s]) => { const v = $(s).value.trim(); if (v) p.set(k, v); });
    $("#u-out").textContent = location.origin + $("#u-page").value + (p.toString() ? "?" + p : "");
  }
  ["#u-page", "#u-src", "#u-med", "#u-camp"].forEach(s => $(s).addEventListener("input", utmUrl));
  $("#u-copy").addEventListener("click", () => navigator.clipboard && navigator.clipboard.writeText($("#u-out").textContent));
  utmUrl();

  /* ─── رحلة زائر ─── */
  async function journey(vid) {
    const d = await api("journey?vid=" + encodeURIComponent(vid));
    const s0 = d.sessions[0] || {};
    const bySid = {};
    d.events.forEach(e => { (bySid[e.sid] = bySid[e.sid] || []).push(e); });
    $("#drawer-body").innerHTML = `
      <h2>رحلة الزائر</h2>
      <p>${esc(country(s0.country))} · ${esc(s0.city || "")}${s0.region ? "، " + esc(s0.region) : ""}<br>
        <span class="mut">${dev[s0.device] || ""} · ${esc(s0.os || "")} · ${esc(s0.browser || "")} · ${esc(s0.lang || "")}${s0.org ? " · شبكة: " + esc(s0.org) : ""}</span></p>
      <p class="mut">${d.sessions.length} زيارة · أول مرة ${d.sessions.length ? new Date(d.sessions[d.sessions.length - 1].started).toLocaleString("ar-LY") : ""}</p>
      ${d.leads.map(l => `<div class="adm-card adm-lead-card"><b>طلب عرض: ${esc(l.name)}</b> — <a href="tel:${esc(l.phone)}" dir="ltr">${esc(l.phone)}</a>
        <div class="mut adm-pre">${esc(l.message || "")}</div></div>`).join("")}
      ${d.sessions.map(s => `<div class="adm-sess">
        <h2>${new Date(s.started).toLocaleString("ar-LY")} <span class="mut">· ${dur(s.dur_ms)} · من ${esc(s.utm_campaign ? s.utm_source + " / " + s.utm_campaign : s.ref_host || "مباشر")}</span></h2>
        <ol class="adm-steps">${(bySid[s.sid] || []).map(e => `<li><time>${new Date(e.ts).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}</time>
          <span class="${e.type === "click" ? "c" : ""}">${e.type === "click" ? "نقر: " + esc(e.label || e.target) : "فتح: " + esc(pageName(e.path))}</span></li>`).join("")}</ol></div>`).join("")}`;
    $("#drawer").hidden = false;
  }
  $("#drawer-close").addEventListener("click", () => { $("#drawer").hidden = true; });
  $("#drawer").addEventListener("click", e => { if (e.target.id === "drawer") $("#drawer").hidden = true; });

  /* البداية: هل الجلسة قائمة؟ */
  fetch("/api/admin/me", { credentials: "same-origin" }).then(r => r.ok ? showApp() : showLogin()).catch(showLogin);
})();
