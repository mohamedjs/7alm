// Sends signed Meta webhooks to a running api + worker and checks the inbox.
// Usage: node --env-file=.env test/meta-smoke.mjs
import crypto from "node:crypto";
const API = (process.env.API_URL ?? "http://localhost:4000") + "/api";
const secret = process.env.META_APP_SECRET;
const verify = process.env.META_WEBHOOK_VERIFY_TOKEN;
let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (body, sig) => {
  const raw = JSON.stringify(body);
  return fetch(`${API}/webhooks/meta`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": sig ?? "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex") },
    body: raw,
  });
};
const run = Date.now();

const hs = await fetch(`${API}/webhooks/meta?hub.mode=subscribe&hub.verify_token=${verify}&hub.challenge=CHALLENGE_${run}`);
check("verify handshake echoes challenge", hs.status === 200 && (await hs.text()) === `CHALLENGE_${run}`);
const bad = await fetch(`${API}/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
check("wrong verify token → 403", bad.status === 403);

const messenger = { object: "page", entry: [{ id: "PAGE_1", time: run, messaging: [{ sender: { id: `PSID_${run}` }, recipient: { id: "PAGE_1" }, timestamp: run, message: { mid: `m_${run}`, text: "السعر كام؟" } }] }] };
check("unsigned webhook rejected", (await post(messenger, "sha256=00")).status === 403);
const r1 = await post(messenger);
check("signed Messenger webhook → 200", r1.status === 200);
await post(messenger); // Meta retry: must not duplicate

const wa = {
  object: "whatsapp_business_account",
  entry: [{ id: "WABA_1", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { display_phone_number: "201000000000", phone_number_id: "PNID_1" }, contacts: [{ profile: { name: "محمد" }, wa_id: "201012345678" }], messages: [{ from: "201012345678", id: `wamid.${run}`, timestamp: String(Math.floor(run / 1000)), type: "text", text: { body: "عايز اطلب" } }] } }] }],
};
check("signed WhatsApp webhook → 200", (await post(wa)).status === 200);

const comment = { object: "page", entry: [{ id: "PAGE_1", time: Math.floor(run / 1000), changes: [{ field: "feed", value: { from: { id: "USER_5", name: "Mona" }, item: "comment", verb: "add", comment_id: `C_${run}`, post_id: "PAGE_1_POST_7", parent_id: "PAGE_1_POST_7", message: "متاح توصيل؟", created_time: Math.floor(run / 1000) } }] }] };
check("signed FB comment webhook → 200", (await post(comment)).status === 200);

await sleep(4000); // outbox relay → Kafka → worker
const login = await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: process.env.ADMIN_SEED_EMAIL, password: process.env.ADMIN_SEED_PASSWORD }) });
const token = (await login.json()).data.token;
const get = async (p) => (await (await fetch(API + p, { headers: { authorization: `Bearer ${token}` } })).json()).data;

const convs = await get("/admin/inbox/conversations?search=PSID_" + run);
check("Messenger conversation created once", convs.length === 1 && convs[0].unread_count === 1, `${convs.length} conv, unread ${convs[0]?.unread_count}`);
const waConv = (await get("/admin/inbox/conversations?channel=whatsapp")).find((c) => c.contact.external_id === "201012345678");
check("WhatsApp contact linked to the customer by phone", !!waConv?.contact.customer, waConv?.contact.customer?.full_name ?? "not linked");
const comments = await get("/admin/inbox/comments?platform=facebook");
const c = comments.find((x) => x.external_id === `C_${run}`);
check("FB comment stored", !!c && c.status === "open");

const thread = await get(`/admin/inbox/conversations/${convs[0].id}`);
check("thread has the message", thread.messages.length === 1 && thread.messages[0].body === "السعر كام؟");

const send = await fetch(`${API}/admin/inbox/conversations/${convs[0].id}/messages`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ text: "349 جنيه 🙏" }) });
const sent = await send.json();
check("reply queued", send.status === 201 && sent.data?.mode === "free", JSON.stringify(sent.data ?? sent.error));
const priv = await fetch(`${API}/admin/inbox/comments/${c.id}/replies`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ text: "بعتنالك رسالة", kind: "private" }) });
check("private reply queued", priv.status === 201);
const again = await fetch(`${API}/admin/inbox/comments/${c.id}/replies`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ text: "تاني", kind: "private" }) });
check("second private reply refused", again.status === 409);

await sleep(4000);
const after = await get(`/admin/inbox/conversations/${convs[0].id}`);
const out = after.messages.find((m) => m.direction === "outbound");
const expectFail = !process.env.META_PAGE_ACCESS_TOKEN;
check(expectFail ? "send without Page token fails cleanly (no creds configured)" : "reply sent", expectFail ? out?.status === "failed" && /not connected/.test(out.error) : out?.status === "sent", `${out?.status}: ${out?.error ?? ""}`);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
