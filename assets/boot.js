/* يعمل في <head> قبل أول رسم: يمنع وميض المحتوى قبل تشغيل الحركة.
   خارجي لا مضمَّن، لأن سياسة أمان المحتوى تمنع السكربتات المضمّنة. */
(() => {
  const root = document.documentElement;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add(still ? "still" : "motion");
})();
