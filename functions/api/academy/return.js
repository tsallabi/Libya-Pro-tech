/* GET /api/academy/return — عودة الطالب من صفحة ماي باي. لا يُعتمد عليها في إثبات الدفع (الإشعار الموقّع وحده يفعل) */
export function onRequestGet({ request }) {
  const u = new URL(request.url), ref = (u.searchParams.get("ref") || "").replace(/[^a-f0-9]/g, "").slice(0, 40);
  const type = u.searchParams.get("type") === "cancel" ? "cancel" : "back";
  return Response.redirect(`${u.origin}/academy?pay=${type}&ref=${ref}#enroll`, 302);
}
