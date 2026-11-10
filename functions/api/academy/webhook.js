/* POST /api/academy/webhook — إشعار ماي باي الموقّع. كل إشعار يُسجَّل (حتى المرفوض) في mypay_events */
import { json } from "../../_lib.js";
import { markPaid } from "../../_academy.js";
import { config, verdict, signatureOk } from "../../_mypay.js";

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  let b = {}; try { b = JSON.parse(raw); } catch {}
  const cfg = await config(env);
  const ok = await signatureOk(cfg.webhookSecret, raw, request.headers.get("x-mypay-signature"));
  const log = (outcome) => env.DB.prepare("INSERT INTO mypay_events (ts, custom, token, status, event, sig_ok, outcome, amount) VALUES (?,?,?,?,?,?,?,?)")
    .bind(Date.now(), String(b.custom ?? "").slice(0, 40), String(b.token ?? "").slice(0, 80), String(b.status ?? "").slice(0, 30),
          String(b.event ?? "").slice(0, 40), ok ? 1 : 0, outcome, String(b.amount ?? "").slice(0, 20)).run();
  if (!ok) { await log("bad_signature"); return json({ error: "signature" }, 401); }

  let e = null;
  if (/^\d+$/.test(String(b.custom ?? ""))) e = await env.DB.prepare("SELECT * FROM enrollments WHERE id = ?").bind(Number(b.custom)).first();
  if (!e && b.token) e = await env.DB.prepare("SELECT * FROM enrollments WHERE mypay_token = ?").bind(String(b.token)).first();
  if (!e) { await log("no_match"); return json({ ok: false, reason: "no_matching_enrollment" }, 202); }

  const v = verdict(b);
  if (v === "paid") {
    if (e.status === "paid") { await log("already_paid"); return json({ ok: true }); }
    await markPaid(env, e.id, "mypay"); await log("paid"); return json({ ok: true });
  }
  if (v === "failed" && e.status === "pending") {
    await env.DB.prepare("UPDATE enrollments SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(e.id).run();
    await log("failed"); return json({ ok: true });
  }
  await log("unknown_status"); return json({ ok: true, pending: true }, 202);
}
export const onRequest = () => json({ error: "method" }, 405);
