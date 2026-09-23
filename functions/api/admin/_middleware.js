/* كل مسارات /api/admin/* تتطلب جلسة مدير، عدا تسجيل الدخول */
import { json, isAdmin } from "../../_lib.js";

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith("/api/admin/login")) return ctx.next();
  if (!(await isAdmin(ctx.request, ctx.env))) return json({ error: "auth" }, 401);
  return ctx.next();
}
