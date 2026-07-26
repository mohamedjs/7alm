"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { useTheme } from "@/features/theme/theme.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";

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

/**
 * Drag is gated to fine pointers only — Motion sets touch-action on
 * draggable elements, and a 12-note pinboard fighting page scroll on
 * mobile is worse than losing the drag toy there. Desktop keeps it.
 * `useSyncExternalStore` (not state-in-effect) avoids both a hydration
 * mismatch and a synchronous setState-in-effect lint violation.
 */
function useCanDrag(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(pointer: fine)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: fine)").matches,
    () => false
  );
}

/**
 * Tiny inline-markup renderer for plan-board copy pulled from the i18n
 * dictionary: `**bold**` becomes `<strong>` (styled by the Note wrapper's
 * `[&_strong]` rule) and `«quoted»` Arabic asides get an explicit
 * `dir="rtl"` span so they render correctly even inside LTR (English) copy.
 */
function richText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|«[^»]+»)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("«") && part.endsWith("»")) {
      return (
        <span key={i} dir="rtl">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function PlanBoard() {
  const wallRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<(NoteHandle | null)[]>([]);
  const wallReduced = useReducedMotion();

  const { theme, toggleTheme } = useTheme("store-theme");
  const { t, locale, setLocale } = useLocale();
  const [copied, setCopied] = useState(false);
  const canDrag = useCanDrag();

  /** Shorthand: dictionary lookup wrapped through `richText`. */
  const rt = useCallback((key: DictKey) => richText(t(key)), [t]);

  const tidy = useCallback(() => {
    noteRefs.current.forEach((note, i) => {
      window.setTimeout(() => note?.tidy(), i * 26);
    });
  }, []);

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
            {t("store.plan.meta.eyebrow")}
          </p>
          <h1 className="text-[clamp(2rem,6vw,4.2rem)] font-black leading-[0.92] tracking-[-0.035em] text-balance">
            {t("store.plan.meta.headline1")}
            <br />
            <span className="text-brand-500">{t("store.plan.meta.headline2")}</span>
          </h1>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              aria-label={t("store.plan.action.language")}
              className="neu-raised inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary transition-transform active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.8-3.8-9s1.3-6.4 3.8-9Z" />
              </svg>
              {locale === "ar" ? "EN" : "AR"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("store.plan.action.themeToggleAria")}
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
              {theme === "dark" ? t("store.plan.action.light") : t("store.plan.action.dark")}
            </button>

            <button
              type="button"
              onClick={tidy}
              className="neu-raised hidden items-center gap-2 rounded-full bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary transition-transform active:scale-95 lg:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7h18M6 12h12M9 17h6" />
              </svg>
              {t("store.plan.action.tidy")}
            </button>
          </div>

          <div className="text-end">
            <div className="text-[clamp(1.4rem,3.4vw,2.2rem)] font-black leading-none tracking-[-0.03em] tabular-nums">
              {t("store.plan.target.amount")}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("store.plan.target.label")}
            </div>
          </div>
        </div>
      </header>

      {/* the wall — staggered spring reveal once it scrolls into view */}
      <motion.div
        ref={wallRef}
        className="mx-auto max-w-[1180px] gap-x-5 [column-count:1] sm:[column-count:2] lg:gap-x-8 lg:[column-count:3]"
        initial={wallReduced ? false : "hidden"}
        whileInView={wallReduced ? undefined : "show"}
        viewport={{ once: true, amount: 0.06 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
      >
        <Note
          ref={(el) => { noteRefs.current[0] = el; }}
          tilt={-1.6}
          paper={PAPER.canary}
          tag={t("store.plan.note1.tag")}
          title={t("store.plan.note1.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{t("store.plan.note1.p1")}</p>
          <div className="my-3.5 grid gap-2">
            <div className="flex items-baseline justify-between gap-3 rounded-[3px] bg-black/[0.07] px-3 py-2.5 shadow-[inset_3px_0_0_#1f8f4e]">
              <b className="font-extrabold tabular-nums">{t("store.plan.note1.row1.amount")}</b>
              <span className="text-end text-[12.5px] font-semibold text-black/60">
                {t("store.plan.note1.row1.note")}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 rounded-[3px] bg-black/[0.07] px-3 py-2.5 shadow-[inset_3px_0_0_#c62f28]">
              <b className="font-extrabold tabular-nums">{t("store.plan.note1.row2.amount")}</b>
              <span className="text-end text-[12.5px] font-semibold text-black/60">
                {t("store.plan.note1.row2.note")}
              </span>
            </div>
          </div>
          <p>{t("store.plan.note1.p2")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[1] = el; }}
          tilt={2.1}
          paper={PAPER.pink}
          tag={t("store.plan.note2.tag")}
          title={t("store.plan.note2.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{rt("store.plan.note2.p1")}</p>
          <p>{rt("store.plan.note2.p2")}</p>
          <p>{t("store.plan.note2.p3")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[2] = el; }}
          tilt={-1.1}
          paper={PAPER.cyan}
          tag={t("store.plan.note3.tag")}
          title={t("store.plan.note3.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{t("store.plan.note3.p1")}</p>
          <p>{rt("store.plan.note3.p2")}</p>
          <p>{t("store.plan.note3.p3")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[3] = el; }}
          tilt={1.4}
          paper={PAPER.manila}
          tag={t("store.plan.note4.tag")}
          title={t("store.plan.note4.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{t("store.plan.note4.p1")}</p>
          <div className="my-3.5 grid gap-2">
            {[
              { name: t("store.plan.note4.tier.basic"), price: "15,000", star: false },
              { name: t("store.plan.note4.tier.pro"), price: "25,000", star: true },
              { name: t("store.plan.note4.tier.smart"), price: "40,000", star: false },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`flex items-center justify-between gap-3 rounded-[3px] px-3 py-2.5 text-[13.5px] font-semibold ${
                  tier.star
                    ? "bg-black/15 shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.3)]"
                    : "bg-black/[0.07]"
                }`}
              >
                <span>{tier.name}</span>
                <b className="font-extrabold tabular-nums">{tier.price}</b>
              </div>
            ))}
          </div>
          <p>
            {richText(
              t("store.plan.note4.p2")
                .replace("{pro}", t("store.plan.note4.tier.pro"))
                .replace("{smart}", t("store.plan.note4.tier.smart")),
            )}
          </p>
          <p>{rt("store.plan.note4.p3")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[4] = el; }}
          tilt={-2.2}
          paper={PAPER.lime}
          tag={t("store.plan.note5.tag")}
          title={t("store.plan.note5.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{rt("store.plan.note5.p1")}</p>
          <p>{rt("store.plan.note5.p2")}</p>
          <p>{rt("store.plan.note5.p3")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[5] = el; }}
          tilt={1.9}
          paper={PAPER.manila}
          tag={t("store.plan.note6.tag")}
          title={t("store.plan.note6.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <table className="mt-3.5 w-full border-collapse font-mono text-[13px] tabular-nums">
            <tbody>
              {[
                [t("store.plan.note6.row1.label"), "500,000"],
                [t("store.plan.note6.row2.label"), "240,000"],
                [t("store.plan.note6.row3.label"), "170,000"],
                [t("store.plan.note6.row4.label"), "100,000"],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="border-b border-dashed border-black/15 py-1.5">{label}</td>
                  <td className="border-b border-dashed border-black/15 py-1.5 text-end font-bold">
                    {value}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border-t-2 border-black/30 pt-2.5 text-[15px] font-extrabold">
                  {t("store.plan.note6.total.label")}
                </td>
                <td className="border-t-2 border-black/30 pt-2.5 text-end text-[15px] font-extrabold">
                  1,010,000
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3.5">{rt("store.plan.note6.p1")}</p>
          <p>{t("store.plan.note6.p2")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[6] = el; }}
          tilt={-1.3}
          paper={PAPER.violet}
          tag={t("store.plan.note7.tag")}
          title={t("store.plan.note7.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            {[
              [t("store.plan.note7.item1.name"), t("store.plan.note7.item1.detail")],
              [t("store.plan.note7.item2.name"), t("store.plan.note7.item2.detail")],
              [t("store.plan.note7.item3.name"), t("store.plan.note7.item3.detail")],
            ].map(([name, detail]) => (
              <li key={name} className="relative ps-5 text-sm leading-normal text-[#4a4e5c]">
                <span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />
                <strong>{name}</strong> — {detail}
              </li>
            ))}
          </ul>
          <p className="mt-3">{rt("store.plan.note7.p1")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[7] = el; }}
          tilt={2.4}
          paper={PAPER.orange}
          tag={t("store.plan.note8.tag")}
          title={t("store.plan.note8.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{t("store.plan.note8.p1")}</p>
          <p>{rt("store.plan.note8.p2")}</p>
          <p>{rt("store.plan.note8.p3")}</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[8] = el; }}
          tilt={-1.7}
          paper={PAPER.manila}
          tag={t("store.plan.note9.tag")}
          title={t("store.plan.note9.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{rt("store.plan.note9.p1")}</p>
          <p>{rt("store.plan.note9.p2")}</p>
        </Note>

        {/* the working tool */}
        <Note
          ref={(el) => { noteRefs.current[9] = el; }}
          tilt={1.2}
          paper={PAPER.cyan}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-balance">
              {t("store.plan.note10.title")}
            </h2>
            <button
              type="button"
              onClick={copyDm}
              aria-label={t("store.plan.note10.copy.ariaLabel")}
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
              {copied ? t("store.plan.note10.copy.copied") : t("store.plan.note10.copy.copy")}
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
            {rt("store.plan.note10.caption")}
          </p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[10] = el; }}
          tilt={-2.4}
          paper={PAPER.pink}
          tag={t("store.plan.note11.tag")}
          title={t("store.plan.note11.title")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>{t("store.plan.note11.p1")}</p>
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            {(
              [
                "store.plan.note11.item1",
                "store.plan.note11.item2",
                "store.plan.note11.item3",
                "store.plan.note11.item4",
              ] as const
            ).map((key) => (
              <li key={key} className="relative ps-5 text-sm leading-normal text-[#4a4e5c]">
                <span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />
                {rt(key)}
              </li>
            ))}
          </ul>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[11] = el; }}
          tilt={1.7}
          paper={PAPER.canary}
          tag={t("store.plan.note12.tag")}
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <div className="my-1.5 text-[46px] font-black leading-none tracking-[-0.04em] tabular-nums">
            {t("store.plan.note12.bigNumber")}
          </div>
          <h2 className="mb-3 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-balance">
            {t("store.plan.note12.title")}
          </h2>
          <p>{t("store.plan.note12.p1")}</p>
          <p>{rt("store.plan.note12.p2")}</p>
          <p>{t("store.plan.note12.p3")}</p>
        </Note>
      </motion.div>

      <p className="mx-auto mt-1 hidden max-w-[1180px] text-xs font-semibold text-text-muted lg:block">
        {t("store.plan.footer.hint")}
      </p>
    </div>
  );
}

interface NoteHandle {
  /** Springs the note back to its resting slot and tilt. */
  tidy: () => void;
}

interface NoteProps {
  tilt: number;
  paper: string;
  tag?: string;
  title?: string;
  canDrag: boolean;
  dragConstraints: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

const Note = forwardRef<NoteHandle, NoteProps>(function Note(
  { tilt, paper, tag, title, canDrag, dragConstraints, children },
  ref
) {
  const prefersReducedMotion = useReducedMotion();
  const [isDragging, setIsDragging] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Settable rest angle — hover straightens it toward 0, drag/tidy/leave
  // spring it back to `tilt`. Combined with the velocity-driven wobble
  // below into a single `rotate` value bound to the element.
  const baseRotate = useSpring(tilt, { stiffness: 220, damping: 18 });
  const xVelocity = useVelocity(x);
  const velocityRotate = useTransform(xVelocity, [-1200, 0, 1200], [-14, 0, 14], { clamp: true });
  const rotate: MotionValue<number> | number = useTransform(
    [baseRotate, velocityRotate],
    (latest) => (latest as number[])[0] + (latest as number[])[1]
  );

  useImperativeHandle(ref, () => ({
    tidy() {
      animate(x, 0, { type: "spring", stiffness: 260, damping: 24 });
      animate(y, 0, { type: "spring", stiffness: 260, damping: 24 });
      baseRotate.set(tilt);
    },
  }));

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: -52, scale: 0.93 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 22 } },
      }}
      style={{
        x,
        y,
        rotate: prefersReducedMotion ? tilt : rotate,
        background: `linear-gradient(168deg, rgba(255,255,255,.5), rgba(255,255,255,0) 46%), ${paper}`,
      }}
      drag={canDrag}
      dragConstraints={dragConstraints}
      dragElastic={prefersReducedMotion ? 0 : 0.12}
      dragMomentum={!prefersReducedMotion}
      dragTransition={{ power: 0.3, timeConstant: 200, bounceStiffness: 400, bounceDamping: 24 }}
      onHoverStart={() => !isDragging && baseRotate.set(tilt * 0.18)}
      onHoverEnd={() => !isDragging && baseRotate.set(tilt)}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setIsDragging(false);
        baseRotate.set(tilt);
      }}
      whileHover={{
        scale: 1.02,
        zIndex: 20,
        boxShadow: "0 2px 4px rgba(30,34,45,.26), 0 20px 40px -14px rgba(30,34,45,.38)",
      }}
      whileDrag={{
        scale: 1.045,
        zIndex: 30,
        boxShadow: "0 3px 8px rgba(30,34,45,.28), 0 30px 50px -12px rgba(30,34,45,.42)",
      }}
      className={`group relative mb-7 block break-inside-avoid rounded-sm px-6 pb-6 pt-[30px] text-[#23262f] shadow-[0_1px_2px_rgba(30,34,45,.24),0_8px_16px_-6px_rgba(30,34,45,.3)] will-change-transform lg:mb-11 [&_p]:mb-2.5 [&_p]:text-[14.5px] [&_p]:leading-[1.62] [&_p]:text-[#4a4e5c] [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-[#23262f] ${
        canDrag ? "lg:cursor-grab" : ""
      } ${isDragging ? "lg:cursor-grabbing" : ""}`}
    >
      {/* دبوس — the pin. Lifts and its shadow widens while the note is
          being dragged, as if it were pulled out of the board. */}
      <motion.span
        aria-hidden="true"
        animate={prefersReducedMotion ? undefined : { scale: isDragging ? 1.35 : 1, y: isDragging ? -3 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="absolute -top-[9px] start-1/2 z-[3] -ms-[8.5px] size-[17px] rounded-full shadow-[0_2px_3px_rgba(0,0,0,.42),inset_0_-1px_2px_rgba(0,0,0,.3)]"
        style={{
          background: "radial-gradient(circle at 34% 30%, #ff8b7d, #e2483d 52%, #96241c 100%)",
        }}
      />
      <motion.span
        aria-hidden="true"
        animate={prefersReducedMotion ? undefined : { scaleX: isDragging ? 1.7 : 1, opacity: isDragging ? 0.24 : 0.17 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute top-1 start-1/2 z-[2] -ms-[5px] h-2 w-3 rounded-[50%] bg-black blur-[3px]"
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
    </motion.article>
  );
});
