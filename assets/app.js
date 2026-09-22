/* Libya Pro Tech — سلوك الموقع. لا مكتبات خارجية. */
(() => {
  "use strict";

  /* رقم الواتساب بصيغة دولية بلا علامة زائد وبلا أصفار بادئة — يُستخدم في النموذج وفي التذييل. */
  const WHATSAPP = "353894435368";

  const SECTORS = {
    finance:"مصرفي ومالي", gov:"حكومي", erp:"منظومات المؤسسات",
    auctions:"مزادات", commerce:"تجارة", logistics:"لوجستيات",
    apps:"تطبيقات", ai:"ذكاء اصطناعي"
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  let projects = [], filter = "all";

  const yEl = $("#y"); if (yEl) yEl.textContent = new Date().getFullYear();
  $$("[data-wa]").forEach(a => { a.href = `https://wa.me/${WHATSAPP}`; });

  /* ---------- قائمة الجوال ---------- */
  const burger = $("#burger");
  if (burger) burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-links a").forEach(a => a.addEventListener("click", () => {
    document.body.classList.remove("open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }));

  /* ---------- شبكة الأعمال ---------- */
  const grid = $("#work-grid");
  const ONLY = grid ? grid.dataset.only || "" : "";   /* صفحة قطاعية: قطاع واحد فقط */
  const IDS  = grid && grid.dataset.ids ? grid.dataset.ids.split(",").map(s => s.trim()) : null;
  if (ONLY) filter = ONLY;

  if (grid) fetch(grid.dataset.src || "data/projects.json")
    .then(r => r.json())
    .then(d => { projects = d; render(); })
    .catch(() => { grid.innerHTML = '<p class="mut">تعذّر تحميل قائمة الأنظمة.</p>'; });

  function media(p) {
    {
      return `<div class="panel"><img src="${esc(p.shot)}" width="2000" height="1250" loading="lazy" decoding="async"
        alt="لقطة حقيقية من نظام ${esc(p.name)}: ${esc(p.shotAlt || p.tag)}"></div>`;
    }
  }

  function card(p) {
    const label = p.demo ? "افتح الديمو" : (p.gallery && p.gallery.length ? "شاهد النظام" : "تفاصيل العرض");
    const demoBtn = `<button class="btn ${p.demo ? "btn-gold " : ""}btn-sm" data-demo="${esc(p.id)}">${label}</button>`;
    return `<article class="work-item" data-sector="${esc(p.sector)}">
      ${media(p)}
      <div class="work-meta">
        <div class="top">
          <h3>${esc(p.name)}</h3>
          <span class="sector">${esc(SECTORS[p.sector] || "")}</span>
        </div>
        <p>${esc(p.desc)}</p>
        <div class="tech">${(p.tech || []).map(t => `<span>${esc(t)}</span>`).join("")}</div>
        <div class="work-actions">
          ${demoBtn}
          <a class="btn btn-sm" href="#contact">اطلب مثله</a>
        </div>
      </div>
    </article>`;
  }

  function row(p) {
    return `<li>
      <span class="nm">${esc(p.name)}<small>${esc(SECTORS[p.sector] || "")}</small></span>
      <span class="ds">${esc(p.tag)}</span>
      <span class="ac">
        <button class="btn btn-sm" data-demo="${esc(p.id)}">تفاصيل</button>
        <a class="btn btn-sm" href="#contact">اطلب مثله</a>
      </span>
    </li>`;
  }

  function render() {
    if (!grid) return;
    const list = IDS
      ? IDS.map(id => projects.find(p => p.id === id)).filter(Boolean)
      : projects.filter(p => filter === "all" || p.sector === filter);
    const shots = list.filter(p => p.shot);
    const rest  = list.filter(p => !p.shot);

    grid.innerHTML = shots.length
      ? shots.map(card).join("")
      : '<p class="mut">لا توجد لقطات في هذا القطاع بعد — انظر السجل أدناه.</p>';

    const idx = $("#work-index"), idxHead = $("#index-head");
    if (idx) idx.innerHTML = rest.map(row).join("");
    if (idxHead) idxHead.hidden = rest.length === 0;
    if (typeof markReveals === "function") markReveals($("#work"));
  }

  const filterBar = $("#filters");
  if (filterBar) filterBar.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    filter = b.dataset.f;
    $$("#filters button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });

  $$("[data-goto]").forEach(a => a.addEventListener("click", () => {
    const b = $(`#filters [data-f="${a.dataset.goto}"]`);
    if (b) b.click();
  }));

  /* ---------- نافذة الديمو ---------- */
  const modal = $("#modal"), frame = $("#m-frame"), body = $("#m-body"), empty = $("#m-empty");
  let lastFocus = null;

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-demo]");
    if (!b) return;
    const p = projects.find(x => x.id === b.dataset.demo);
    if (p) openDemo(p, b);
  });

  function openDemo(p, trigger) {
    if (!modal) return;
    lastFocus = trigger || null;
    $("#m-title").textContent = p.name;
    $("#m-sector").textContent = SECTORS[p.sector] || "";
    const open = $("#m-open");
    const gal = $("#m-gallery");
    const tools = $("#m-views");
    if (p.demo) {
      frame.hidden = false; empty.hidden = true; gal.hidden = true; tools.hidden = false;
      frame.src = p.demo;
      open.hidden = false; open.href = p.demo;
      body.className = "modal-body view-phone";
    } else if (p.gallery && p.gallery.length) {
      frame.hidden = true; frame.removeAttribute("src");
      empty.hidden = true; open.hidden = true; tools.hidden = true;
      gal.hidden = false;
      body.className = "modal-body view-gallery";
      const shots = [{ src: p.shot, alt: p.shotAlt || p.tag, cap: p.tag }]
        .filter(s => s.src).concat(p.gallery);
      gal.innerHTML = shots.map(s => `<figure class="gal-item">
        <div class="panel"><img src="${esc(s.src)}" loading="lazy" decoding="async"
          alt="لقطة من نظام ${esc(p.name)}: ${esc(s.alt)}"></div>
        <figcaption class="panel-cap"><span class="live">لقطة حقيقية</span><span>${esc(s.cap)}</span></figcaption>
      </figure>`).join("");
      gal.scrollTop = 0;
    } else {
      frame.hidden = true; frame.removeAttribute("src");
      empty.hidden = false; open.hidden = true; gal.hidden = true; tools.hidden = true;
      body.className = "modal-body view-phone";
    }
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    if (closeBtn) closeBtn.focus();
  }

  function closeDemo() {
    if (!modal) return;
    modal.hidden = true;
    frame.removeAttribute("src");
    const g = $("#m-gallery"); if (g) g.innerHTML = "";
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  const closeBtn = $("#m-close"), reqBtn = $("#m-request");
  if (closeBtn) closeBtn.addEventListener("click", closeDemo);
  if (reqBtn) reqBtn.addEventListener("click", closeDemo);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal && !modal.hidden) closeDemo(); });

  $$("[data-view]").forEach(b => b.addEventListener("click", () => {
    body.className = "modal-body view-" + b.dataset.view;
    $$("[data-view]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  }));

  /* ---------- النموذج ---------- */
  const quote = $("#quote");
  if (quote) quote.addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const LABEL = { sector:"القطاع", name:"الاسم", phone:"الهاتف", company:"الجهة", email:"البريد",
                    type:"نوع النظام", timeline:"الإطار الزمني", details:"الوصف" };
    const lines = [...f.entries()].filter(([, v]) => String(v).trim())
      .map(([k, v]) => `${LABEL[k] || k}: ${v}`);
    const url = `https://wa.me/${WHATSAPP}?text=` +
      encodeURIComponent("طلب مشروع جديد من الموقع\n\n" + lines.join("\n"));
    window.open(url, "_blank", "noopener");
  });

  /* ═══════════════════════════════════════════════════════
     طبقة الحركة — تُشغَّل فقط إذا لم يطلب المستخدم تقليل الحركة
     ═══════════════════════════════════════════════════════ */
  const STILL = document.documentElement.classList.contains("still");

  /* خط تقدّم القراءة */
  const line = $("#scroll-line");
  const nav  = $(".nav");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (line) line.style.transform = `scaleX(${p})`;
      if (nav) nav.classList.toggle("is-stuck", window.scrollY > 24);
      if (typeof sweep === "function") sweep();
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  /* مسحة أخيرة بعد توقّف التمرير: الحلقة المخنوقة قد تفوّت آخر إطار */
  let settle;
  addEventListener("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => { if (typeof sweep === "function") sweep(); }, 140);
  }, { passive: true });
  onScroll();

  /* كشف العناصر عند دخولها الشاشة */
  const REVEAL = ".sec-head, .list li, .work-item, .index li, .grid3 > div, .sector-card, .proof-in div, .form label, .form .full, .footer-grid > div";
  const pending = new Set();   /* عناصر تنتظر الكشف */
  let io = null;

  function show(el) {
    el.classList.add("in");
    pending.delete(el);
    if (io) io.unobserve(el);
  }

  /* شبكة أمان: أي عنصر بلغ أسفل الشاشة يُكشف، حتى لو تجاوزه تمرير سريع
     ولم يُبلِّغ عنه المراقب. بدونها يبقى محتوى مخفياً على من يمرّر بسرعة. */
  function sweep() {
    if (!pending.size) return;
    const limit = window.innerHeight * 0.98;
    pending.forEach(el => { if (el.getBoundingClientRect().top < limit) show(el); });
  }

  function markReveals(scope = document) {
    if (STILL || !("IntersectionObserver" in window)) return;
    if (!io) {
      io = new IntersectionObserver(es => {
        es.forEach(e => { if (e.isIntersecting) show(e.target); });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    $$(REVEAL, scope).forEach((el, i) => {
      if (el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      el.style.setProperty("--d", (i % 6) * 70 + "ms");
      /* ما هو ظاهر أصلاً في أول شاشة يُكشف فوراً، بلا انتظار تمرير */
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        requestAnimationFrame(() => show(el));
      } else {
        pending.add(el);
        io.observe(el);
      }
    });
  }

  /* عدّادات شريط الإثبات */
  function countUp(el) {
    const raw = el.textContent.trim();
    const m = raw.match(/^(\d+)(\D*)$/);
    if (!m) return;
    const target = +m[1], suffix = m[2];
    const dur = 1100, t0 = performance.now();
    function step(now) {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!STILL && "IntersectionObserver" in window) {
    const pio = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        $$("bdi", e.target).forEach(countUp);
        pio.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    const proof = $(".proof-in");
    if (proof) pio.observe(proof);
  }

  /* التوقيع البصري: شبكة هندسية يمسحها شعاع ذهبي بطيء */
  (function lattice() {
    const cv = $("#lattice"), hero = $("#hero");
    if (!cv || !hero) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    const GAP = 46;
    let dots = [], w = 0, h = 0, dpr = 1, raf = 0, visible = true;

    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP)
        for (let x = GAP / 2; x < w; x += GAP)
          dots.push({ x, y });
    }

    /* الشعاع يعبر الشاشة قطرياً كل 9 ثوانٍ */
    const PERIOD = 6500, BAND = 240;
    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      const span = w + h;
      const head = ((now % PERIOD) / PERIOD) * (span + BAND * 2) - BAND;
      for (const d of dots) {
        const dist = Math.abs(d.x + d.y - head);
        if (dist > BAND) {
          ctx.fillStyle = "rgba(11,11,12,.10)";
          ctx.fillRect(d.x, d.y, 1.4, 1.4);
        } else {
          const k = 1 - dist / BAND;              /* 0..1 */
          const a = 0.10 + k * 0.62;
          ctx.fillStyle = `rgba(11,11,12,${a})`;
          const s = 1.4 + k * 1.9;
          ctx.fillRect(d.x - (s - 1.4) / 2, d.y - (s - 1.4) / 2, s, s);
          if (k > 0.6) {
            ctx.strokeStyle = `rgba(11,11,12,${(k - 0.6) * 0.42})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + GAP, d.y);
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y + GAP);
            ctx.stroke();
          }
        }
      }
    }

    build();
    /* بلا حركة: تُرسم شبكة النقاط مرة واحدة ساكنة بلا موجة */
    if (STILL) {
      ctx.fillStyle = "rgba(11,11,12,.10)";
      for (const d of dots) ctx.fillRect(d.x, d.y, 1.4, 1.4);
      return;
    }
    raf = requestAnimationFrame(draw);

    /* يتوقف تماماً حين يغادر البطل الشاشة أو يُخفى التبويب */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); }, { passive: true });
  })();

  markReveals();
})();
