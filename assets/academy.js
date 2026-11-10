/* الأكاديمية: عرض الدورات من /api/academy/courses، التسجيل والدفع عبر ماي باي، ومنطقة الطالب برمز الدخول */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EN = document.documentElement.lang === "en";
  const T = EN ? {
    tracks: { content: "Content Creation", marketing: "Digital Marketing", code: "AI Programming", english: "English" },
    live: "Live online", recorded: "Recorded", soon: "Price coming soon", lyd: "LYD", seats: n => `${n} seats left`, full: "Full",
    lessons: n => `${n} video lessons`, starts: "Starts", enroll: "Enroll", interest: "Notify me", none: "Courses will be announced soon.",
    choose: "Choose a course", pay: p => `Pay ${p} LYD via MyPay`, reg: "Register interest", sending: "Please wait…",
    toPay: "Taking you to the MyPay payment page…", payLink: "Open the payment page",
    interestOk: "Registered. We will contact you on WhatsApp when the course opens.",
    manual: "Your registration is saved. Online payment is not active yet — tap below to complete payment with us on WhatsApp.",
    waBtn: "Complete on WhatsApp", phone: "Enter a Libyan mobile number like 091 234 5678 for MyPay.", err: "Something went wrong. Try again or contact us on WhatsApp.",
    fullErr: "This course is full.", waiting: "Waiting for MyPay to confirm your payment…", cancel: "Payment was cancelled. You can try again.",
    unconfirmed: "We have not received the payment confirmation yet. If you paid, contact us on WhatsApp with your name.",
    paid: "Payment confirmed. Your access code:", copy: "Save this code — you will use it to enter your course.", enter: "Enter my course",
    hello: n => `Welcome, ${n}`, join: "Join the live session", joinSoon: "The live session link will appear here before the first session.",
    rec: "Recorded lessons", noRec: "No recorded lessons yet.", details: "Course details", dur: "Duration", aud: "Who is it for?", cur: "What you will learn", out: "What you will walk away with", close: "Close", sched: "Schedule", lvl: "Level", platform: { zoom: "Zoom", meet: "Google Meet" }
  } : {
    tracks: { content: "صناعة المحتوى", marketing: "التسويق الرقمي", code: "البرمجة بالذكاء الاصطناعي", english: "الإنجليزية" },
    live: "مباشرة أونلاين", recorded: "مسجّلة", soon: "السعر يُعلن قريباً", lyd: "د.ل", seats: n => `بقي ${n} مقعداً`, full: "اكتمل العدد",
    lessons: n => `${n} درساً مسجّلاً`, starts: "تبدأ", enroll: "سجّل الآن", interest: "أبلغني عند الافتتاح", none: "تُعلن الدورات قريباً.",
    choose: "اختر الدورة", pay: p => `ادفع ${p} د.ل عبر ماي باي`, reg: "سجّل اهتمامك", sending: "لحظة…",
    toPay: "ننقلك إلى صفحة الدفع في ماي باي…", payLink: "افتح صفحة الدفع",
    interestOk: "تم تسجيلك. سنتواصل معك على واتساب عند افتتاح الدورة.",
    manual: "حُفظ تسجيلك. الدفع الإلكتروني غير مفعّل حالياً — اضغط بالأسفل لإتمام الدفع معنا على واتساب.",
    waBtn: "أكمل على واتساب", phone: "اكتب رقم جوال ليبي مثل 091 234 5678 — تطلبه بوابة ماي باي.", err: "تعذّر الإرسال. حاول مجدداً أو راسلنا على واتساب.",
    fullErr: "اكتمل العدد في هذه الدورة.", waiting: "ننتظر تأكيد ماي باي لدفعتك…", cancel: "أُلغي الدفع. يمكنك المحاولة مجدداً.",
    unconfirmed: "لم يصلنا تأكيد الدفع بعد. إن كنت دفعت فراسلنا على واتساب باسمك.",
    paid: "تم تأكيد الدفع. رمز دخولك:", copy: "احتفظ بهذا الرمز — تدخل به إلى دورتك.", enter: "ادخل إلى دورتي",
    hello: n => `أهلاً ${n}`, join: "انضم إلى الجلسة المباشرة", joinSoon: "يظهر رابط الجلسة المباشرة هنا قبل الجلسة الأولى.",
    rec: "الدروس المسجّلة", noRec: "لا توجد دروس مسجّلة بعد.", details: "التفاصيل", dur: "المدة", aud: "لمن هذه الدورة؟", cur: "ماذا ستتعلم", out: "ماذا ستخرج به", close: "إغلاق", sched: "المواعيد", lvl: "المستوى", platform: { zoom: "Zoom", meet: "Google Meet" }
  };
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = (c, k) => (EN && c[k + "_en"]) || c[k] || "";
  let WA = "353870511344";
  fetch("/api/settings").then(r => r.json()).then(s => { if (s.whatsapp_academy) WA = String(s.whatsapp_academy).replace(/\D/g, ""); $$("[data-wa-academy]").forEach(a => a.href = `https://wa.me/${WA}`); }).catch(() => {});
  const wa = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;

  /* ─── الدورات ─── */
  let courses = [], fTrack = "", fMode = "";
  const grid = $("#ac-grid"), sel = $("#ac-course");
  function card(c) {
    const price = c.price > 0 ? `<span class="pr">${c.price} <small>${T.lyd}</small></span>` : `<span class="pr soon">${T.soon}</span>`;
    const left = c.left == null ? "" : c.left === 0 ? `<span class="seats">${T.full}</span>` : `<span class="seats">${T.seats(c.left)}</span>`;
    const badge = c.mode === "live" ? `<span class="badge live">● ${T.live}${c.platform ? " · " + (T.platform[c.platform] || c.platform) : ""}</span>` : `<span class="badge">${T.recorded}</span>`;
    const meta = [c.starts_at && `${T.starts} ${esc(c.starts_at)}`, L(c, "duration") ? "⏱ " + esc(L(c, "duration")) : L(c, "schedule") && esc(L(c, "schedule")), c.lessons && T.lessons(c.lessons), L(c, "level") && esc(L(c, "level"))].filter(Boolean);
    const cover = c.cover ? ` style="background-image:linear-gradient(180deg,rgba(11,11,12,.05),rgba(11,11,12,.75)),url('${esc(c.cover)}')"` : "";
    return `<article class="ac-card" data-track="${esc(c.track)}" data-mode="${esc(c.mode)}">
      <div class="cv t-${esc(c.track)}"${cover}>${badge}<span class="trk">${esc(T.tracks[c.track] || "")}</span><strong>${esc(L(c, "title"))}</strong></div>
      <div class="bd"><div class="meta">${meta.map(m => `<span>${m}</span>`).join("")}</div>
        <p>${esc(L(c, "summary"))}</p>${left}
        <button type="button" class="ac-more" data-details="${c.id}">${T.details} ←</button>
        <div class="row">${price}<button type="button" class="btn btn-sm btn-gold" data-enroll="${c.id}" ${c.left === 0 ? "disabled" : ""}>${c.price > 0 ? T.enroll : T.interest}</button></div></div></article>`;
  }
  function render() {
    const list = courses.filter(c => (!fTrack || c.track === fTrack) && (!fMode || c.mode === fMode));
    grid.innerHTML = list.length ? list.map(card).join("") : `<p class="mut">${T.none}</p>`;
  }
  if (grid) fetch("/api/academy/courses").then(r => r.json()).then(d => {
    courses = d.courses || []; render();
    sel.innerHTML = `<option value="">${T.choose}</option>` + courses.filter(c => c.left !== 0).map(c => `<option value="${c.id}">${esc(L(c, "title"))}</option>`).join("");
    const q = new URLSearchParams(location.search).get("course"); if (q) { sel.value = q; priceLine(); }
  }).catch(() => { grid.innerHTML = `<p class="mut">${T.err}</p>`; });

  $$(".ac-filters button").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.f != null) { fTrack = b.dataset.f; $$(".ac-filters [data-f]").forEach(x => x.classList.toggle("on", x === b)); }
    if (b.dataset.m != null) { fMode = fMode === b.dataset.m ? "" : b.dataset.m; $$(".ac-filters [data-m]").forEach(x => x.classList.toggle("on", x.dataset.m === fMode)); }
    render();
  }));
  /* نافذة تفاصيل الدورة */
  const lines = v => String(v || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  const dlg = document.createElement("dialog"); dlg.className = "ac-dlg"; document.body.appendChild(dlg);
  function details(c) {
    const price = c.price > 0 ? `${c.price} ${T.lyd}` : T.soon;
    const facts = [[T.dur, L(c, "duration")], [T.sched, L(c, "schedule")], [T.starts, c.starts_at], [T.lvl, L(c, "level")]].filter(x => x[1]);
    const list = (h, arr, cls) => arr.length ? `<h4>${h}</h4><ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    dlg.innerHTML = `<div class="ac-dlg-in"><button type="button" class="ac-x" data-close aria-label="${T.close}">×</button>
      <span class="trk">${esc(T.tracks[c.track] || "")} · ${c.mode === "live" ? T.live + (c.platform ? " · " + (T.platform[c.platform] || "") : "") : T.recorded}</span>
      <h3>${esc(L(c, "title"))}</h3><p>${esc(L(c, "summary"))}</p>
      ${facts.length ? `<dl class="ac-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
      ${L(c, "audience") ? `<h4>${T.aud}</h4><p>${esc(L(c, "audience"))}</p>` : ""}
      ${list(T.cur, lines(L(c, "curriculum")), "ac-cur")}${list(T.out, lines(L(c, "outcomes")), "ac-out")}
      <div class="ac-dlg-foot"><b>${price}</b><button type="button" class="btn btn-gold" data-enroll="${c.id}" ${c.left === 0 ? "disabled" : ""}>${c.price > 0 ? T.enroll : T.interest}</button></div></div>`;
    dlg.showModal();
  }
  dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  document.addEventListener("click", e => {
    const d = e.target.closest("[data-details]"); if (d) { const c = courses.find(x => String(x.id) === d.dataset.details); if (c) details(c); return; }
    const b = e.target.closest("[data-enroll]"); if (!b) return;
    if (dlg.open) dlg.close();
    sel.value = b.dataset.enroll; priceLine();
    $("#enroll").scrollIntoView({ behavior: "smooth" }); setTimeout(() => $("#ac-form [name=name]").focus(), 500);
  });

  /* ─── التسجيل ─── */
  const form = $("#ac-form"), out = $("#ac-result"), btn = $("#ac-submit");
  function priceLine() {
    const c = courses.find(x => String(x.id) === sel.value);
    btn.textContent = c ? (c.price > 0 ? T.pay(c.price) : T.reg) : (EN ? "Register" : "تسجيل");
  }
  if (sel) sel.addEventListener("change", priceLine);
  const show = (html, kind = "") => { out.hidden = false; out.className = "ac-result " + kind; out.innerHTML = html; out.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  if (form) form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    if (!f.course_id || !f.name.trim() || !f.phone.trim()) { form.reportValidity?.(); $$("[required]", form).find(x => !x.value.trim())?.focus(); return; }
    const c = courses.find(x => String(x.id) === f.course_id);
    btn.disabled = true; btn.textContent = T.sending;
    let vid = ""; try { vid = localStorage.getItem("lp_vid") || ""; } catch {}
    try {
      const r = await fetch("/api/academy/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, vid }) });
      const d = await r.json();
      if (d.error === "phone") { show(T.phone, "warn"); form.phone.focus(); return; }
      if (d.error === "full") { show(T.fullErr, "warn"); return; }
      if (!r.ok) throw new Error(d.error);
      try { localStorage.setItem("lp_ac_ref", d.ref); } catch {}
      if (d.pay_url) { show(`${T.toPay}<br><a class="btn btn-gold" href="${esc(d.pay_url)}">${T.payLink}</a>`); location.href = d.pay_url; return; }
      if (d.method === "interest") { show(T.interestOk, "ok"); form.reset(); return; }
      const msg = (EN ? "Hello, I registered for the course: " : "مرحباً، سجّلت في دورة: ") + L(c || {}, "title") + "\n" + (EN ? "Name: " : "الاسم: ") + f.name + "\n" + (EN ? "Ref: " : "المرجع: ") + d.ref.slice(0, 8);
      show(`${T.manual}<br><a class="btn btn-gold" href="${wa(msg)}" target="_blank" rel="noopener">${T.waBtn}</a>`);
    } catch { show(T.err, "warn"); }
    finally { btn.disabled = false; priceLine(); }
  });

  /* بعد العودة من ماي باي: نسأل سجلّنا نحن دقيقة كاملة ولا نصدّق رابط العودة */
  const qp = new URLSearchParams(location.search);
  if (qp.get("pay") && /^[a-f0-9]{24}$/.test(qp.get("ref") || "")) {
    const ref = qp.get("ref");
    if (qp.get("pay") === "cancel") show(T.cancel, "warn");
    else {
      show(T.waiting); let n = 0;
      const poll = async () => {
        const d = await fetch(`/api/academy/status?ref=${ref}`).then(r => r.json()).catch(() => ({}));
        if (d.status === "paid" && d.code) {
          try { localStorage.setItem("lp_ac_code", d.code); } catch {}
          show(`${T.paid}<div class="ac-codebig" dir="ltr">${esc(d.code)}</div><small>${T.copy}</small><br><a class="btn btn-gold" href="#learn" data-go-learn>${T.enter}</a>`, "ok");
          return;
        }
        if (d.status === "failed" || d.status === "cancelled") return show(T.cancel, "warn");
        if (++n < 20) setTimeout(poll, 3000); else show(T.unconfirmed, "warn");
      };
      poll();
    }
  }

  /* ─── منطقة الطالب ─── */
  const codeForm = $("#ac-code"), room = $("#ac-room");
  async function enter(code) {
    const r = await fetch("/api/academy/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    if (!r.ok) { $("#ac-code-err").hidden = false; room.hidden = true; return false; }
    const d = await r.json(); $("#ac-code-err").hidden = true;
    try { localStorage.setItem("lp_ac_code", code); } catch {}
    const c = d.course || {};
    const live = c.mode === "live" ? (c.join_url
      ? `<a class="btn btn-gold" href="${esc(c.join_url)}" target="_blank" rel="noopener">${T.join}${c.platform ? " · " + (T.platform[c.platform] || "") : ""}</a>`
      : `<p class="mut">${T.joinSoon}</p>`) : "";
    const les = d.lessons.length ? d.lessons.map((l, i) => `<li><button type="button" data-lesson="${l.id}"><b>${i + 1}</b> ${esc(l.title)}</button></li>`).join("") : `<li class="mut">${T.noRec}</li>`;
    room.innerHTML = `<div class="ac-room"><div class="ac-room-head"><span class="mut">${esc(T.hello(d.name))}</span><h3>${esc(L(c, "title"))}</h3>
      ${[c.starts_at && `${T.starts} ${esc(c.starts_at)}`, L(c, "schedule") && esc(L(c, "schedule"))].filter(Boolean).join(" · ")}</div>${live}
      <div class="ac-player"><video id="ac-video" controls playsinline controlslist="nodownload" hidden></video><ol class="ac-lessons"><li class="h">${T.rec}</li>${les}</ol></div></div>`;
    room.hidden = false;
    $$("[data-lesson]", room).forEach(b => b.addEventListener("click", () => {
      const v = $("#ac-video"); v.hidden = false; v.src = `/api/academy/video/${b.dataset.lesson}?code=${encodeURIComponent(code)}`; v.play().catch(() => {});
      $$("[data-lesson]", room).forEach(x => x.classList.toggle("on", x === b));
    }));
    return true;
  }
  if (codeForm) {
    codeForm.addEventListener("submit", e => { e.preventDefault(); enter(codeForm.code.value.trim().toUpperCase()); });
    let saved = ""; try { saved = localStorage.getItem("lp_ac_code") || ""; } catch {}
    if (saved) { codeForm.code.value = saved; enter(saved); }
    document.addEventListener("click", e => { if (e.target.closest("[data-go-learn]")) { let c = ""; try { c = localStorage.getItem("lp_ac_code") || ""; } catch {} if (c) { codeForm.code.value = c; enter(c); } } });
  }
})();
