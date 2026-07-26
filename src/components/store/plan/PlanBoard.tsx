"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/features/theme/theme.hooks";

/**
 * Damped harmonic spring — the same model Framer Motion integrates.
 * Hand-rolled rather than imported so the page carries no animation
 * dependency: velocity carries between gestures, which is what makes a
 * thrown note settle like paper instead of easing on a fixed curve.
 */
class Spring {
  v: number;
  target: number;
  vel = 0;
  done = true;
  constructor(value: number, private stiffness = 170, private damping = 22) {
    this.v = value;
    this.target = value;
  }
  set(target: number, vel?: number) {
    this.target = target;
    if (typeof vel === "number") this.vel = vel;
    this.done = false;
  }
  jump(v: number) {
    this.v = this.target = v;
    this.vel = 0;
    this.done = true;
  }
  step(dt: number): boolean {
    if (this.done) return false;
    const d = this.v - this.target;
    this.vel += (-this.stiffness * d - this.damping * this.vel) * dt;
    this.v += this.vel * dt;
    if (Math.abs(this.vel) < 0.02 && Math.abs(this.v - this.target) < 0.02) {
      this.v = this.target;
      this.vel = 0;
      this.done = true;
    }
    return true;
  }
}

interface NoteState {
  el: HTMLElement;
  tilt: number;
  index: number;
  x: Spring;
  y: Spring;
  rot: Spring;
  scale: Spring;
  opacity: number;
  entered: boolean;
  dragging: boolean;
}

/** Post-it stock — saturated paper that reads as material on both grounds. */
const PAPER = {
  canary: "#ffe45e",
  pink: "#ff8fbe",
  cyan: "#7ce0e4",
  lime: "#bfe86e",
  manila: "#f2ead3",
  orange: "#ffb26b",
  violet: "#c3aef5",
} as const;

const DM_TEXT = [
  "أهلاً 👋 شفت صفحتك و منتجاتك حلوة جداً.",
  "لاحظت إن الأوردرات بتتاخد في الرسايل — ده بيضيّع أوردرات وقت الزحمة.",
  "بعمل متجر كامل بالعربي، دفع عند الاستلام، وشحن متربوط، جاهز في 5 أيام.",
  'ابعتلي "متجر" وأبعتلك فيديو دقيقتين لمتجر شغال — من غير أي التزام.',
].join("\n");

