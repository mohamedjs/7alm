// Fills a running dev stack with realistic demo activity (orders in every
// state, Messenger / Instagram / WhatsApp conversations, FB + IG comments)
// so the dashboard and inbox look alive for screenshots and demos.
// Usage: node --env-file=.env test/demo-activity.mjs
import crypto from "node:crypto";

const API = (process.env.API_URL ?? "http://localhost:4000") + "/api";
const secret = process.env.META_APP_SECRET;
const json = { "content-type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body, token) {
  const res = await fetch(API + path, { method, headers: { ...json, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return res.json().catch(() => ({}));
}
function meta(body) {
  const raw = JSON.stringify(body);
  return fetch(`${API}/webhooks/meta`, { method: "POST", headers: { ...json, "x-hub-signature-256": "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex") }, body: raw });
}

const token = (await call("POST", "/auth/login", { email: process.env.ADMIN_SEED_EMAIL, password: process.env.ADMIN_SEED_PASSWORD })).data.token;
const zones = (await call("GET", "/zones")).data;
const products = (await call("GET", "/products")).data;
const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

const buyers = [
  ["سارة محمود", "01023456789"],
  ["أحمد علي", "01134567890"],
  ["منى إبراهيم", "01245678901"],
  ["كريم حسن", "01556789012"],
  ["هبة سمير", "01067890123"],
  ["عمر خالد", "01178901234"],
  ["ياسمين فؤاد", "01289012345"],
];
const sources = ["facebook_ad", "instagram_ad", "tiktok", "whatsapp-agent", "organic"];
const plan = ["pending", "pending", "approved_wait", "confirmed", "delivered", "delivered", "cancelled"];

for (let i = 0; i < buyers.length; i++) {
  const [full_name, phone] = buyers[i];
  const items =
    i % 3 === 0
      ? [{ product_id: bySlug["7alm-smart-bottle"].id, quantity: 2 }, { product_id: bySlug["7alm-leather-wallet"].id, quantity: 1 }]
      : [{ product_id: (i % 2 ? bySlug["7alm-leather-wallet"] : bySlug["7alm-smart-bottle"]).id, quantity: 1 + (i % 2) }];
  const placed = await call("POST", "/orders", {
    full_name,
    phone,
    zone_id: zones[i % zones.length].id,
    street_details: `${10 + i} شارع ${["التحرير", "الهرم", "عباس العقاد", "مصطفى النحاس", "جامعة الدول"][i % 5]}`,
    items,
    platform_source: sources[i % sources.length],
  });
  const id = placed.orderId;
  if (!id) {
    console.log("order failed", placed.error);
    continue;
  }
  const step = plan[i];
  if (step === "approved_wait") await call("PATCH", `/orders/${id}/status`, { status: "approved", shipping_provider: "test", require_confirmation: true }, token);
  if (step === "confirmed" || step === "delivered") await call("PATCH", `/orders/${id}/status`, { status: "approved", shipping_provider: "test" }, token);
  if (step === "cancelled") await call("PATCH", `/orders/${id}/status`, { status: "cancelled" }, token);
  console.log(`order ${id.slice(0, 8)} → ${step}`);
}

const now = Date.now();
const chats = [
  ["messenger", "PSID_DEMO_1", "PAGE_1", ["السلام عليكم، الزجاجة متاحة بلون أسود؟", "وبتحافظ على السخونة كمان؟"]],
  ["instagram", "IGSID_DEMO_2", "IG_1", ["Hi! Do you ship to Alexandria?", "How many days?"]],
  ["messenger", "PSID_DEMO_3", "PAGE_1", ["عايز أطلب 3 قطع بالعرض"]],
];
for (const [channel, user, account, texts] of chats) {
  for (const [k, text] of texts.entries()) {
    const ts = now - (chats.length * 600_000) + k * 60_000;
    await meta({ object: channel === "messenger" ? "page" : "instagram", entry: [{ id: account, time: ts, messaging: [{ sender: { id: user }, recipient: { id: account }, timestamp: ts, message: { mid: `demo_${user}_${k}_${now}`, text } }] }] });
  }
}
const wa = [
  ["201023456789", "سارة", "الأوردر هيوصل امتى؟"],
  ["201134567890", "أحمد", "ممكن أغير العنوان؟"],
];
for (const [from, name, text] of wa) {
  await meta({
    object: "whatsapp_business_account",
    entry: [{ id: "WABA_1", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { display_phone_number: "201000000000", phone_number_id: "PNID_1" }, contacts: [{ profile: { name }, wa_id: from }], messages: [{ from, id: `wamid.demo.${from}.${now}`, timestamp: String(Math.floor(now / 1000)), type: "text", text: { body: text } }] } }] }],
  });
}
const comments = [
  ["page", "feed", { from: { id: "U_1", name: "Nour Adel" }, item: "comment", verb: "add", comment_id: `PAGE_1_P1_C1_${now}`, post_id: "PAGE_1_P1", parent_id: "PAGE_1_P1", message: "بكام الزجاجة؟ 😍", created_time: Math.floor(now / 1000) - 900, permalink_url: "https://facebook.com/" }],
  ["page", "feed", { from: { id: "U_2", name: "Mostafa Samy" }, item: "comment", verb: "add", comment_id: `PAGE_1_P1_C2_${now}`, post_id: "PAGE_1_P1", parent_id: "PAGE_1_P1", message: "فيه توصيل للمنصورة؟", created_time: Math.floor(now / 1000) - 600 }],
  ["instagram", "comments", { from: { id: "IGU_9", username: "dina.designs" }, comment_id: `IGC_${now}`, text: "Price please 🙏", media: { id: "MEDIA_1" } }],
];
for (const [object, field, value] of comments) {
  await meta({ object, entry: [{ id: object === "page" ? "PAGE_1" : "IG_1", time: Math.floor(now / 1000), changes: [{ field, value }] }] });
}
await sleep(4000);
console.log("demo activity done");
