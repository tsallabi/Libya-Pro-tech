/* GET /api/academy/cover/:key — صورة غلاف الدورة من R2 */
export async function onRequestGet({ env, params }) {
  const key = "covers/" + [].concat(params.key || []).join("/").replace(/^covers\//, "");
  if (!/^covers\/[a-f0-9]{16,40}\.(webp|jpg|jpeg|png)$/.test(key)) return new Response("bad", { status: 400 });
  const o = await env.ACADEMY.get(key);
  if (!o) return new Response("not found", { status: 404 });
  return new Response(o.body, { headers: { "content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "public, max-age=86400" } });
}
