// End-to-end smoke test against a running api (default http://localhost:4000).
// Usage: node test/smoke.mjs   (needs the seed data and the seed admin from .env)
const B = (process.env.API_URL ?? "http://localhost:4000") + "/api";
const email = process.env.ADMIN_SEED_EMAIL ?? "admin@7alm.local";
const password = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe-7alm-2026";
let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
};
const call = async (method, path, body, token) => {
  const res = await fetch(B + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const login = await call("POST", "/auth/login", { email, password });
check("admin login", login.status === 200, `status ${login.status}`);
const token = login.json?.data?.token;

const zones = await call("GET", "/zones");
const zone = zones.json.data[0];
check("zones listed", zones.json.data.length > 0, `${zones.json.data.length} zones`);
const product = (await call("GET", "/products/7alm-smart-bottle")).json.data;
check("product by slug", !!product?.id, product?.name);
const stockBefore = product.quantity;

const code = "SMOKE" + Date.now().toString().slice(-6);
const coupon = await call("POST", "/admin/coupons", { code, type: "fixed", value: 50 }, token);
check("coupon created", coupon.status === 201, code);
const preview = await call("POST", "/coupons/validate", { code: code.toLowerCase(), subtotal: 649, shippingCost: zone.shipping_price });
check("coupon preview", preview.json?.data?.valid === true && preview.json.data.discountAmount === 50);

const bad = await call("POST", "/orders", { full_name: "x", phone: "123", zone_id: zone.id, street_details: "street" });
check("invalid checkout rejected", bad.status === 400, bad.json?.error);

const placed = await call("POST", "/orders", {
  full_name: "محمد أحمد",
  phone: "01012345678",
  zone_id: zone.id,
  street_details: "12 شارع التحرير",
  product_id: product.id,
  quantity: 2,
  coupon_code: code,
});
check("order placed", placed.status === 201 && placed.json?.orderId, `status ${placed.status} ${placed.json?.error ?? ""}`);
const orderId = placed.json.orderId;

let order = (await call("GET", `/admin/orders/${orderId}`, null, token)).json.data;
const expected = 649 - 50 + zone.shipping_price;
check("server-side totals", order.subtotal === 649 && order.discount_amount === 50 && order.total_price === expected, `total ${order.total_price}, expected ${expected}`);
check("line items stored", order.items.length === 1 && order.items[0].quantity === 2);

const approve = await call("PATCH", `/orders/${orderId}/status`, { status: "approved", shipping_provider: "test" }, token);
check("approve + ship now", approve.json?.success === true && !!approve.json.trackingId, approve.json?.trackingId ?? approve.json?.error);
const stockAfter = (await call("GET", "/products/7alm-smart-bottle")).json.data.quantity;
check("stock reserved", stockAfter === stockBefore - 2, `${stockBefore} → ${stockAfter}`);

const illegal = await call("PATCH", `/orders/${orderId}/status`, { status: "cancelled" }, token);
check("cancel after confirm refused", illegal.status === 400, illegal.json?.error);

const delay = Number(process.env.TEST_SHIPPING_DELAY_MS ?? 1500);
await sleep(delay * 3 + 1500);
order = (await call("GET", `/admin/orders/${orderId}`, null, token)).json.data;
check("courier webhooks delivered it", order.status === "delivered", order.status);

const noAuth = await call("GET", "/orders");
check("admin list needs auth", noAuth.status === 401);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
