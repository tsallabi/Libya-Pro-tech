/* لوحة التحكم — تبويب الأكاديمية: الدورات، رفع الفيديوهات والأغلفة إلى R2، التسجيلات، ومفاتيح ماي باي */
(function () {
  "use strict";
  const $ = s => document.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const api = async (p, o = {}) => {
    const r = await fetch("/api/admin/academy/" + p, { credentials: "same-origin", ...o, headers: o.body && typeof o.body === "string" ? { "content-type": "application/json" } : o.headers });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || r.status), { data: d }); return d;
  };
  const TR = { content: "صناعة المحتوى", marketing: "التسويق", code: "البرمجة", english: "الإنجليزية" };
  const ST = { pending: "بانتظار الدفع", paid: "مدفوع ✓", interest: "اهتمام", failed: "فشل", cancelled: "ملغى" };
  const MB = b => (b / 1048576).toFixed(1) + " MB";
  const date = t => t ? new Date(t).toLocaleString("ar-LY", { dateStyle: "short", timeStyle: "short" }) : "";
  let courses = [], rows = [], editing = null;

  window.loadAcademy = async () => { await Promise.all([loadCourses(), loadEnr(), loadMyPay(), loadWomen()]); };
  async function loadWomen() { const s = await (await fetch("/api/admin/settings")).json(); $("#ac-women").checked = (s.academy_women_only ?? "1") === "1"; }
  $("#ac-women").onchange = async e => { await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ academy_women_only: e.target.checked ? "1" : "0" }) }); };

  async function loadCourses() {
    courses = (await api("courses")).courses;
    $("#ac-courses").innerHTML = courses.length ? `<table class="adm-table"><thead><tr><th>الدورة</th><th>المسار</th><th>النوع</th><th>السعر</th><th>المقاعد</th><th>الدروس</th><th>مدفوع / بانتظار / اهتمام</th><th>الحالة</th><th></th></tr></thead><tbody>${
      courses.map(c => `<tr><td><b>${esc(c.title)}</b></td><td>${TR[c.track] || ""}</td><td>${c.mode === "live" ? "مباشرة" + (c.platform ? " · " + c.platform : "") : "مسجّلة"}</td>
        <td>${c.price ? c.price + " د.ل" : "قريباً"}</td><td>${c.seats || "∞"}</td><td>${c.lessons.length}</td>
        <td>${c.counts.paid || 0} / ${c.counts.pending || 0} / ${c.counts.interest || 0}</td><td>${c.published ? "منشورة" : "مسودة"}</td>
        <td><button class="adm-ghost" data-edit="${c.id}">تعديل</button></td></tr>`).join("")}</tbody></table>` : `<p class="adm-empty">لا توجد دورات بعد.</p>`;
    $$("[data-edit]").forEach(b => b.onclick = () => openForm(courses.find(c => c.id === +b.dataset.edit)));
    if (editing) { const c = courses.find(x => x.id === editing); if (c) lessons(c); }
  }

  const form = $("#ac-course-form");
  function openForm(c) {
    form.hidden = false; form.reset(); editing = c ? c.id : null;
    $("#ac-form-title").textContent = c ? "تعديل: " + c.title : "دورة جديدة";
    if (c) for (const [k, v] of Object.entries(c)) { const el = form.elements[k]; if (!el || el.type === "file") continue; if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; }
    else form.id.value = "";
    $("#ac-media").hidden = !c; $("#ac-del").hidden = !c; $("#ac-ok").hidden = true;
    if (c) lessons(c);
    form.scrollIntoView({ behavior: "smooth" });
  }
  function lessons(c) {
    $("#ac-lessons").innerHTML = (c.cover ? `<p class="mut">الغلاف الحالي: <img src="${c.cover.startsWith("/") ? esc(c.cover) : "/api/academy/cover/" + esc(c.cover)}" alt="" style="height:60px;border-radius:8px;vertical-align:middle"></p>` : "") +
      (c.lessons.length ? `<table class="adm-table"><tbody>${c.lessons.map((l, i) => `<tr><td>${i + 1}</td><td><input value="${esc(l.title)}" data-lt="${l.id}"></td><td>${MB(l.size)}</td><td><button type="button" class="adm-ghost" data-ld="${l.id}">حذف</button></td></tr>`).join("")}</tbody></table>` : `<p class="mut">لا دروس مرفوعة.</p>`);
    $$("[data-lt]").forEach(i => i.onchange = () => api("lessons", { method: "PATCH", body: JSON.stringify({ id: +i.dataset.lt, title: i.value }) }));
    $$("[data-ld]").forEach(b => b.onclick = async () => { if (!confirm("حذف هذا الدرس وملفه نهائياً؟")) return; await api("lessons?id=" + b.dataset.ld, { method: "DELETE" }); loadCourses(); });
  }
  $("#ac-new").onclick = () => openForm(null);
  $("#ac-cancel").onclick = () => { form.hidden = true; editing = null; };
  $("#ac-del").onclick = async () => {
    if (!confirm("حذف الدورة ودروسها نهائياً؟")) return;
    try { await api("courses?id=" + editing, { method: "DELETE" }); form.hidden = true; editing = null; loadCourses(); }
    catch (e) { alert(e.data?.error === "has_paid" ? `فيها ${e.data.n} مشترك دفعوا — ألغِ نشرها بدل حذفها.` : "تعذّر الحذف"); }
  };
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form)); d.published = form.published.checked;
    const ok = $("#ac-ok"); ok.hidden = false;
    try { const r = await api("courses", { method: "POST", body: JSON.stringify(d) }); ok.style.color = ""; ok.textContent = "حُفظت ✓";
      const was = editing; await loadCourses(); if (!was) openForm(courses.find(c => c.id === r.id)); $("#ac-ok").hidden = false; $("#ac-ok").textContent = "حُفظت ✓ — يمكنك الآن رفع الغلاف والدروس"; }
    catch (err) { ok.style.color = "#B42318"; ok.textContent = err.message === "join_url" ? "رابط الجلسة يجب أن يبدأ بـ https://" : "تعذّر الحفظ — اسم الدورة مطلوب"; }
  });

  /* الرفع: الملف يُرسل كما هو (PUT) مع شريط تقدّم */
  function put(url, file, onp) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest(); x.open("PUT", url); x.setRequestHeader("content-type", file.type || "video/mp4");
      x.upload.onprogress = e => e.lengthComputable && onp(e.loaded / e.total);
      x.onload = () => x.status < 300 ? res(JSON.parse(x.responseText)) : rej(new Error(x.status + " " + x.responseText));
      x.onerror = () => rej(new Error("network")); x.send(file);
    });
  }
  const prog = $("#ac-prog");
  $("#ac-cover").onchange = async e => {
    const f = e.target.files[0]; if (!f || !editing) return;
    if (f.size > 5e6) return alert("الصورة أكبر من 5 ميغابايت");
    prog.hidden = false; prog.textContent = "رفع الغلاف…";
    try { await put(`/api/admin/academy/upload?kind=cover&course_id=${editing}`, f, p => prog.textContent = `رفع الغلاف ${Math.round(p * 100)}%`); prog.textContent = "رُفع الغلاف ✓"; loadCourses(); }
    catch (err) { prog.textContent = "تعذّر رفع الغلاف: " + err.message; }
    e.target.value = "";
  };
  $("#ac-video").onchange = async e => {
    const files = [...e.target.files]; if (!files.length || !editing) return;
    prog.hidden = false;
    for (const [i, f] of files.entries()) {
      if (f.size > 100 * 1048576) { prog.textContent = `«${f.name}» أكبر من 100 ميغابايت — اضغطه أو قسّمه`; continue; }
      const title = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      try { await put(`/api/admin/academy/upload?kind=lesson&course_id=${editing}&title=${encodeURIComponent(title)}`, f,
        p => prog.textContent = `رفع ${i + 1}/${files.length}: ${f.name} — ${Math.round(p * 100)}%`); }
      catch (err) { prog.textContent = `تعذّر رفع ${f.name}: ${err.message}`; return; }
    }
    prog.textContent = "اكتمل الرفع ✓"; e.target.value = ""; loadCourses();
  };

  /* التسجيلات */
  async function loadEnr() {
    rows = (await api("enrollments")).rows;
    const pend = rows.filter(r => r.status === "pending").length; const b = $("#ac-badge"); if (b) b.textContent = pend;
    renderEnr();
  }
  function renderEnr() {
    const f = $("#ac-f").value;
    const list = rows.filter(r => !f || r.status === f || (f === "failed" && r.status === "cancelled"));
    $("#ac-enr").innerHTML = list.length ? `<table class="adm-table"><thead><tr><th>التاريخ</th><th>الاسم</th><th>الهاتف</th><th>الدورة</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th>رمز الدخول</th><th></th></tr></thead><tbody>${
      list.map(r => {
        const wa = `https://wa.me/${String(r.phone).replace(/\D/g, "").replace(/^0/, "218")}?text=${encodeURIComponent(`مرحباً ${r.name}، تم تأكيد تسجيلك في دورة «${r.course}».\nرمز الدخول: ${r.access_code}\nادخل من: https://libyaprotech.com/academy#learn`)}`;
        return `<tr><td>${date(r.ts)}</td><td>${esc(r.name)}</td><td dir="ltr">${esc(r.phone)}</td><td>${esc(r.course || "")}</td><td>${r.amount ? r.amount + " د.ل" : "—"}</td>
        <td>${{ mypay: "ماي باي", manual: "يدوي", interest: "—" }[r.method] || esc(r.method)}${r.note ? ` <span class="mut" title="${esc(r.note)}">ⓘ</span>` : ""}</td>
        <td>${ST[r.status] || esc(r.status)}</td><td dir="ltr"><b>${esc(r.access_code || "")}</b></td>
        <td>${r.status === "paid" ? `<a class="adm-ghost" href="${wa}" target="_blank" rel="noopener">أرسل الرمز واتساب</a>`
          : r.status === "interest" ? "" : `<button class="adm-ghost" data-pay="${r.id}">تأكيد دفع يدوي</button> <button class="adm-ghost" data-cx="${r.id}">إلغاء</button>`}</td></tr>`;
      }).join("")}</tbody></table>` : `<p class="adm-empty">لا تسجيلات.</p>`;
    $$("[data-pay]").forEach(b => b.onclick = async () => { if (!confirm("تأكيد أنك استلمت المبلغ؟ سيصدر رمز الدخول.")) return; await api("enrollments", { method: "PATCH", body: JSON.stringify({ id: +b.dataset.pay, action: "paid" }) }); loadEnr(); loadCourses(); });
    $$("[data-cx]").forEach(b => b.onclick = async () => { if (!confirm("إلغاء هذا التسجيل؟")) return; await api("enrollments", { method: "PATCH", body: JSON.stringify({ id: +b.dataset.cx, action: "cancel" }) }); loadEnr(); });
  }
  $("#ac-f").onchange = renderEnr;

  /* ماي باي */
  const mp = $("#mypay-form");
  async function loadMyPay() {
    const d = await api("mypay");
    $("#mp-state").textContent = d.ready ? (d.sandbox ? "مفعّل · تجريبي" : "مفعّل") : "غير مفعّل — يُحوَّل الدفع إلى واتساب";
    mp.client_id.placeholder = d.client_id || "لم يُحفظ"; mp.client_secret.placeholder = d.client_secret || "لم يُحفظ"; mp.webhook_secret.placeholder = d.webhook_secret || "لم يُحفظ";
    mp.sandbox.checked = d.sandbox; $("#mp-hook").textContent = location.origin + d.webhook_url;
    $("#mp-events").innerHTML = d.events.length ? `<table class="adm-table"><thead><tr><th>الوقت</th><th>التسجيل</th><th>الحالة</th><th>المبلغ</th><th>التوقيع</th><th>النتيجة</th></tr></thead><tbody>${
      d.events.map(e => `<tr><td>${date(e.ts)}</td><td>${esc(e.custom)}</td><td>${esc(e.status || e.event)}</td><td>${esc(e.amount)}</td><td>${e.sig_ok ? "✓" : "✗"}</td><td>${esc(e.outcome)}</td></tr>`).join("")}</tbody></table>` : `<p class="adm-empty">لم يصل أي إشعار بعد.</p>`;
  }
  mp.addEventListener("submit", async e => {
    e.preventDefault(); const ok = $("#mp-ok"); ok.hidden = false;
    try { await api("mypay", { method: "POST", body: JSON.stringify({ client_id: mp.client_id.value, client_secret: mp.client_secret.value, webhook_secret: mp.webhook_secret.value, sandbox: mp.sandbox.checked }) });
      mp.reset(); ok.style.color = ""; ok.textContent = "حُفظ ✓"; loadMyPay(); }
    catch { ok.style.color = "#B42318"; ok.textContent = "تعذّر الحفظ"; }
  });
  $("#mp-test").onclick = async () => {
    const ok = $("#mp-ok"); ok.hidden = false; ok.textContent = "جارٍ الاختبار…";
    const d = await api("mypay?test=1", { method: "POST", body: "{}" });
    ok.style.color = d.ok ? "" : "#B42318"; ok.textContent = d.ok ? "الاتصال بماي باي يعمل ✓" : "فشل: " + d.error;
  };
})();
