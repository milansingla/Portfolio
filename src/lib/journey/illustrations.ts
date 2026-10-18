import gsap from "gsap";
import type { IllustrationId } from "./data";

/**
 * One-shot activation timelines for the five milestone illustrations.
 *
 * The markup is always the *finished* drawing. `prepare()` puts it into its
 * pre-story state, `activate()` plays it into the finished state, and
 * `finalize()` clears every inline style so the markup is authoritative again
 * (reduced motion, replays, resize, errors).
 */

type Geo = SVGGeometryElement;
const q = (r: Element, s: string) => r.querySelector<SVGElement>(s)!;
const qa = (r: Element, s: string) => Array.from(r.querySelectorAll<SVGElement>(s));

function hide(el: SVGElement) {
  const g = el as unknown as Geo;
  const L = g.getTotalLength?.() ?? 0;
  el.style.strokeDasharray = `${L}`;
  el.style.strokeDashoffset = `${L}`;
}
function clearDash(els: SVGElement[]) {
  els.forEach((e) => {
    e.style.strokeDasharray = "";
    e.style.strokeDashoffset = "";
  });
}
const draw = (tl: gsap.core.Timeline, els: SVGElement | SVGElement[], pos: gsap.Position, dur: number, stagger = 0, ease = "power1.inOut") =>
  tl.to(els, { strokeDashoffset: 0, duration: dur, ease, stagger }, pos);

/** Everything these timelines might touch, for cleanup. */
function everything(root: Element) {
  return Array.from(root.querySelectorAll<SVGElement>("*"));
}

/* ───────────────── 01 · foundations ───────────────── */

const SCATTER: Array<{ x: number; y: number; rotation: number }> = [
  { x: -34, y: 0, rotation: -16 },
  { x: 30, y: 0, rotation: 14 },
  { x: -62, y: 0, rotation: 22 },
  { x: 74, y: 44, rotation: 28 },
  { x: -70, y: 44, rotation: -20 },
];

