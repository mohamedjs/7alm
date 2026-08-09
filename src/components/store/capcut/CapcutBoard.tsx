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

const PAPER = {
  canary: "#ffe45e",
  pink: "#ff8fbe",
  cyan: "#7ce0e4",
  lime: "#bfe86e",
  manila: "#f2ead3",
  orange: "#ffb26b",
  violet: "#c3aef5",
} as const;

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

export default function CapcutBoard() {
  const wallRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<(NoteHandle | null)[]>([]);
  const wallReduced = useReducedMotion();

  const { theme, toggleTheme } = useTheme("store-theme");
  const canDrag = useCanDrag();

  const tidy = useCallback(() => {
    noteRefs.current.forEach((note, i) => {
      window.setTimeout(() => note?.tidy(), i * 26);
    });
  }, []);

  return (
    <div className="min-h-screen bg-surface px-4 pb-28 pt-6 text-text-primary sm:px-8 lg:px-11 lg:pt-14 font-sans" dir="ltr">
      {/* masthead */}
      <header className="mx-auto mb-8 flex max-w-[1180px] flex-wrap items-end justify-between gap-6 border-b border-text-muted/20 pb-6 lg:mb-12">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
            CapCut Template Instruction
          </p>
          <h1 className="text-[clamp(2rem,6vw,4.2rem)] font-black leading-[0.92] tracking-[-0.035em] text-balance">
            "Split Explainer"
            <br />
            <span className="text-brand-500">Reel (nick_saraev style)</span>
          </h1>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleTheme}
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
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            <button
              type="button"
              onClick={tidy}
              className="neu-raised hidden items-center gap-2 rounded-full bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-primary transition-transform active:scale-95 lg:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7h18M6 12h12M9 17h6" />
              </svg>
              Tidy Board
            </button>
          </div>
        </div>
      </header>

      {/* the wall */}
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
          tag="OVERVIEW"
          title="What the layout actually is"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p>A 9:16 vertical frame split into two zones:</p>
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" /><strong>Top panel (~0–45%)</strong> — White background + serif example text with yellow/pink highlights + red pill tag labels</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" /><strong>Headline (~40–48%)</strong> — Big bold black sans-serif text, reveals word-by-word</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" /><strong>Bottom video (~48–100%)</strong> — Talking-head webcam clip, rounded corners, plain wall background</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" /><strong>Captions (~85%)</strong> — Bold auto-captions over the video</li>
          </ul>
          <p className="mt-3">The whole thing sits on a <strong>white</strong> canvas — not black. That's what makes it look clean.</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[1] = el; }}
          tilt={2.1}
          paper={PAPER.pink}
          tag="STEP 1"
          title="Create the project & set the canvas"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li>Open CapCut → <strong>New project</strong>.</li>
            <li>Bottom-right of the Player window, click the <strong>Ratio</strong> button (shows "Original").</li>
            <li>Choose <strong>9:16</strong>.</li>
            <li>Player menu (☰ icon, top-right of Player) → <strong>Resolution: 1080P</strong>, <strong>Frame rate: 30fps</strong>.</li>
          </ol>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[2] = el; }}
          tilt={-1.1}
          paper={PAPER.cyan}
          tag="STEP 2"
          title="Make the background white"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li>Timeline is empty — first drag ANY clip in so the background option unlocks.</li>
            <li>Select the clip on the timeline.</li>
            <li>Right panel → <strong>Video</strong> tab → scroll to <strong>Background</strong>.</li>
            <li>Choose <strong>Color</strong> → pick pure <strong>white (#FFFFFF)</strong>.</li>
            <li>Click <strong>Apply to all</strong> so every clip inherits it.</li>
          </ol>
          <div className="mt-3 rounded-[3px] bg-black/[0.07] px-3 py-2.5 text-[12.5px] font-semibold text-black/70 border-s-4 border-black/20">
            <strong>Template Tip:</strong> Media → Library → search "white" and drag a solid white image to track 1, stretched to your full video length.
          </div>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[3] = el; }}
          tilt={1.4}
          paper={PAPER.manila}
          tag="STEP 3"
          title="Place the talking-head video"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li>Drag your webcam clip onto the timeline <strong>above</strong> the white background track.</li>
            <li>Select it → right panel → <strong>Video → Basic → Position & Size</strong>.</li>
            <li>Set <strong>Scale to ~55–60%</strong>.</li>
            <li>Set <strong>Position Y</strong> so the clip sits in the <strong>bottom half</strong> (top edge ~48–50% down the frame).</li>
            <li><strong>Rounded corners:</strong> right panel → <strong>Video → Mask</strong> → choose <strong>Rectangle</strong> → drag corner-radius to ~30–40px.</li>
          </ol>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[4] = el; }}
          tilt={-2.2}
          paper={PAPER.lime}
          tag="STEP 4"
          title="Build the top white panel"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p><strong>Option A (in CapCut):</strong></p>
          <ul className="mt-2 mb-3 grid list-none gap-2.5 p-0">
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Toolbar → <strong>Shape</strong> icon → add a <strong>Rectangle</strong>.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Set fill to <strong>white</strong>, no border.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Resize to cover top ~45%.</li>
          </ul>
          <p><strong>Option B (recommended):</strong></p>
          <ul className="mt-2 grid list-none gap-2.5 p-0">
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />In Canva/Figma, make a 1080×900px white image.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Type paragraph in a <strong>serif font</strong>.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Add highlights and tags there.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Export as <strong>PNG</strong> → import to CapCut.</li>
          </ul>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[5] = el; }}
          tilt={1.9}
          paper={PAPER.violet}
          tag="STEP 5"
          title="The example paragraph with highlights"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li><strong>Text → Default text</strong> → drag above the panel.</li>
            <li>Style: <strong>serif font</strong>, black, size ~small, <strong>centered</strong>, generous line spacing.</li>
            <li><strong>The highlights:</strong> Add a thin <strong>Rectangle</strong> shape, fill pale yellow (<code>#FFF3B0</code>) or pale pink (<code>#FFD6D6</code>), set <strong>Opacity ~70%</strong> on a track <em>below</em> the text.</li>
          </ol>
          <div dir="ltr" className="mt-3 rounded bg-white/50 px-4 py-4 text-[13px] leading-[1.8] text-[#23262f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.09)] font-serif italic text-center">
            It's important to note that<br/>most AI writing follows a familiar shape.<br/>It leans on a stray em dash<br/>— dropped in for effect —<br/>or a line that<br/>offers a unique perspective without saying anything at all.
          </div>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[6] = el; }}
          tilt={-1.3}
          paper={PAPER.orange}
          tag="STEP 6"
          title="The red pill tag labels"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li><strong>Shape → Rounded Rectangle</strong> → fill <strong>red/crimson</strong>, no border.</li>
            <li>Make it small and wide — a pill, roughly 180×36px.</li>
            <li><strong>Text → Default text</strong> on top → <strong>ALL CAPS</strong>, <strong>bold sans-serif</strong>, <strong>white</strong>, very small size.</li>
            <li>Group them near the phrase.</li>
            <li><strong>Connector line:</strong> thin Line shape in same red, from pill to phrase.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <span className="bg-[#D62839] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">UNNECESSARY INTRO</span>
            <span className="bg-[#D62839] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">EM DASH</span>
            <span className="bg-[#D62839] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">FAKE INSIGHT</span>
          </div>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[7] = el; }}
          tilt={2.4}
          paper={PAPER.canary}
          tag="STEP 7"
          title="The big headline word-by-word"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li><strong>Text → Default text</strong> → middle band.</li>
            <li>Font: <strong>bold geometric sans-serif</strong> (Poppins, Montserrat). Black. Large.</li>
            <li>Type headline, e.g. <code>the unnecessary intro</code></li>
            <li><strong>Animation → In</strong> → <strong>Typewriter</strong> / <strong>Word by word</strong>. Duration ~0.8–1.2s.</li>
          </ol>
          <p className="mt-3 text-sm text-[#4a4e5c]"><strong>Pro version:</strong> Create separate text layers per word, stagger start times by 0.35s, fast <strong>Fade In</strong>.</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[8] = el; }}
          tilt={-1.7}
          paper={PAPER.pink}
          tag="STEP 8"
          title="Captions on the video"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
           <ol className="mt-3 grid gap-2.5 p-0 ps-5 text-sm leading-normal text-[#4a4e5c] list-decimal">
            <li><strong>Text → Auto captions</strong> → <strong>Generate</strong>.</li>
            <li>Style: <strong>bold sans-serif</strong>, <strong>white</strong>, black stroke 2–4px.</li>
            <li>Position near <strong>bottom third</strong> (~85%).</li>
            <li>Reduce <strong>max characters per line</strong> for short chunks (1-2 words).</li>
            <li>Optional: highlight color (yellow).</li>
          </ol>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[9] = el; }}
          tilt={1.2}
          paper={PAPER.cyan}
          tag="STEP 9"
          title="Timing & pacing"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Total length: <strong>20–45 seconds</strong>.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" /><strong>First 2 seconds</strong> must show the headline + the panel already visible. No slow intro.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Cut out every pause: select audio → <strong>Auto-cut silences</strong>.</li>
            <li className="relative ps-5 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-2 size-1.5 rounded-full bg-black/40" />Add a <strong>very subtle zoom</strong> on the talking-head clip: <strong>Animation → Group animation → Slow zoom in</strong>.</li>
          </ul>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[10] = el; }}
          tilt={-2.4}
          paper={PAPER.lime}
          tag="STEP 10"
          title="Reusable template options"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <p><strong>1. Duplicate project:</strong> Home screen → Right-click project → Duplicate.</p>
          <p className="mt-2"><strong>2. Save presets:</strong> Select styled text → right panel → <strong>Save as preset</strong> (bookmark icon).</p>
          <p className="mt-2"><strong>3. Assets folder:</strong> Keep Canva/Figma source file for the top panel, re-export PNGs per video.</p>
        </Note>

        <Note
          ref={(el) => { noteRefs.current[11] = el; }}
          tilt={1.7}
          paper={PAPER.manila}
          tag="CHECKLIST"
          title="Quick Export Checklist"
          canDrag={canDrag}
          dragConstraints={wallRef}
        >
          <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-black/10">
            <span className="font-bold text-[13px]">Resolution / FPS</span>
            <span className="bg-black/10 px-2 py-1 rounded text-xs font-mono font-bold">1080P @ 30</span>
          </div>
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            <li className="relative ps-7 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-0.5 text-[#14803f] font-bold text-lg">✓</span>Duplicate template project</li>
            <li className="relative ps-7 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-0.5 text-[#14803f] font-bold text-lg">✓</span>Replace talking-head clip, re-apply mask</li>
            <li className="relative ps-7 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-0.5 text-[#14803f] font-bold text-lg">✓</span>Update panel text + tags</li>
            <li className="relative ps-7 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-0.5 text-[#14803f] font-bold text-lg">✓</span>Retype headline, re-time reveal</li>
            <li className="relative ps-7 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-0.5 text-[#14803f] font-bold text-lg">✓</span>Regenerate auto-captions</li>
            <li className="relative ps-7 text-sm leading-normal text-[#4a4e5c]"><span className="absolute start-1 top-0.5 text-[#14803f] font-bold text-lg">✓</span>Trim silences</li>
          </ul>
        </Note>
      </motion.div>
    </div>
  );
}

interface NoteHandle {
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
