/* إحصاءات الزيارات الداخلية — تُرسل إلى /api/t على نطاقنا نفسه، بلا أي طرف ثالث.
   مُعرّف الزائر رقم عشوائي في المتصفح (لا اسم ولا بريد)، ويُحترم إشارة «عدم التتبع» ورفض الزائر. */
(function () {
  "use strict";
  var LS = window.localStorage, SS = window.sessionStorage;
  function get(s, k) { try { return s.getItem(k); } catch (e) { return null; } }
  function set(s, k, v) { try { s.setItem(k, v); } catch (e) {} }

  if (location.pathname.indexOf("/admin") === 0) return;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  if (get(LS, "lp_optout") === "1") return;

  var rid = function () { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).slice(0, 20); };
  var vid = get(LS, "lp_vid"); if (!vid) { vid = rid(); set(LS, "lp_vid", vid); }
  var now = Date.now(), last = +get(SS, "lp_last") || 0, sid = get(SS, "lp_sid");
  if (!sid || now - last > 30 * 60 * 1000) { sid = rid(); set(SS, "lp_sid", sid); }
  set(SS, "lp_last", String(now));
  window.LP_TRACK = { vid: vid, sid: sid };

  var q = new URLSearchParams(location.search);
  var utm = { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign") };

  function send(o) {
    o.vid = vid; o.sid = sid; o.path = location.pathname + location.hash.replace(/^#$/, "");
    var body = JSON.stringify(o);
    if (navigator.sendBeacon && navigator.sendBeacon("/api/t", new Blob([body], { type: "text/plain" }))) return;
    try { fetch("/api/t", { method: "POST", body: body, keepalive: true }); } catch (e) {}
  }

  /* زمن النشاط الفعلي: لا يُحسب والتبويب مخفي */
  var active = 0, tick = document.hidden ? 0 : Date.now();
  function spent() { if (tick) { active += Date.now() - tick; tick = Date.now(); } var a = active; active = 0; return a; }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { send({ type: "leave", dur: spent() }); tick = 0; }
    else { tick = Date.now(); set(SS, "lp_last", String(Date.now())); }
  });
  window.addEventListener("pagehide", function () { send({ type: "leave", dur: spent() }); });

  send({ type: "pageview", title: document.title, ref: document.referrer || null, utm: utm,
         screen: screen.width + "x" + screen.height, lang: navigator.language,
         tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone });

  setInterval(function () {
    if (document.hidden) return;
    set(SS, "lp_last", String(Date.now()));
    send({ type: "ping", dur: spent() });
  }, 20000);

  /* أين ذهب: النقرات المهمة فقط (واتساب، هاتف، روابط خارجية، الديمو، الملف التعريفي، أقسام الموقع) */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a, button");
    if (!a) return;
    var href = a.getAttribute("href") || "", label = (a.getAttribute("data-track") || a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
    var important = a.hasAttribute("data-track") || /^tel:|^mailto:|wa\.me|\.pdf($|\?)/.test(href) ||
      (/^https?:/.test(href) && a.host !== location.host) || /^\/?(banks|government|business)\.html/.test(href) ||
      a.type === "submit";
    if (!important) return;
    send({ type: "click", target: href || (a.type === "submit" ? "form:submit" : ""), label: label, dur: spent() });
  }, true);

  /* تنبيه الخصوصية مرة واحدة */
  if (!get(LS, "lp_notice")) {
    var bar = document.createElement("div");
    bar.className = "privacy-note";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "الخصوصية");
    bar.innerHTML = '<p>نحسب زيارات الموقع بإحصاءات داخلية مجهولة الهوية لنحسّنه — بلا إعلانات ولا مشاركة مع أي طرف.</p>' +
      '<div><button type="button" data-ok>حسناً</button><button type="button" data-no>لا أوافق</button></div>';
    document.body.appendChild(bar);
    bar.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-no")) set(LS, "lp_optout", "1");
      if (e.target.hasAttribute("data-ok") || e.target.hasAttribute("data-no")) { set(LS, "lp_notice", "1"); bar.remove(); }
    });
  }
})();