function prepFoundations(r: Element) {
  gsap.set(q(r, "[data-part=base]"), { opacity: 0, y: 10 });
  gsap.set(q(r, "[data-part=lid]"), { scaleY: 0.04, svgOrigin: "155 266" });
  gsap.set(q(r, "[data-part=screen]"), { opacity: 0 });
  qa(r, "[data-block]").forEach((b, i) => gsap.set(b, SCATTER[i]));
}
function playFoundations(r: Element) {
  const tl = gsap.timeline();
  tl.to(q(r, "[data-part=base]"), { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, 0);
  tl.to(q(r, "[data-part=lid]"), { scaleY: 1, duration: 0.8, ease: "back.out(1.15)" }, 0.35);
  tl.to(q(r, "[data-part=screen]"), { opacity: 1, duration: 0.3 }, 1.0);
  const lines = qa(r, "[data-part=screen] path");
  lines.forEach(hide);
  draw(tl, lines, 1.0, 0.5, 0.12);
  // the blocks tidy themselves once the laptop is open
  tl.to(qa(r, "[data-block]"), { x: 0, y: 0, rotation: 0, duration: 0.7, ease: "back.out(1.5)", stagger: 0.09 }, 1.35);
  tl.add(() => clearDash(lines));
  return tl;
}

/* ───────────────── 02 · full-stack ───────────────── */

function prepFullStack(r: Element) {
  ["browser", "backend", "database"].forEach((n) => gsap.set(q(r, `[data-part=${n}]`), { opacity: 0, y: 22 }));
  qa(r, ".ill-wire").forEach(hide);
  gsap.set(q(r, "[data-part=packet]"), { opacity: 0 });
}
function playFullStack(r: Element) {
  const tl = gsap.timeline();
  const parts = ["browser", "backend", "database"].map((n) => q(r, `[data-part=${n}]`));
  tl.to(parts, { opacity: 1, y: 0, duration: 0.55, ease: "back.out(1.3)", stagger: 0.18 }, 0);
  const wires = qa(r, ".ill-wire");
  draw(tl, wires[0], 0.9, 0.4);
  draw(tl, wires[1], 1.25, 0.5);
  // a little data travels the wires: the three parts become one product
  const packet = q(r, "[data-part=packet]");
  const geo = wires as unknown as Geo[];
  const o = { p: 0 };
  tl.set(packet, { opacity: 1 }, 1.8);
  tl.to(
    o,
    {
      p: 1,
      duration: 1.0,
      ease: "power1.inOut",
      onUpdate: () => {
        const a = geo[0].getTotalLength();
        const b = geo[1].getTotalLength();
        const d = o.p * (a + b);
        const w = d < a ? geo[0] : geo[1];
        const at = d < a ? d : d - a;
        const pt = w.getPointAtLength(at);
        packet.setAttribute("cx", String(pt.x));
        packet.setAttribute("cy", String(pt.y));
      },
    },
    1.8,
  );
  tl.to(packet, { opacity: 0, duration: 0.25 }, 2.7);
  tl.to(parts, { y: -4, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.06, ease: "sine.inOut" }, 2.6);
  tl.add(() => clearDash(wires));
  return tl;
}

/* ───────────────── 03 · experiments ───────────────── */

const UNLIT = { fill: "#ece5d6", stroke: "#14110f" };
const LIT = { fill: "rgba(31,61,255,0.12)", stroke: "#1f3dff" };

function prepExperiments(r: Element) {
  gsap.set(q(r, "[data-part=laptop]"), { opacity: 0, x: -14 });
  hide(q(r, "[data-part=wire]"));
  qa(r, "[data-link]").forEach(hide);
  qa(r, "[data-node]").forEach((n) => gsap.set(n, { scale: 0, ...UNLIT, transformOrigin: "50% 50%" }));
}
function playExperiments(r: Element) {
  const tl = gsap.timeline();
  tl.to(q(r, "[data-part=laptop]"), { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0);
  draw(tl, q(r, "[data-part=wire]"), 0.35, 0.6);
  const layer = (n: string) => qa(r, `[data-node=${n}]`);
  const link = (n: string) => qa(r, `[data-link=${n}]`);
  tl.to(layer("input"), { scale: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.08 }, 0.7);
  draw(tl, link("a"), 1.05, 0.5, 0.025);
  tl.to(layer("hidden"), { scale: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.07 }, 1.2);
  draw(tl, link("b"), 1.6, 0.5, 0.03);
  tl.to(layer("output"), { scale: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.08 }, 1.75);
  // the network wakes up, layer by layer, and settles lit
  ["input", "hidden", "output"].forEach((n, i) => {
    tl.to(layer(n), { ...LIT, duration: 0.3, stagger: 0.05 }, 2.3 + i * 0.28);
    tl.to(layer(n), { scale: 1.18, duration: 0.14, yoyo: true, repeat: 1, ease: "sine.inOut", stagger: 0.05 }, 2.3 + i * 0.28);
  });
  tl.add(() => clearDash([...qa(r, "[data-link]"), q(r, "[data-part=wire]")]));
  return tl;
}

/* ───────────────── 04 · product ───────────────── */

function prepProduct(r: Element) {
  qa(r, "[data-step]").forEach((s) => gsap.set(s, { opacity: 0, y: -14 }));
  qa(r, "[data-arrow]").forEach(hide);
  gsap.set(q(r, "[data-piece=base]"), { x: -80, y: 26, rotation: -18, opacity: 0 });
  gsap.set(q(r, "[data-piece=screen]"), { x: 70, y: -30, rotation: 22, opacity: 0 });
  gsap.set(q(r, "[data-piece=lines]"), { opacity: 0 });
  gsap.set(q(r, "[data-piece=dot]"), { scale: 0, opacity: 0 });
  gsap.set(q(r, "[data-part=second]"), { opacity: 0, x: 44 });
}
function playProduct(r: Element) {
  const tl = gsap.timeline();
  tl.to(q(r, "[data-part=second]"), { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }, 0);
  tl.to(q(r, "[data-piece=base]"), { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.3)" }, 0.5);
  tl.to(q(r, "[data-piece=screen]"), { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.7, ease: "back.out(1.3)" }, 0.75);
  tl.to(q(r, "[data-piece=lines]"), { opacity: 1, duration: 0.3 }, 1.3);
  tl.to(q(r, "[data-piece=dot]"), { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, 1.4);
  const steps = qa(r, "[data-step]");
  const arrows = qa(r, "[data-arrow]");
  tl.to(steps, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.3 }, 1.2);
  draw(tl, arrows[0], 1.6, 0.35);
  draw(tl, arrows[1], 1.9, 0.35);
  tl.add(() => clearDash(arrows));
  return tl;
}

/* ───────────────── 05 · what's next ───────────────── */

function prepNext(r: Element) {
  const page = q(r, "[data-part=page]");
  hide(page);
  gsap.set(q(r, "[data-part=edge]"), { opacity: 0 });
  const lines = qa(r, "[data-part=text] path");
  lines.forEach(hide);
  gsap.set(q(r, "[data-part=next]"), { opacity: 0 });
}
function playNext(r: Element) {
  const tl = gsap.timeline();
  draw(tl, q(r, "[data-part=page]"), 0, 1.0);
  tl.to(q(r, "[data-part=edge]"), { opacity: 1, duration: 0.5 }, 0.9);
  const lines = qa(r, "[data-part=text] path");
  draw(tl, lines, 0.7, 0.55, 0.14);
  tl.to(q(r, "[data-part=next]"), { opacity: 1, duration: 0.7, ease: "power1.inOut" }, 1.8);
  tl.add(() => clearDash([q(r, "[data-part=page]"), ...lines]));
  return tl;
}

/* ───────────────── dispatch ───────────────── */

const TABLE: Record<IllustrationId, { prep: (r: Element) => void; play: (r: Element) => gsap.core.Timeline }> = {
  foundations: { prep: prepFoundations, play: playFoundations },
  fullstack: { prep: prepFullStack, play: playFullStack },
  experiments: { prep: prepExperiments, play: playExperiments },
  product: { prep: prepProduct, play: playProduct },
  next: { prep: prepNext, play: playNext },
};

export function prepareIllustration(id: IllustrationId, root: Element) {
  TABLE[id].prep(root);
}
export function activateIllustration(id: IllustrationId, root: Element) {
  return TABLE[id].play(root);
}
/** Back to the authored, finished markup. */
export function finalizeIllustration(root: Element) {
  const all = everything(root);
  gsap.killTweensOf(all);
  all.forEach((e) => {
    e.style.strokeDasharray = "";
    e.style.strokeDashoffset = "";
  });
  gsap.set(all, { clearProps: "all" });
}