export default function PlanBoard() {
  const wallRef = useRef<HTMLDivElement>(null);
  const statesRef = useRef<NoteState[]>([]);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastRef = useRef(0);

  const { theme, toggleTheme } = useTheme("store-theme");
  const [copied, setCopied] = useState(false);

  const kick = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastRef.current = 0;

    const loop = (now: number) => {
      const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 1 / 60;
      lastRef.current = now;

      let active = false;
      for (const s of statesRef.current) {
        let moved = false;
        if (!s.dragging) {
          moved = Boolean(s.x.step(dt)) || moved;
          moved = Boolean(s.y.step(dt)) || moved;
        }
        moved = Boolean(s.rot.step(dt)) || moved;
        moved = Boolean(s.scale.step(dt)) || moved;

        if (s.opacity < 1 && s.entered) {
          s.opacity = Math.min(1, s.opacity + dt * 3.2);
          moved = true;
        }
        if (moved || s.dragging) {
          s.el.style.opacity = String(s.opacity);
          s.el.style.transform =
            `translate3d(${s.x.v.toFixed(2)}px,${s.y.v.toFixed(2)}px,0)` +
            ` rotate(${s.rot.v.toFixed(3)}deg) scale(${s.scale.v.toFixed(4)})`;
          active = true;
        }
      }

      if (active) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        runningRef.current = false;
        lastRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const notes = Array.from(wall.querySelectorAll<HTMLElement>("[data-note]"));

    const states: NoteState[] = notes.map((el, index) => {
      const tilt = parseFloat(el.dataset.tilt || "0");
      return {
        el,
        tilt,
        index,
        x: new Spring(0, 210, 26),
        y: new Spring(0, 210, 26),
        rot: new Spring(tilt, 150, 13),
        scale: new Spring(1, 320, 24),
        opacity: 0,
        entered: false,
        dragging: false,
      };
    });
    statesRef.current = states;

    const cleanups: (() => void)[] = [];

    // ---- entrance: staggered spring drop as each note scrolls in ----
    const enter = (s: NoteState) => {
      if (s.entered) return;
      s.entered = true;
      if (reduced) {
        s.opacity = 1;
        s.el.style.opacity = "1";
        s.el.style.transform = `rotate(${s.tilt}deg)`;
        return;
      }
      window.setTimeout(() => {
        s.y.jump(-52);
        s.y.set(0);
        s.rot.jump(s.tilt * 2.8);
        s.rot.set(s.tilt);
        s.scale.jump(0.93);
        s.scale.set(1);
        kick();
      }, Math.min(s.index, 5) * 70);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const s = states[notes.indexOf(e.target as HTMLElement)];
          if (s) enter(s);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    notes.forEach((n) => io.observe(n));
    cleanups.push(() => io.disconnect());

    // ---- hover lift + drag with momentum (pointer-fine only, so touch
    //      scrolling is never hijacked) ----
    if (fine) {
      for (const s of states) {
        const onEnter = () => {
          if (s.dragging) return;
          s.rot.set(s.tilt * 0.18);
          s.scale.set(1.02);
          s.el.dataset.lifted = "1";
          kick();
        };
        const onLeave = () => {
          if (s.dragging) return;
          s.rot.set(s.tilt);
          s.scale.set(1);
          delete s.el.dataset.lifted;
          kick();
        };

        let startX = 0, startY = 0, baseX = 0, baseY = 0;
        let lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0;
        let pid: number | null = null;

        const onDown = (e: PointerEvent) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
          const sel = window.getSelection();
          if (sel && sel.type === "Range" && !sel.isCollapsed) return;

          pid = e.pointerId;
          s.dragging = true;
          s.el.dataset.dragging = "1";
          s.el.dataset.lifted = "1";
          s.el.setPointerCapture(pid);
          startX = e.clientX;
          startY = e.clientY;
          baseX = s.x.v;
          baseY = s.y.v;
          lastX = e.clientX;
          lastY = e.clientY;
          lastT = performance.now();
          vx = vy = 0;
          s.scale.set(1.045);
          kick();
        };

        const onMove = (e: PointerEvent) => {
          if (!s.dragging || e.pointerId !== pid) return;
          s.x.jump(baseX + (e.clientX - startX));
          s.y.jump(baseY + (e.clientY - startY));

          const t = performance.now();
          const dt = (t - lastT) / 1000;
          if (dt > 0.001) {
            vx = (e.clientX - lastX) / dt;
            vy = (e.clientY - lastY) / dt;
            lastX = e.clientX;
            lastY = e.clientY;
            lastT = t;
          }
          // paper leans into the direction it's thrown
          s.rot.set(Math.max(-14, Math.min(14, s.tilt + vx * 0.012)));
          kick();
        };

        const onUp = (e: PointerEvent) => {
          if (!s.dragging || e.pointerId !== pid) return;
          s.dragging = false;
          delete s.el.dataset.dragging;
          delete s.el.dataset.lifted;
          // momentum: the throw carries, then settles
          s.x.set(s.x.v + vx * 0.09, vx);
          s.y.set(s.y.v + vy * 0.09, vy);
          s.rot.set(s.tilt, vx * 0.05);
          s.scale.set(1);
          vx = vy = 0;
          kick();
        };

        s.el.addEventListener("pointerenter", onEnter);
        s.el.addEventListener("pointerleave", onLeave);
        s.el.addEventListener("pointerdown", onDown);
        s.el.addEventListener("pointermove", onMove);
        s.el.addEventListener("pointerup", onUp);
        s.el.addEventListener("pointercancel", onUp);
        cleanups.push(() => {
          s.el.removeEventListener("pointerenter", onEnter);
          s.el.removeEventListener("pointerleave", onLeave);
          s.el.removeEventListener("pointerdown", onDown);
          s.el.removeEventListener("pointermove", onMove);
          s.el.removeEventListener("pointerup", onUp);
          s.el.removeEventListener("pointercancel", onUp);
        });
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [kick]);

  const tidy = useCallback(() => {
    statesRef.current.forEach((s, i) => {
      window.setTimeout(() => {
        s.x.set(0);
        s.y.set(0);
        s.rot.set(s.tilt);
        s.scale.set(1);
        kick();
      }, i * 26);
    });
  }, [kick]);

  const copyDm = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(DM_TEXT);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = DM_TEXT;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // clipboard unavailable — the text stays selectable on the page
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1900);
  }, []);

  return (
    <div className="min-h-screen bg-surface px-4 pb-28 pt-6 text-text-primary sm:px-8 lg:px-11 lg:pt-14">
      {/* masthead */}
      <header className="mx-auto mb-8 flex max-w-[1180px] flex-wrap items-end justify-between gap-6 border-b border-text-muted/20 pb-6 lg:mb-12">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
            Strategy board · 8 weeks · Cairo
          </p>
          <h1 className="text-[clamp(2rem,6vw,4.2rem)] font-black leading-[0.92] tracking-[-0.035em] text-balance">
            Stop building.
            <br />
            <span className="text-brand-500">Go sell it.</span>
          </h1>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light and dark"
              className="neu-raised inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary transition-transform active:scale-95"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
              {theme === "dark" ? "Light" : "Dark"}
            </button>

            <button
              type="button"
              onClick={tidy}
              className="neu-raised hidden items-center gap-2 rounded-full bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary transition-transform active:scale-95 lg:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7h18M6 12h12M9 17h6" />
              </svg>
              Tidy board
            </button>
          </div>

          <div className="text-end">
            <div className="text-[clamp(1.4rem,3.4vw,2.2rem)] font-black leading-none tracking-[-0.03em] tabular-nums">
              1,000,000 EGP
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              the real target
            </div>
          </div>
        </div>
      </header>

      {/* the wall */}
      <div
        ref={wallRef}
        className="mx-auto max-w-[1180px] gap-x-5 [column-count:1] sm:[column-count:2] lg:gap-x-8 lg:[column-count:3]"
      >
        <Note tilt={-1.6} paper={PAPER.canary} tag="Read this first" title="Your number needs fixing">
          <p>You said “1 million in 2 months.” Everything depends on which million.</p>
          <div className="my-3.5 grid gap-2">
            <div className="flex items-baseline justify-between gap-3 rounded-[3px] bg-black/[0.07] px-3 py-2.5 shadow-[inset_3px_0_0_#1f8f4e]">
              <b className="font-extrabold tabular-nums">1,000,000 EGP</b>
              <span className="text-end text-[12.5px] font-semibold text-black/60">
                Hard, but real — this board targets it
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 rounded-[3px] bg-black/[0.07] px-3 py-2.5 shadow-[inset_3px_0_0_#c62f28]">
              <b className="font-extrabold tabular-nums">$1,000,000 USD</b>
              <span className="text-end text-[12.5px] font-semibold text-black/60">
                Not happening. That&apos;s a funded team, not 8 weeks
              </span>
            </div>
          </div>
          <p>Anyone promising you the second one is selling you a course.</p>
        </Note>

        <Note tilt={2.1} paper={PAPER.pink} tag="Cut it" title="ThemeForest is the wrong fight">
          <p>
            It rewards <strong>visual design polish</strong> — judged against studios who do nothing
            else, at $39 a sale minus Envato&apos;s cut, behind a multi-week review queue.
          </p>
          <p>
            Your moat is <strong>Arabic RTL, automation, and AI</strong>. ThemeForest scores none of
            it. You&apos;d compete on your weakest axis for the smallest prize.
          </p>
          <p>Revisit in month six — as a lead magnet, never as a business.</p>
        </Note>

        <Note tilt={-1.1} paper={PAPER.cyan} tag="The wedge" title="You keep calling it “a store.” It isn't.">
          <p>
            You built an Arabic-first commerce stack with WhatsApp order automation, auto-posting to
            Facebook, Instagram and TikTok, and an AI agent that researches a niche, writes the
            campaign, generates the ad image and publishes it — from your phone, in Egyptian Arabic.
          </p>
          <p>
            <strong>Shopify doesn&apos;t do that. Zid and Salla don&apos;t do that.</strong>
          </p>
          <p>That&apos;s your wedge, and it has maybe 18 months before someone copies it.</p>
        </Note>

        <Note tilt={1.4} paper={PAPER.manila} tag="Offer 01 · the money" title="متجرك جاهز في 5 أيام">
          <p>
            Egyptian merchants taking orders in Instagram DMs. Tens of thousands of them, losing
            sales every day to message chaos, with no COD flow and no repeat-purchase engine.
          </p>
          <div className="my-3.5 grid gap-2">
            {[
              { name: "أساسي", price: "15,000", star: false },
              { name: "احترافي ⭐", price: "25,000", star: true },
              { name: "ذكي", price: "40,000", star: false },
            ].map((t) => (
              <div
                key={t.name}
                className={`flex items-center justify-between gap-3 rounded-[3px] px-3 py-2.5 text-[13.5px] font-semibold ${
                  t.star
                    ? "bg-black/15 shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.3)]"
                    : "bg-black/[0.07]"
                }`}
              >
                <span dir="rtl">{t.name}</span>
                <b className="font-extrabold tabular-nums">{t.price}</b>
              </div>
            ))}
          </div>
          <p>
            Delivered in five days because <strong>the platform already exists</strong> —
            you&apos;re configuring, not building. Anchor on احترافي; some will take ذكي because the
            AI agent is the only reason they called.
          </p>
          <p>
            <strong>50% up front. Always.</strong> It filters tire-kickers and funds your ad spend.
          </p>
        </Note>

        <Note tilt={-2.2} paper={PAPER.lime} tag="Offer 02 · the real business" title="Retainers, not one-offs">
          <p>
            One-off builds are a treadmill. <strong>8,000 EGP/month</strong> buys them WhatsApp
            automation, 12 auto-generated posts, a monthly report, hosting and support.
          </p>
          <p>
            Pitch it <strong>at handover</strong>, while the store is live and they&apos;re excited —
            not at signup. Expect 60–70% to say yes.
          </p>
          <p>
            Fifteen retainers is <strong>120,000 EGP/month recurring</strong> that outlives these 8
            weeks. Chase this harder than the one-offs — it&apos;s what makes the business worth
            something later.
          </p>
        </Note>

        <Note tilt={1.9} paper={PAPER.manila} tag="The math" title="How the million lands">
          <table className="mt-3.5 w-full border-collapse font-mono text-[13px] tabular-nums">
            <tbody>
              {[
                ["20 store builds × 25,000", "500,000"],
                ["15 retainers × 8,000 × 2mo", "240,000"],
                ["Digital products (~$3.5K)", "170,000"],
                ["7alm brand profit", "100,000"],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="border-b border-dashed border-black/15 py-1.5">{label}</td>
                  <td className="border-b border-dashed border-black/15 py-1.5 text-end font-bold">
                    {value}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border-t-2 border-black/30 pt-2.5 text-[15px] font-extrabold">Total</td>
                <td className="border-t-2 border-black/30 pt-2.5 text-end text-[15px] font-extrabold">
                  1,010,000
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3.5">
            Which means <strong>2.5 closed deals a week</strong>. At a 20% close rate: ~12 real
            conversations, from ~40 touches. Weekly.
          </p>
          <p>Hit half and you still made 500K EGP from a standing start. Most people never do.</p>
        </Note>

        <Note tilt={-1.3} paper={PAPER.violet} tag="Offer 03 · USD" title="Sell the workflows while you sleep">
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            {[
              ["n8n Arabic E-commerce Pack", "WhatsApp orders, social posting, Telegram approvals · $79"],
              ["Claude Agent Starter Kit", "your agents, skills, hooks, changelog discipline · $49"],
              ["AI Campaign Builder blueprint", "research → copy → image → publish · $99"],
            ].map(([name, detail]) => (
              <li key={name} className="relative ps-5 text-sm leading-normal text-[#4a4e5c]">
                <span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />
                <b className="text-[#23262f]">{name}</b> — {detail}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Realistically $2.5–4K in six weeks. The cash is modest — but it makes you{" "}
            <strong>“the automation guy,”</strong> which is what lets you charge more for Offer 01.
          </p>
        </Note>

        <Note tilt={2.4} paper={PAPER.orange} tag="Right instinct, wrong scoreboard" title="YouTube pays in calls, not AdSense">
          <p>
            Arabic AI content has almost no serious competition. But AdSense there runs $1–3 RPM —
            100K views is about $150. Meaningless.
          </p>
          <p>
            So don&apos;t count views. <strong>Count booked calls.</strong>
          </p>
          <p>
            One video — <span dir="rtl">«شوف إزاي بعمل حملة إعلانية كاملة من على التليجرام»</span> —
            showing your bot research a niche, write the campaign, generate the image and publish to
            Instagram, is the best sales asset you will ever make. It closes deals while you sleep.
          </p>
        </Note>

        <Note tilt={-1.7} paper={PAPER.manila} tag="Keep it lean" title="7alm is your proof, not your paycheck">
          <p>
            Its job is to be a live store you can point at. <span dir="rtl">«ده متجري أنا»</span>{" "}
            closes deals no portfolio can.
          </p>
          <p>
            One hero product, let the AI agent handle the content, target 100K profit.{" "}
            <strong>Don&apos;t sink two months into scaling it</strong> — that takes 6–12 months and
            working capital you&apos;d rather spend on sales.
          </p>
        </Note>

        {/* the working tool */}
        <Note tilt={1.2} paper={PAPER.cyan}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-balance">
              The DM that works
            </h2>
            <button
              type="button"
              onClick={copyDm}
              aria-label="Copy the Arabic outreach message"
              className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white transition-all active:scale-95 ${
                copied ? "bg-[#14803f]" : "bg-[#1c1f28] hover:bg-[#2c3040]"
              }`}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="12" height="12" rx="2.2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div
            dir="rtl"
            className="rounded bg-white/50 px-4 py-4 text-[14.5px] leading-[1.95] text-[#23262f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.09)]"
          >
            {DM_TEXT.split("\n").map((line) => (
              <p key={line} className="m-0">
                {line}
              </p>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] font-semibold leading-snug text-black/60">
            Short, specific, proof-led. Then send a 2-minute Loom of a{" "}
            <strong className="text-[#23262f]">working store</strong> — not a deck, not a PDF.
          </p>
        </Note>

        <Note tilt={-2.4} paper={PAPER.pink} tag="It will go wrong here" title="You'll retreat into code">
          <p>
            A feature feels productive. A cold DM feels awful. Building is the comfortable failure
            mode and it will quietly eat all eight weeks.
          </p>
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            {[
              <>
                <b className="text-[#23262f]">Underpricing out of fear.</b> The first{" "}
                <span dir="rtl">«ده غالي»</span> will tempt you to drop to 10K. Cheap clients demand
                the most and refer the worst.
              </>,
              <>
                <b className="text-[#23262f]">Support swallowing you.</b> Fixed hours in the contract
                from client #1, not client #10.
              </>,
              <>
                <b className="text-[#23262f]">Scope creep.</b>{" "}
                <span dir="rtl">«ممكن كمان تعمل…»</span> is a paid change request.
              </>,
              <>
                <b className="text-[#23262f]">Chasing all six channels.</b> Two of them are 74% of
                the target.
              </>,
            ].map((node, i) => (
              <li key={i} className="relative ps-5 text-sm leading-normal text-[#4a4e5c]">
                <span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />
                {node}
              </li>
            ))}
          </ul>
        </Note>

        <Note tilt={1.7} paper={PAPER.canary} tag="Tomorrow">
          <div className="my-1.5 text-[46px] font-black leading-none tracking-[-0.04em] tabular-nums">
            20 DMs
          </div>
          <h2 className="mb-3 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-balance">
            Not a landing page. Not one more feature.
          </h2>
          <p>Twenty messages to twenty Instagram merchants, each with a Loom of a working store.</p>
          <p>
            You&apos;ll get 2–4 replies and probably one call.{" "}
            <strong>That call is worth more than everything else on this board</strong> — it&apos;s
            the only thing here that produces information you don&apos;t already have.
          </p>
          <p>The product is finished.</p>
        </Note>
      </div>

      <p className="mx-auto mt-1 hidden max-w-[1180px] text-xs font-semibold text-text-muted lg:block">
        Drag any note to move it · “Tidy board” springs them home
      </p>
    </div>
  );
}

function Note({
  tilt,
  paper,
  tag,
  title,
  children,
}: {
  tilt: number;
  paper: string;
  tag?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      data-note
      data-tilt={tilt}
      style={{
        opacity: 0,
        transform: `rotate(${tilt}deg)`,
        background: `linear-gradient(168deg, rgba(255,255,255,.5), rgba(255,255,255,0) 46%), ${paper}`,
      }}
      className="group relative mb-7 block break-inside-avoid rounded-sm px-6 pb-6 pt-[30px] text-[#23262f] shadow-[0_1px_2px_rgba(30,34,45,.24),0_8px_16px_-6px_rgba(30,34,45,.3)] will-change-transform lg:mb-11 lg:cursor-grab data-[dragging]:lg:cursor-grabbing data-[lifted]:z-20 data-[lifted]:shadow-[0_3px_8px_rgba(30,34,45,.28),0_30px_50px_-12px_rgba(30,34,45,.42)] [&_p]:mb-2.5 [&_p]:text-[14.5px] [&_p]:leading-[1.62] [&_p]:text-[#4a4e5c] [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-[#23262f]"
    >
      {/* دبوس — the pin, with its own cast shadow on the paper */}
      <span
        aria-hidden="true"
        className="absolute -top-[9px] left-1/2 z-[3] -ml-[8.5px] size-[17px] rounded-full shadow-[0_2px_3px_rgba(0,0,0,.42),inset_0_-1px_2px_rgba(0,0,0,.3)]"
        style={{
          background:
            "radial-gradient(circle at 34% 30%, #ff8b7d, #e2483d 52%, #96241c 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute top-1 left-1/2 z-[2] -ml-[5px] h-2 w-3 rounded-[50%] bg-black/[0.17] blur-[3px]"
      />

      {tag ? (
        <span className="mb-3 inline-block rounded-full bg-black/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.17em] text-black/60">
          {tag}
        </span>
      ) : null}
      {title ? (
        <h2 className="mb-3 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-balance">
          {title}
        </h2>
      ) : null}
      {children}
    </article>
  );
}
