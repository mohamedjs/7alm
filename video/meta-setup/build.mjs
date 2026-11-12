// Silent walkthrough of the Meta setup: one slide per real screenshot + Arabic captions.
// Usage: SHOTS_DIR=<dir with mcp-Claude_Browser-blob-*> OUT=<frames dir> node video/meta-setup/build.mjs
import { chromium } from "playwright";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const steps = JSON.parse(await readFile(path.join(HERE, "steps.json"), "utf8"));
const SHOTS = process.env.SHOTS_DIR;
const OUT = process.env.OUT;
const files = await readdir(SHOTS);
const total = steps.filter((s) => s.shot).length;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
const lines = (t) => t.split("\n").map((l) => `<div dir="auto">${esc(l)}</div>`).join("");

const css = `
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; overflow: hidden; font-family: "Cairo", sans-serif; direction: rtl; color: #f8fafc;
  background: radial-gradient(1200px 700px at 85% 10%, #0e7490 0%, transparent 60%), radial-gradient(900px 600px at 10% 100%, #312e81 0%, transparent 55%), #070b16; }
.wrap { position: absolute; inset: 0; display: grid; grid-template-columns: 600px 1fr; gap: 56px; padding: 70px 80px; align-items: center; }
.kicker { display: inline-block; font-size: 28px; font-weight: 700; color: #67e8f9; background: rgba(103,232,249,.1); border: 1px solid rgba(103,232,249,.35); padding: 6px 22px; border-radius: 999px; margin-bottom: 26px; }
h1 { font-size: 52px; line-height: 1.3; font-weight: 800; }
p { margin-top: 24px; font-size: 31px; line-height: 1.65; color: #cbd5e1; }
.note .box div { unicode-bidi: plaintext; text-align: start; }
.shot { display: flex; align-items: center; justify-content: center; height: 940px; }
.frame { border-radius: 22px; padding: 12px; background: linear-gradient(145deg, rgba(255,255,255,.18), rgba(255,255,255,.04)); box-shadow: 0 40px 120px rgba(0,0,0,.55); max-width: 100%; }
.frame img { display: block; border-radius: 12px; }
.bar { position: absolute; bottom: 0; inset-inline: 0; height: 8px; background: rgba(255,255,255,.08); }
.bar i { display: block; height: 100%; background: linear-gradient(90deg, #67e8f9, #a78bfa); }
.center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 160px; }
.center h1 { font-size: 92px; background: linear-gradient(90deg, #67e8f9, #a78bfa); -webkit-background-clip: text; color: transparent; }
.center p { font-size: 44px; color: #e2e8f0; }
.note { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 200px; }
.note h1 { font-size: 66px; color: #67e8f9; }
.note .box { font-size: 38px; line-height: 1.8; color: #e2e8f0; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 24px; padding: 36px 48px; margin-top: 36px; }
`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [i, s] of steps.entries()) {
  let body;
  if (s.kind === "title") body = `<div class="center"><h1>${esc(s.title)}</h1><p>${esc(s.sub)}</p></div>`;
  else if (s.kind === "note") body = `<div class="note"><h1>${esc(s.title)}</h1><div class="box">${lines(s.sub)}</div></div>`;
  else {
    const f = files.find((x) => x.startsWith(`mcp-Claude_Browser-blob-${s.shot}.`));
    const mime = f.endsWith(".png") ? "image/png" : "image/jpeg";
    const b64 = (await readFile(path.join(SHOTS, f))).toString("base64");
    body = `<div class="wrap"><div><span class="kicker">خطوة ${s.n} من ${total}</span><h1>${esc(s.title)}</h1><p>${esc(s.sub)}</p></div>
      <div class="shot"><div class="frame"><img src="data:${mime};base64,${b64}"></div></div></div>`;
  }
  body += `<div class="bar"><i style="width:${(((i + 1) / steps.length) * 100).toFixed(1)}%"></i></div>`;
  await page.setContent(`<!doctype html><html lang="ar"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet"><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const img = document.querySelector(".frame img");
    if (img) { await img.decode(); const k = Math.min(1140 / img.naturalWidth, 900 / img.naturalHeight, 2); img.style.width = img.naturalWidth * k + "px"; img.style.height = img.naturalHeight * k + "px"; }
  });
  await page.screenshot({ path: path.join(OUT, `${String(i).padStart(2, "0")}.png`) });
}
await browser.close();
console.log("slides:", steps.length);
