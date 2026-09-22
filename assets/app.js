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

  /* التوقيع البصري: شبكة عصبية — إشارات تسري بين الوصلات وتُشعل العقد وتتفرّع */
  (function neural() {
    const cv = $("#lattice"), hero = $("#hero");
    if (!cv || !hero) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    const GAP = 92;          /* المسافة بين العقد قبل الإزاحة */
    const JIT = 26;          /* إزاحة عشوائية حتى لا تبدو الشبكة مسطرة */
    const LINK = 3;          /* أقصى عدد وصلات لكل عقدة */
    const MAXD = 158;        /* أقصى طول وصلة */
    const SPEED = 0.34;      /* بكسل/مللي ثانية — سرعة الإشارة على المحور */
    const REFRACT = 260;     /* فترة كمون العقدة بعد الإطلاق (مللي) */
    const MAX_GEN = 9;       /* عمق التتابع قبل أن تخمد الموجة */
    const MAX_SIG = 170;     /* سقف الإشارات الحيّة */

    let nodes = [], edges = [], sigs = [];
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = 0, seedAt = 0;

    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = hero.clientWidth; h = hero.clientHeight;
      if (!w || !h) return;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = []; edges = []; sigs = [];
      for (let y = GAP * 0.5; y < h + GAP * 0.5; y += GAP) {
        for (let x = GAP * 0.5; x < w + GAP * 0.5; x += GAP) {
          nodes.push({
            x: x + (Math.random() * 2 - 1) * JIT,
            y: y + (Math.random() * 2 - 1) * JIT,
            e: [], glow: 0, fired: -1e9
          });
        }
      }

      /* وصلات: كل عقدة بأقرب جيرانها، بلا تكرار */
      const seen = new Set();
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i], near = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b = nodes[j], d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d < MAXD) near.push({ j, d });
        }
        near.sort((p, q) => p.d - q.d);
        for (const n of near.slice(0, LINK)) {
          const key = i < n.j ? i + ":" + n.j : n.j + ":" + i;
          if (seen.has(key)) continue;
          seen.add(key);
          const id = edges.length;
          edges.push({ a: i, b: n.j, len: n.d, hot: 0 });
          a.e.push(id); nodes[n.j].e.push(id);
        }
      }
    }

    /* إطلاق عقدة: تُرسل إشارة في وصلاتها عدا التي جاءت منها */
    function fire(ni, now, gen, fromEdge) {
      const n = nodes[ni];
      if (!n || now - n.fired < REFRACT) return;
      n.fired = now; n.glow = 1;
      if (gen > MAX_GEN) return;
      let sent = 0;
      for (const eid of n.e) {
        if (eid === fromEdge || sigs.length >= MAX_SIG) continue;
        /* كلما تعمّق التتابع قلّ احتمال المضي — فتخمد الموجة كما في الدماغ */
        if (Math.random() > 0.94 - gen * 0.075) continue;
        const e = edges[eid];
        sigs.push({ e: eid, from: ni, t: 0, gen: gen });
        if (++sent >= 3) break;
      }
    }

    function step(dt, now) {
      /* نبضة تلقائية تبدأ تتابعاً جديداً حين تهدأ الشبكة */
      if (now > seedAt && nodes.length) {
        /* تُبقي الشبكة على نشاط محسوس: كلما قلّت الإشارات زادت البذور وتقارب توقيتها */
        const want = Math.max(0, Math.round((34 - sigs.length) / 9));
        seedAt = now + (sigs.length < 26 ? 130 : 620) + Math.random() * 380;
        for (let k = 0; k < want; k++) fire((Math.random() * nodes.length) | 0, now, 0, -1);
      }
      for (let i = sigs.length - 1; i >= 0; i--) {
        const s = sigs[i], e = edges[s.e];
        s.t += (SPEED * dt) / e.len;
        e.hot = Math.min(1, e.hot + dt * 0.006);
        if (s.t >= 1) {
          sigs.splice(i, 1);
          fire(s.from === e.a ? e.b : e.a, now, s.gen + 1, s.e);
        }
      }
      for (const e of edges) e.hot *= Math.pow(0.9975, dt);
      for (const n of nodes) n.glow *= Math.pow(0.9968, dt);
    }

    function paint() {
      ctx.clearRect(0, 0, w, h);

      /* المحاور: خافتة، وتضيء قليلاً بعد مرور إشارة */
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(11,11,12,.07)";
      ctx.beginPath();
      for (const e of edges) {
        if (e.hot > 0.02) continue;
        const a = nodes[e.a], b = nodes[e.b];
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();                      /* كل المحاور الهادئة بأمر رسم واحد */
      for (const e of edges) {
        if (e.hot <= 0.02) continue;
        const a = nodes[e.a], b = nodes[e.b];
        ctx.strokeStyle = "rgba(11,11,12," + (0.07 + e.hot * 0.34).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      /* الإشارات: رأس ساطع يجرّ ذيلاً يخفت */
      for (const s of sigs) {
        const e = edges[s.e], a = nodes[s.from], b = nodes[s.from === e.a ? e.b : e.a];
        const dx = b.x - a.x, dy = b.y - a.y;
        const hx = a.x + dx * s.t, hy = a.y + dy * s.t;
        const tail = Math.min(0.42, 34 / e.len);
        for (let k = 0; k < 4; k++) {
          const t0 = Math.max(0, s.t - tail * (k + 1) / 4);
          const t1 = Math.max(0, s.t - tail * k / 4);
          if (t1 <= 0) break;
          ctx.strokeStyle = "rgba(11,11,12," + (0.62 * (1 - k / 4)).toFixed(3) + ")";
          ctx.lineWidth = 2 - k * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x + dx * t0, a.y + dy * t0);
          ctx.lineTo(a.x + dx * t1, a.y + dy * t1);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(11,11,12,.14)";
        ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "rgba(11,11,12,.86)";
        ctx.beginPath(); ctx.arc(hx, hy, 2.3, 0, 6.2832); ctx.fill();
      }

      /* العقد الهادئة: مسار واحد وتعبئة واحدة (أرخص بكثير من قوس لكل عقدة) */
      ctx.fillStyle = "rgba(11,11,12,.14)";
      ctx.beginPath();
      for (const n of nodes) {
        if (n.glow > 0.04) continue;
        ctx.moveTo(n.x + 1.5, n.y);
        ctx.arc(n.x, n.y, 1.5, 0, 6.2832);
      }
      ctx.fill();
      /* العقد المُطلِقة: هالة + نواة أوضح */
      for (const n of nodes) {
        const g = n.glow;
        if (g <= 0.04) continue;
        ctx.fillStyle = "rgba(11,11,12," + (g * 0.11).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, 4 + g * 9, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "rgba(11,11,12," + (0.14 + g * 0.64).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.5 + g * 1.7, 0, 6.2832); ctx.fill();
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min(50, now - (last || now));
      last = now;
      step(dt, now);
      paint();
    }

    build();
    if (STILL) { paint(); return; }   /* بلا حركة: شبكة ساكنة تُرسم مرة واحدة */
    raf = requestAnimationFrame(frame);

    /* تتوقف تماماً حين يغادر البطل الشاشة أو يُخفى التبويب */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

    let rt;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { build(); if (STILL) paint(); }, 200);
    }, { passive: true });
  })();

  markReveals();
})();
