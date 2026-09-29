/* التفاعل: تقليب لقطات المنظومات · تسجيل خفيف لفتح الأنظمة · حاسبة المشروع · زر واتساب عائم
   كل طلب يُحفظ في لوحة التحكم (/api/lead) مربوطاً بزيارة صاحبه. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const LS = window.localStorage;
  const get = k => { try { return LS.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { LS.setItem(k, v); } catch (e) {} };
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let WA = "353894435368";
  fetch("/api/settings").then(r => r.ok ? r.json() : null).then(c => { if (c && c.whatsapp) WA = String(c.whatsapp).replace(/\D/g, ""); }).catch(() => {});

  function member() { try { return JSON.parse(get("lp_member") || "null"); } catch (e) { return null; } }
  function saveLead(body) {
    const t = window.LP_TRACK || {};
    return fetch("/api/lead", { method: "POST", keepalive: true, headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ vid: t.vid, sid: t.sid, page: location.pathname }, body)) }).catch(() => {});
  }
  function track(target, label) {
    /* يمرّ عبر track.js إن وُجد: نقرة مسمّاة تظهر في «أين ذهبوا» */
    const t = window.LP_TRACK; if (!t) return;
    const body = JSON.stringify({ type: "click", vid: t.vid, sid: t.sid, path: location.pathname, target, label, dur: 0 });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([body], { type: "text/plain" }));
  }

  /* ═══ ١) تقليب لقطات المنظومة عند المرور على بطاقتها ═══ */
  function bindShots(root) {
    $$(".work-item .panel[data-shots]", root).forEach(panel => {
      if (panel.dataset.bound) return; panel.dataset.bound = "1";
      const shots = panel.dataset.shots.split("|").filter(Boolean);
      if (shots.length < 2) return;
      const img = $("img", panel), num = $(".shot-count b", panel);
      let i = 0, timer = 0;
      shots.slice(1).forEach(s => { const pre = new Image(); pre.decoding = "async"; pre.dataset.src = s; panel._pre = (panel._pre || []).concat(pre); });
      const show = n => { i = (n + shots.length) % shots.length; img.src = shots[i]; if (num) num.textContent = String(i + 1); };
      const start = () => {
        if (REDUCED || timer) return;
        (panel._pre || []).forEach(p => { if (!p.src) p.src = p.dataset.src; });   /* تحميل مسبق عند أول مرور فقط */
        timer = setInterval(() => show(i + 1), 1400); show(i + 1);
      };
      const stop = () => { clearInterval(timer); timer = 0; show(0); };
      panel.addEventListener("mouseenter", start);
      panel.addEventListener("mouseleave", stop);
      panel.addEventListener("focusin", start);
      panel.addEventListener("focusout", stop);
    });
  }
  const grid = $("#work-grid");
  if (grid) {
    new MutationObserver(() => bindShots(grid)).observe(grid, { childList: true });
    bindShots(grid);
  }

  /* ═══ ٢) تسجيل خفيف: أول نظامين مفتوحان، ثم نطلب الاسم والواتساب مرة واحدة ═══ */
  const FREE_VIEWS = 2;
  const dlg = document.createElement("div");
  dlg.className = "reg"; dlg.hidden = true;
  dlg.innerHTML = `<form class="reg-card" role="dialog" aria-modal="true" aria-labelledby="reg-t">
      <button type="button" class="reg-x" data-skip aria-label="إغلاق">×</button>
      <div class="eyebrow"><span>تذكرة العرض</span></div>
      <h3 id="reg-t">سجّل مرة واحدة وافتح كل الأنظمة</h3>
      <p class="mut">نرسل لك على واتساب رابط عرض حي مع مهندس، ونخبرك حين نضيف نظاماً جديداً في قطاعك.</p>
      <label>الاسم<input name="name" required autocomplete="name" placeholder="الاسم الثلاثي"></label>
      <label>رقم الواتساب<input name="phone" required inputmode="tel" autocomplete="tel" dir="ltr" placeholder="+218 9x xxx xxxx"></label>
      <label>الجهة أو الشركة <small>(اختياري)</small><input name="company" autocomplete="organization"></label>
      <button class="btn btn-gold" type="submit">افتح الأنظمة</button>
      <button type="button" class="reg-later" data-skip>لاحقاً</button>
    </form>`;
  document.body.appendChild(dlg);
  let pending = null;
  function openReg(btn) {
    pending = btn; dlg.hidden = false; document.documentElement.classList.add("reg-open");
    setTimeout(() => $("input[name=name]", dlg).focus(), 30);
    track("gate:shown", "نافذة التسجيل");
  }
  function closeReg(proceed) {
    dlg.hidden = true; document.documentElement.classList.remove("reg-open");
    const b = pending; pending = null;
    if (proceed && b) { b.dataset.pass = "1"; b.click(); delete b.dataset.pass; }
  }
  dlg.addEventListener("click", e => {
    if (e.target.hasAttribute("data-skip")) {
      try { sessionStorage.setItem("lp_skip", "1"); } catch (_) {}
      track("gate:skip", "تخطّى التسجيل"); closeReg(true);
    } else if (e.target === dlg) closeReg(false);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !dlg.hidden) closeReg(false); });
  $("form", dlg).addEventListener("submit", e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const pid = pending && pending.dataset.demo;
    saveLead({ kind: "demo", name: f.name, phone: f.phone, company: f.company, project: pid,
               details: "سجّل لفتح الأنظمة" + (pid ? ` (كان يشاهد: ${pid})` : "") });
    set("lp_member", JSON.stringify({ name: f.name, phone: f.phone, company: f.company || "" }));
    if (window.LP_ADS) window.LP_ADS.lead();
    prefill(); greet(); closeReg(true);
  });
  /* يسبق معالج app.js (مرحلة الالتقاط) فيقرّر: افتح مباشرة أم اطلب التسجيل */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-demo]");
    if (!b || b.dataset.pass) return;
    const views = (+get("lp_views") || 0) + 1;
    let skipped = false; try { skipped = sessionStorage.getItem("lp_skip") === "1"; } catch (_) {}
    if (!member() && !skipped && views > FREE_VIEWS) { e.preventDefault(); e.stopImmediatePropagation(); openReg(b); return; }
    set("lp_views", String(views));
    track("demo:" + b.dataset.demo, "فتح نظام: " + b.dataset.demo);
  }, true);

  /* الزائر المسجَّل: نملأ نموذج الطلب باسمه ورقمه ونرحّب به */
  function prefill() {
    const m = member(), q = $("#quote"); if (!m || !q) return;
    if (q.name && !q.name.value) q.name.value = m.name || "";
    if (q.phone && !q.phone.value) q.phone.value = m.phone || "";
    if (q.company && !q.company.value) q.company.value = m.company || "";
  }
  function greet() {
    const m = member(), head = $("#work .sec-head"); if (!m || !head || $(".greet", head)) return;
    const p = document.createElement("p"); p.className = "greet";
    p.textContent = `أهلاً ${String(m.name).split(" ")[0]} — كل الأنظمة مفتوحة لك.`;
    head.appendChild(p);
  }
  prefill(); greet();
  $$("[data-want]").forEach(a => a.addEventListener("click", () => {
    const q = $("#quote"); if (q && q.details && !q.details.value) q.details.value = "أريد نظاماً مثل: " + a.dataset.want + "\n";
  }));
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("[data-want]"); if (!a) return;
    const q = $("#quote"), p = (window.LP_PROJECTS || []).find(x => x.id === a.dataset.want);
    if (q && q.details && !q.details.value && p) q.details.value = `أريد نظاماً مثل «${p.name}»: `;
  });

  /* ═══ ٣) حاسبة المشروع ═══ */
  const est = $("#est");
  if (est) {
    /* أوزان التقدير — عدّلها لتطابق خبرتك الفعلية (أسابيع لكل مكوّن) */
    const WEEKS = { dashboard: 3, portal: 3, mobile: 5, payments: 3, accounting: 4, inventory: 3, tracking: 3, ai: 3 };
    const NAMES = { dashboard: "لوحة إدارة وتقارير", portal: "بوابة للعملاء", mobile: "تطبيق جوال (أندرويد وآيفون)",
      payments: "مدفوعات إلكترونية", accounting: "محاسبة ومالية", inventory: "مخزون ومبيعات", tracking: "تتبّع وشحن", ai: "ذكاء اصطناعي" };
    const USERS = { s: 1, m: 1.1, l: 1.25, xl: 1.45 };
    const INTEG = { 0: 0, 1: 2, 2: 5 };
    const SECTOR_MAP = { finance: ["finance"], gov: ["logistics", "auctions", "erp"], company: ["erp", "finance", "logistics"],
      commerce: ["commerce", "apps"], other: ["apps", "ai", "commerce"] };
    const MOD_MAP = { accounting: ["amanpro", "accounting", "amanpro-full"], payments: ["amanpro-full", "talin"], inventory: ["talin", "ajrly"],
      tracking: ["mazadna"], mobile: ["mushaf", "usta"], ai: ["libyapro-ai", "vidio", "usta"], portal: ["fairfix", "carrie", "macchinaa"], dashboard: ["ajrly", "amanpro"] };
    const ans = { modules: [] };
    const qs = $$(".est-q", est), dots = $$(".est-steps li", est);
    let step = 0;
    const go = n => {
      step = n; qs.forEach((q, i) => q.classList.toggle("on", i === n));
      dots.forEach((d, i) => d.classList.toggle("on", i <= n));
      $("#est-result").hidden = n < qs.length; $("#est-back").hidden = n === 0;
      if (n >= qs.length) result();
    };
    qs.forEach((q, i) => {
      const key = q.dataset.q, multi = q.hasAttribute("data-multi"), next = $(".est-next", q);
      q.addEventListener("click", e => {
        const b = e.target.closest(".chips button"); if (!b) return;
        if (multi) {
          b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on"));
          ans.modules = $$(".chips button.on", q).map(x => x.dataset.v);
          if (next) next.disabled = ans.modules.length === 0;
        } else {
          $$(".chips button", q).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
          ans[key] = b.dataset.v; setTimeout(() => go(i + 1), 160);
        }
      });
      if (next) next.addEventListener("click", () => go(i + 1));
    });
    $("#est-back").addEventListener("click", () => go(Math.max(0, step - 1)));

    function result() {
      const base = ans.modules.reduce((t, m) => t + (WEEKS[m] || 3), 2);          /* + أسبوعان للتحليل والتسليم */
      const w = (base + INTEG[ans.integrations || 0]) * USERS[ans.users || "m"];
      const lo = Math.max(4, Math.round(w * 0.85)), hi = Math.round(w * 1.25);
      const team = ans.modules.length + (ans.integrations === "2" ? 1 : 0) <= 2 ? "2–3" : ans.modules.length <= 4 ? "3–4" : "4–6";
      const rush = ans.timeline === "asap" && lo > 5;
      const projects = window.LP_PROJECTS || [];
      const ids = new Set();
      ans.modules.forEach(m => (MOD_MAP[m] || []).forEach(id => ids.add(id)));
      const bySector = projects.filter(p => (SECTOR_MAP[ans.sector] || []).includes(p.sector)).map(p => p.id);
      const pick = bySector.concat([...ids]).filter((v, i, a) => a.indexOf(v) === i)
        .map(id => projects.find(p => p.id === id)).filter(p => p && p.shot).slice(0, 3);
      const r = $("#est-result");
      r.innerHTML = `
        <div class="est-grid">
          <div class="est-box"><span>المدة التقديرية</span><b>${lo} – ${hi} <small>أسبوعاً</small></b></div>
          <div class="est-box"><span>الفريق</span><b>${team} <small>مهندسين</small></b></div>
          <div class="est-box"><span>المكوّنات</span><b>${ans.modules.length}</b></div>
        </div>
        ${rush ? `<p class="est-warn">طلبت التسليم خلال شهر: ممكن بإطلاق نسخة أولى بالمكوّنات الأهم ثم استكمال الباقي على مراحل.</p>` : ""}
        <h3>ما سنبنيه</h3>
        <ul class="est-list">${ans.modules.map(m => `<li>${esc(NAMES[m])}</li>`).join("")}
          ${ans.integrations !== "0" ? `<li>ربط مع ${ans.integrations === "1" ? "نظامك القائم" : "أنظمتك القائمة"}</li>` : ""}
          <li>صلاحيات بالأدوار وسجل تدقيق</li><li>تدريب فريقك ودعم بعد الإطلاق</li></ul>
        ${pick.length ? `<h3>أنظمة بنيناها تشبه طلبك</h3><div class="est-sim">${pick.map(p => `
          <button type="button" class="est-p" data-demo="${esc(p.id)}"><img src="${esc(p.shot)}" alt="" loading="lazy"><span>${esc(p.name)}</span></button>`).join("")}</div>` : ""}
        <form class="est-form" id="est-form">
          <p><b>السعر التفصيلي وخطة المراحل تصلك على واتساب خلال 24 ساعة.</b></p>
          <div class="est-fields">
            <input name="name" required autocomplete="name" placeholder="الاسم">
            <input name="phone" required inputmode="tel" autocomplete="tel" dir="ltr" placeholder="رقم الواتساب">
            <button class="btn btn-gold" type="submit">أرسل لي التقدير</button>
          </div>
          <p class="mut est-note">تقدير أولي مبني على إجاباتك؛ الرقم النهائي بعد جلسة تحليل مجانية.</p>
        </form>`;
      const m = member(), f = $("#est-form", r);
      if (m) { f.name.value = m.name || ""; f.phone.value = m.phone || ""; }
      track("estimate:done", `حاسبة: ${ans.modules.length} مكوّنات، ${lo}-${hi} أسبوعاً`);
      f.addEventListener("submit", e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(f));
        const summary = `تقدير من حاسبة الموقع\nالجهة: ${$(`[data-q=sector] button.on`, est)?.textContent || ""}\n` +
          `المكوّنات: ${ans.modules.map(x => NAMES[x]).join("، ")}\nالمستخدمون: ${$(`[data-q=users] button.on`, est)?.textContent || ""}\n` +
          `الربط: ${$(`[data-q=integrations] button.on`, est)?.textContent || ""}\nالموعد: ${$(`[data-q=timeline] button.on`, est)?.textContent || ""}\n` +
          `التقدير: ${lo}–${hi} أسبوعاً، فريق ${team}`;
        window.open(`https://wa.me/${WA}?text=` + encodeURIComponent(`مرحباً، أنا ${d.name}.\n\n${summary}`), "_blank", "noopener");
        saveLead({ kind: "estimate", name: d.name, phone: d.phone, details: summary, answers: Object.assign({ weeks: [lo, hi], team }, ans) });
        if (!member()) set("lp_member", JSON.stringify({ name: d.name, phone: d.phone, company: "" }));
        if (window.LP_ADS) window.LP_ADS.lead();
        f.innerHTML = `<p class="est-done">وصلنا طلبك يا ${esc(String(d.name).split(" ")[0])} ✓ — أكمل المحادثة في واتساب، وسنرد خلال 24 ساعة.</p>`;
      });
    }
  }

  /* ═══ ٥) صفحات دراسات الحالة: نموذج «أريد مثله» وفلتر القطاعات ═══ */
  const cf = $("#case-form");
  if (cf) {
    const m0 = member();
    if (m0) { cf.name.value = m0.name || ""; cf.phone.value = m0.phone || ""; cf.company.value = m0.company || ""; }
    cf.addEventListener("submit", e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(cf));
      const sys = cf.dataset.name;
      const text = `مرحباً ليبيا برو، أنا ${d.name}${d.company ? " من " + d.company : ""}.\nقرأت دراسة حالة «${sys}» وأريد نظاماً مثله لجهتنا.` +
        (d.details ? `\nما نريد تغييره: ${d.details}` : "");
      window.open(`https://wa.me/${WA}?text=` + encodeURIComponent(text), "_blank", "noopener");
      saveLead({ kind: "case", name: d.name, phone: d.phone, company: d.company, project: cf.dataset.project,
                 details: `من صفحة دراسة الحالة: ${sys}` + (d.details ? `\n${d.details}` : "") });
      set("lp_member", JSON.stringify({ name: d.name, phone: d.phone, company: d.company || "" }));
      if (window.LP_ADS) window.LP_ADS.lead();
      track("case:lead", "طلب من دراسة حالة: " + sys);
      cf.innerHTML = `<p class="est-done">وصلنا طلبك يا ${esc(String(d.name).split(" ")[0])} ✓ — أكمل المحادثة في واتساب، وسنرد خلال 24 ساعة.</p>`;
    });
  }
  const cfl = $(".case-filter");
  if (cfl) cfl.addEventListener("click", e => {
    const b = e.target.closest("button[data-f]"); if (!b) return;
    $$("button", cfl).forEach(x => x.classList.toggle("on", x === b));
    $$("#case-cards .case-card").forEach(c => { c.hidden = !!b.dataset.f && c.dataset.sector !== b.dataset.f; });
  });

  /* زائر جاء من إعلان برمز (utm_campaign=BNK-A): نحفظ الرمز ونضيفه لرسالة واتساب فتُنسب المحادثة للإعلان */
  try { const c = new URLSearchParams(location.search).get("utm_campaign");
    if (c && /^(BNK|GOV|BIZ|CAR)-[A-Z0-9]{1,3}$/i.test(c)) sessionStorage.setItem("lp_ref", c.toUpperCase()); } catch (_) {}

  /* ═══ ٤) زر واتساب عائم برسالة تناسب الصفحة ═══ */
  if (location.pathname.indexOf("/admin") !== 0) {
    const TOPIC = { banks: "أنظمة المصارف", government: "منظومات الجهات الحكومية", business: "أنظمة الشركات والمتاجر" };
    const k = (location.pathname.match(/(banks|government|business)/) || [])[1];
    const wa = document.createElement("a");
    wa.className = "wa-float"; wa.target = "_blank"; wa.rel = "noopener";
    wa.setAttribute("aria-label", "تحدّث معنا على واتساب"); wa.setAttribute("data-track", "واتساب العائم");
    wa.innerHTML = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.3c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8.9 3.8.8a3.3 3.3 0 0 0 2.2-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.2-.3-.3-.6-.4Z"/></svg><span>تحدّث معنا</span>`;
    const refresh = () => {
      const m = member();
      const cs = document.body.dataset.caseName;
      let ref = ""; try { ref = sessionStorage.getItem("lp_ref") || ""; } catch (_) {}
      const msg = `مرحباً ليبيا برو${m ? "، أنا " + m.name : ""}.\n` + (cs ? `قرأت دراسة حالة «${cs}» وأريد نظاماً مثله لجهتنا.` :
        `أتصفح موقعكم${k ? " — صفحة " + TOPIC[k] : ""} وأريد الاستفسار عن نظام لجهتنا.`) + (ref ? ` (رمز: ${ref})` : "");
      wa.href = `https://wa.me/${WA}?text=` + encodeURIComponent(msg);
    };
    wa.addEventListener("pointerenter", refresh); wa.addEventListener("focus", refresh); wa.addEventListener("click", refresh, true);
    refresh(); document.body.appendChild(wa);
  }
})();
