// Renders the launch-video slides (1920×1080) from the real app screenshots.
// Each slide = brand background + Arabic headline + framed screenshot.
// Usage: node video/build-slides.mjs   → video/frames/NN.png
import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SHOTS = path.join(ROOT, "site/assets/screens");
const OUT = path.join(ROOT, "video/frames");

const slides = [
  { kind: "title", title: "حلم", sub: "متجرك، طلباتك، وكل رسائل عملائك… في مكان واحد", tag: "7alm v2" },
  { shot: "store-home", kicker: "المتجر", title: "متجر عربي سريع وجميل", sub: "عربي وإنجليزي · RTL و LTR · وضع ليلي ونهاري" },
  { shot: "landing", kicker: "صفحات الهبوط", title: "صفحة لكل منتج من أول إعلان", sub: "عروض الكميات · خصم واضح · رابط مباشر للإعلان" },
  { shot: "landing-checkout", kicker: "الدفع عند الاستلام", title: "طلب في خطوة واحدة", sub: "المنطقة وسعر الشحن والكوبون بيتحسبوا على السيرفر" },
  { shot: "admin-dashboard", kicker: "لوحة التحكم", title: "أرقامك قدامك لحظة بلحظة", sub: "الإيرادات · الطلبات · مصدر كل طلب" },
  { shot: "admin-orders", kicker: "الطلبات", title: "دورة الطلب كاملة", sub: "موافقة · شحن تلقائي مع بوسطة · تتبع لحد التسليم" },
  { shot: "admin-inbox", kicker: "صندوق الرسائل", title: "ماسنجر وإنستجرام وواتساب في شاشة واحدة", sub: "رسائل لحظية · ربط تلقائي بالعميل وطلباته" },
  { shot: "admin-comments", kicker: "التعليقات", title: "رد على تعليقات فيسبوك وإنستجرام", sub: "رد علني أو رد في الخاص · إخفاء السبام" },
  { shot: "admin-customers", kicker: "العملاء", title: "CRM مبني على رقم الموبايل", sub: "إجمالي المصروفات · عدد الطلبات · تاريخ كل عميل" },
  { shot: "admin-products", kicker: "المنتجات", title: "كتالوج بالأقسام والصور", sub: "المخزون بيتحدّث تلقائيًا مع كل طلب" },
  { shot: "admin-ai-studio", kicker: "استوديو الذكاء الاصطناعي", title: "كامباينات وصور وفيديوهات بالذكاء الاصطناعي", sub: "من تليجرام لحد الإعلان" },
  { kind: "arch", title: "مبني للإنتاج", sub: "NestJS Modular Monolith · PostgreSQL · Kafka · Redis · Docker" },
  { kind: "title", title: "حلم", sub: "github.com/mohamedjs/7alm", tag: "جاهز للتشغيل" },
];

const css = `
@font-face { font-family: Cairo; src: local("Cairo"), local("Noto Kufi Arabic"); }
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; overflow: hidden; font-family: "Cairo", "Noto Kufi Arabic", "Noto Sans Arabic", sans-serif; direction: rtl;
  background: radial-gradient(1200px 700px at 85% 10%, #0e7490 0%, transparent 60%), radial-gradient(900px 600px at 10% 100%, #312e81 0%, transparent 55%), #070b16; color: #f8fafc; }
.wrap { position: absolute; inset: 0; display: grid; grid-template-columns: 560px 1fr; gap: 56px; padding: 90px 96px; align-items: center; }
.kicker { display: inline-block; font-size: 30px; font-weight: 700; color: #67e8f9; background: rgba(103,232,249,.1); border: 1px solid rgba(103,232,249,.35); padding: 8px 22px; border-radius: 999px; margin-bottom: 28px; }
h1 { font-size: 66px; line-height: 1.25; font-weight: 800; letter-spacing: -.5px; }
p { margin-top: 26px; font-size: 32px; line-height: 1.6; color: #cbd5e1; }
.frame { border-radius: 26px; padding: 14px; background: linear-gradient(145deg, rgba(255,255,255,.18), rgba(255,255,255,.04)); box-shadow: 0 40px 120px rgba(0,0,0,.55); }
.frame .bar { height: 34px; display: flex; gap: 10px; align-items: center; padding: 0 14px; direction: ltr; }
.frame .bar i { width: 13px; height: 13px; border-radius: 50%; background: #f87171; } .frame .bar i:nth-child(2){background:#fbbf24} .frame .bar i:nth-child(3){background:#34d399}
.frame img { display: block; width: 100%; border-radius: 14px; }
.title { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.title .logo { font-size: 230px; font-weight: 900; background: linear-gradient(90deg, #67e8f9, #a78bfa); -webkit-background-clip: text; color: transparent; line-height: 1.1; }
.title p { font-size: 44px; color: #e2e8f0; } .title .tag { margin-top: 40px; font-size: 30px; direction: ltr; color: #67e8f9; letter-spacing: 3px; text-transform: uppercase; }
.arch { position: absolute; inset: 0; padding: 110px 120px; }
.arch h1 { text-align: center; } .arch p { text-align: center; direction: ltr; }
.layers { margin-top: 64px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; direction: ltr; }
.layer { border-radius: 22px; padding: 30px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); }
.layer b { display: block; font-size: 34px; color: #67e8f9; margin-bottom: 14px; font-family: system-ui, sans-serif; }
.layer span { font-size: 26px; color: #cbd5e1; font-family: system-ui, sans-serif; line-height: 1.5; }
`;

const archHtml = `
<div class="arch"><h1>{{title}}</h1><p>{{sub}}</p>
<div class="layers">
  <div class="layer"><b>Presentation</b><span>Next.js 16 storefront &amp; admin · NestJS controllers · Meta webhooks · socket.io</span></div>
  <div class="layer"><b>Application</b><span>Use cases: checkout, approve &amp; ship, reply to comment, deliver message</span></div>
  <div class="layer"><b>Domain</b><span>Order state machine · pricing tiers · coupon rules · Meta 24 h / 7 d windows</span></div>
  <div class="layer"><b>Infrastructure</b><span>Prisma + PostgreSQL · Kafka outbox · Redis · Graph API · Bosta</span></div>
</div></div>`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

for (const [i, s] of slides.entries()) {
  let body;
  if (s.kind === "title") {
    body = `<div class="title"><div class="logo">${s.title}</div><p>${s.sub}</p><div class="tag">${s.tag}</div></div>`;
  } else if (s.kind === "arch") {
    body = archHtml.replace("{{title}}", s.title).replace("{{sub}}", s.sub);
  } else {
    const b64 = (await readFile(path.join(SHOTS, `${s.shot}.png`))).toString("base64");
    body = `<div class="wrap"><div><span class="kicker">${s.kicker}</span><h1>${s.title}</h1><p>${s.sub}</p></div>
      <div class="frame"><div class="bar"><i></i><i></i><i></i></div><img src="data:image/png;base64,${b64}"></div></div>`;
  }
  await page.setContent(`<!doctype html><html lang="ar"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet"><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: file });
  console.log("✔", path.basename(file));
}
await browser.close();
