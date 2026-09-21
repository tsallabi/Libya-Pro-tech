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

  $("#y").textContent = new Date().getFullYear();
  $$("[data-wa]").forEach(a => { a.href = `https://wa.me/${WHATSAPP}`; });

  /* ---------- قائمة الجوال ---------- */
  const burger = $("#burger");
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-links a").forEach(a => a.addEventListener("click", () => {
    document.body.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }));

  /* ---------- شبكة الأعمال ---------- */
  fetch("data/projects.json")
    .then(r => r.json())
    .then(d => { projects = d; render(); })
    .catch(() => { $("#work-grid").innerHTML = '<p class="mut">تعذّر تحميل قائمة الأنظمة.</p>'; });

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
    const list  = projects.filter(p => filter === "all" || p.sector === filter);
    const shots = list.filter(p => p.shot);
    const rest  = list.filter(p => !p.shot);

    $("#work-grid").innerHTML = shots.length
      ? shots.map(card).join("")
      : '<p class="mut">لا توجد لقطات في هذا القطاع بعد — انظر السجل أدناه.</p>';

    $("#work-index").innerHTML = rest.map(row).join("");
    $("#index-head").hidden = rest.length === 0;
  }

  $("#filters").addEventListener("click", e => {
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
    $("#m-close").focus();
  }

  function closeDemo() {
    modal.hidden = true;
    frame.removeAttribute("src");
    $("#m-gallery").innerHTML = "";
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  $("#m-close").addEventListener("click", closeDemo);
  $("#m-request").addEventListener("click", closeDemo);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeDemo(); });

  $$("[data-view]").forEach(b => b.addEventListener("click", () => {
    body.className = "modal-body view-" + b.dataset.view;
    $$("[data-view]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  }));

  /* ---------- النموذج ---------- */
  $("#quote").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const LABEL = { name:"الاسم", phone:"الهاتف", company:"الجهة", email:"البريد",
                    type:"نوع النظام", timeline:"الإطار الزمني", details:"الوصف" };
    const lines = [...f.entries()].filter(([, v]) => String(v).trim())
      .map(([k, v]) => `${LABEL[k] || k}: ${v}`);
    const url = `https://wa.me/${WHATSAPP}?text=` +
      encodeURIComponent("طلب مشروع جديد من الموقع\n\n" + lines.join("\n"));
    window.open(url, "_blank", "noopener");
  });
})();
