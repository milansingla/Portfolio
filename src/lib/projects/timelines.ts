import gsap from "gsap";
import { Rig } from "../stickman/rig";
import { stick } from "../stickman/poses";
import { mover } from "../stickman/mover";
import type { ProjectId } from "./data";

/**
 * Scroll-scrubbed timelines for the four chapter drawings.
 *
 * Each builder takes the *finished* markup, puts it into its opening state, and
 * returns a paused timeline of 10 seconds-of-story. The controller maps scroll
 * position to timeline progress, so the story plays forward and backward
 * exactly with the page.
 *
 * Rules kept throughout:
 *   - transforms that gsap would have to parse from SVG attributes (the box,
 *     lid and lever) are driven by plain state objects and written by hand;
 *   - nothing is a free-running tween: everything lives on the timeline;
 *   - every builder registers how to undo itself, so cleanup restores the page.
 */

export interface Ctx {
  id: ProjectId;
  article: HTMLElement;
  svg: SVGSVGElement;
  screen: HTMLElement;
  figEls: HTMLElement[];
  rigs: Rig[];
  restore: Array<() => void>;
}

type Tl = gsap.core.Timeline;
const DUR = 10;

const hold = stick.pencil.hold;

/* ───────── helpers ───────── */

const mk = (c: Ctx) => ({
  q: <T extends Element = SVGElement>(sel: string) => c.svg.querySelector<T>(sel)!,
  qa: <T extends Element = SVGElement>(sel: string) => Array.from(c.svg.querySelectorAll<T>(sel)),
});

function hide(c: Ctx, el: SVGElement) {
  const g = el as unknown as SVGGeometryElement;
  const L = g.getTotalLength?.() ?? 0;
  el.style.strokeDasharray = `${L}`;
  el.style.strokeDashoffset = `${L}`;
  c.restore.push(() => {
    el.style.strokeDasharray = "";
    el.style.strokeDashoffset = "";
  });
}
const draw = (tl: Tl, els: SVGElement | SVGElement[], pos: number, dur: number, stagger = 0, ease = "power1.inOut") =>
  tl.to(els, { strokeDashoffset: 0, duration: dur, ease, stagger }, pos);

/** Writes a transform attribute from state and remembers the original. */
function attrDriver(c: Ctx, el: SVGElement, fn: () => string) {
  const orig = el.getAttribute("transform");
  c.restore.push(() => (orig === null ? el.removeAttribute("transform") : el.setAttribute("transform", orig)));
  return () => el.setAttribute("transform", fn());
}

/** A stickman that moves by percentages of its drawing, turning to face where it goes. */
function figure(c: Ctx, k: number, start: { l: number; t: number }, flipped = false) {
  const el = c.figEls[k];
  const mv = mover(el, el.parentElement as HTMLElement);
  c.restore.push(mv.dispose);
  const s = { l: start.l, t: start.t };
  let last = s.l;
  let facing = flipped;
  const apply = () => {
    mv.write(s.l, s.t);
    const d = s.l - last;
    if (Math.abs(d) > 0.01) facing = d < 0;
    last = s.l;
    el.classList.toggle("is-flipped", facing);
  };
  apply();
  return {
    s,
    move: (tl: Tl, to: { l?: number; t?: number }, pos: number, dur: number, ease = "power1.inOut") =>
      tl.to(s, { ...to, duration: dur, ease, onUpdate: apply }, pos),
    face: (f: boolean) => {
      facing = f;
      el.classList.toggle("is-flipped", f);
    },
  };
}

const pose = (tl: Tl, rig: Rig, name: Parameters<Rig["pose"]>[0], pos: number, dur = 0.5) => tl.add(rig.pose(name, dur), pos);
const penUp = (tl: Tl, rig: Rig, pos: number) =>
  tl.to(rig.s, { pop: 1, px: hold.x, py: hold.y, prot: hold.rot, ps: stick.pencil.scale, duration: 0.25, onUpdate: rig.touch }, pos);
const penDown = (tl: Tl, rig: Rig, pos: number) => tl.to(rig.s, { pop: 0, duration: 0.2, onUpdate: rig.touch }, pos);

function startPose(c: Ctx, k: number, name: Parameters<Rig["snap"]>[0]) {
  c.rigs[k].snap(name);
  c.rigs[k].set({ pop: 0 });
}

/** The interface grows out of the drawing. */
function emerge(c: Ctx, tl: Tl, pos: number, dur: number, origin: string) {
  gsap.set(c.screen, { opacity: 0, scale: 0.86, transformOrigin: origin, clipPath: "inset(30% 30% 30% 30% round 10px)" });
  c.restore.push(() => gsap.set(c.screen, { clearProps: "opacity,transform,clipPath,transformOrigin" }));
  tl.to(c.screen, { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 10px)", duration: dur, ease: "power3.out" }, pos);
}

function pad(tl: Tl) {
  tl.to({}, { duration: 0.001 }, DUR - 0.001);
}

/* ───────── 01 · SHIPYARD ───────── */

function shipyard(c: Ctx): Tl {
  const { q, qa } = mk(c);
  const tl = gsap.timeline({ paused: true });
  const st = { bx: -50, lid: 0, arm: 0 };
  const box = q("[data-p=box]");
  const lid = q("[data-p=lid]");
  const arm = q("[data-p=lever-arm]");
  const apply = (() => {
    const a = attrDriver(c, box, () => `translate(${st.bx} 298)`);
    const b = attrDriver(c, lid, () => `rotate(${st.lid})`);
    const d = attrDriver(c, arm, () => `rotate(${st.arm} 552 292)`);
    return () => (a(), b(), d());
  })();
  apply();

  const belt = qa("[data-p=belt] path");
  belt.forEach((p) => hide(c, p));
  const rollers = qa("[data-p=roller]");
  gsap.set(rollers, { opacity: 0 });
  const stations = [q("[data-p=s1]"), q("[data-p=s2]"), q("[data-p=s3]")];
  gsap.set(stations, { opacity: 0, y: 16 });
  const parts = qa("[data-p=part]");
  const SCATTER = [
    { x: -46, y: -64 },
    { x: 52, y: -72 },
    { x: -18, y: -96 },
    { x: 40, y: -110 },
  ];
  parts.forEach((p, i) => gsap.set(p, { ...SCATTER[i], opacity: 0 }));
  const ind = q("[data-p=ind]");
  const spin = q("[data-p=spin]");
  const tick = q("[data-p=tick]");
  hide(c, tick);
  gsap.set(spin, { opacity: 0 });
  gsap.set(ind, { stroke: "#14110f" });
  const ra = q("[data-p=route-a]");
  hide(c, ra);
  const rb = q("[data-p=route-b]");
  gsap.set(rb, { opacity: 0 });
  const nn = q("[data-p=node-new]");
  const lb = q("[data-p=node-lb]");
  gsap.set([nn, lb], { stroke: "#14110f" });
  const traffic = q("[data-p=traffic]");

  c.restore.push(() => {
    gsap.set([...rollers, ...stations, ...parts, spin, ind, rb, nn, lb, traffic], { clearProps: "all" });
    traffic.removeAttribute("opacity");
    traffic.setAttribute("cx", "471");
    traffic.setAttribute("cy", "206");
  });

  const rig = c.rigs[0];
  startPose(c, 0, "idle");
  const f = figure(c, 0, { l: 8, t: 94 });
  const at = (bx: number) => (bx - 65) / 6.4;

  // the factory is laid out
  draw(tl, belt, 0, 1.2, 0.08);
  tl.to(rollers, { opacity: 1, duration: 0.3, stagger: 0.04 }, 0.5);
  tl.to(stations, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.25 }, 1.0);

  // 01 — build: the box is set on the belt and parts assemble around it
  pose(tl, rig, "pointing", 1.5);
  f.move(tl, { l: 12 }, 1.6, 1.6);
  tl.to(st, { bx: 90, duration: 1.6, ease: "power1.inOut", onUpdate: apply }, 1.6);
  pose(tl, rig, "idle", 3.1);
  f.move(tl, { l: at(171) }, 3.2, 1.4);
  tl.to(st, { bx: 171, duration: 1.4, ease: "power1.inOut", onUpdate: apply }, 3.2);
  tl.to(parts, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: "back.out(1.4)", stagger: 0.18 }, 3.4);

  // 02 — health check: the figure waits while the light is "checking", then healthy
  f.move(tl, { l: at(321) }, 4.8, 0.8);
  tl.to(st, { bx: 321, duration: 0.8, ease: "power1.inOut", onUpdate: apply }, 4.8);
  tl.to(spin, { opacity: 1, duration: 0.2 }, 5.6);
  tl.to(spin, { rotation: 360, transformOrigin: "50% 50%", duration: 1.2, ease: "none" }, 5.6);
  tl.to(spin, { opacity: 0, duration: 0.2 }, 6.8);
  tl.to(ind, { stroke: "#1f3dff", duration: 0.3 }, 6.8);
  draw(tl, tick, 6.8, 0.4, 0, "power2.out");

  // 03 — routing: traffic is directed to the healthy version
  f.move(tl, { l: at(471) }, 7.2, 1.0);
  tl.to(st, { bx: 471, duration: 1.0, ease: "power1.inOut", onUpdate: apply }, 7.2);
  pose(tl, rig, "pointing", 7.9);
  draw(tl, ra, 8.2, 0.6);
  tl.to(rb, { opacity: 1, duration: 0.4 }, 8.4);
  tl.to(lb, { stroke: "#1f3dff", duration: 0.3 }, 8.2);
  tl.to(nn, { stroke: "#1f3dff", duration: 0.3 }, 8.7);
  tl.to(traffic, { opacity: 1, duration: 0.1 }, 8.5);
  tl.to(traffic, { attr: { cx: 449, cy: 262 }, duration: 0.6, ease: "power1.inOut" }, 8.5);
  tl.to(traffic, { opacity: 0, duration: 0.2 }, 9.1);
  tl.to(st, { arm: -38, duration: 0.5, ease: "back.out(2)", onUpdate: apply }, 8.2);

  // done: the box opens onto the real dashboard
  tl.to(st, { lid: -62, duration: 0.5, ease: "back.out(1.6)", onUpdate: apply }, 8.9);
  pose(tl, rig, "waving", 8.9, 0.4);
  emerge(c, tl, 9.1, 0.9, "75% 62%");
  f.move(tl, { l: 13 }, 9.2, 0.8);
  pose(tl, rig, "pointing", 9.5);
  f.move(tl, { l: 14 }, 9.9, 0.1);
  pad(tl);
  return tl;
}

/* ───────── 02 · TERMEDU ───────── */

function termedu(c: Ctx): Tl {
  const { q, qa } = mk(c);
  const tl = gsap.timeline({ paused: true });
  const board = q("[data-p=board]");
  gsap.set(board, { x: -340 });
  const chalk = qa("[data-p=chalk] path");
  chalk.forEach((p) => hide(c, p));
  const desks = qa("[data-p=desk]");
  gsap.set(desks, { opacity: 0, y: -26 });
  const shelfLines = q("[data-p=shelves] > path");
  hide(c, shelfLines);
  const rows = qa("[data-p=books]");
  gsap.set(rows, { opacity: 0 });
  const tray = q("[data-p=tray]");
  const paper = q("[data-p=paper]");
  gsap.set(tray, { opacity: 0 });
  gsap.set(paper, { y: -40 });
  const axes = q("[data-p=chart] > path");
  hide(c, axes);
  const bars = qa("[data-p=bar]");
  gsap.set(bars, { scaleY: 0, transformOrigin: "50% 100%" });
  const trend = q("[data-p=trend]");
  gsap.set(trend, { opacity: 0 });

  c.restore.push(() => gsap.set([board, ...desks, ...rows, tray, paper, ...bars, trend], { clearProps: "all" }));

  const rig = c.rigs[0];
  startPose(c, 0, "idle");
  const f = figure(c, 0, { l: -14, t: 96 });

  // the teacher walks in carrying the board
  f.move(tl, { l: 9 }, 0.2, 1.6, "power2.out");
  tl.to(board, { x: 0, duration: 1.6, ease: "power2.out" }, 0.2);
  pose(tl, rig, "drawing", 1.8, 0.45);
  penUp(tl, rig, 1.8);
  draw(tl, chalk, 1.9, 0.5, 0.5, "power1.inOut");

  // the classroom is built piece by piece
  tl.to(desks, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.5)", stagger: 0.28 }, 3.8);
  draw(tl, shelfLines, 5.0, 0.9);
  tl.to(rows, { opacity: 1, duration: 0.45, stagger: 0.2 }, 5.5);
  tl.to(tray, { opacity: 1, duration: 0.4 }, 6.2);
  tl.to(paper, { y: 0, duration: 0.5, ease: "bounce.out" }, 6.4);
  draw(tl, axes, 7.0, 0.6);
  tl.to(bars, { scaleY: 1, duration: 0.55, ease: "back.out(1.4)", stagger: 0.14 }, 7.4);
  tl.to(trend, { opacity: 1, duration: 0.4 }, 8.0);

  // the last desk is placed, then it points at the finished interface
  penDown(tl, rig, 8.2);
  pose(tl, rig, "pointing", 8.3, 0.5);
  tl.to([q("[data-p=shelves]"), tray, q("[data-p=chart]")], { opacity: 0.28, duration: 0.7 }, 8.9);
  emerge(c, tl, 8.7, 1.2, "70% 66%");
  c.restore.push(() => gsap.set([q("[data-p=shelves]"), q("[data-p=chart]")], { clearProps: "opacity" }));
  pad(tl);
  return tl;
}

/* ───────── 03 · VRxED MEET ───────── */

function meet(c: Ctx): Tl {
  const { q, qa } = mk(c);
  const tl = gsap.timeline({ paused: true });
  const link = q("[data-p=link]");
  hide(c, link);
  const icons = qa("[data-p=icon]");
  gsap.set(icons, { scale: 0, transformOrigin: "50% 50%" });
  const win = q("[data-p=window]");
  gsap.set(win, { opacity: 0, scale: 0.05, svgOrigin: "400 236" });

  c.restore.push(() => gsap.set([...icons, win], { clearProps: "all" }));

  const [ra, rb] = c.rigs;
  startPose(c, 0, "idle");
  startPose(c, 1, "idle");
  const a = figure(c, 0, { l: -10, t: 90 });
  const b = figure(c, 1, { l: 110, t: 90 }, true);

  // two people arrive on either side of the page
  a.move(tl, { l: 11 }, 0.1, 1.3, "power2.out");
  b.move(tl, { l: 89 }, 0.1, 1.3, "power2.out");
  // the left one draws a pencil line toward the right one
  pose(tl, ra, "drawing", 1.4, 0.45);
  penUp(tl, ra, 1.4);
  draw(tl, link, 1.7, 2.8, 0, "power1.inOut");
  // the right one receives it
  penDown(tl, ra, 4.5);
  pose(tl, rb, "waving", 4.4, 0.45);
  pose(tl, ra, "pointing", 4.6, 0.45);
  // the line is carrying video, a shared screen and chat
  tl.to(icons, { scale: 1, duration: 0.55, ease: "back.out(2)", stagger: 0.25 }, 4.9);
  // and opens into a meeting
  tl.to(win, { opacity: 1, scale: 1, duration: 1.3, ease: "power3.out" }, 6.4);
  emerge(c, tl, 8.3, 1.4, "50% 50%");
  pad(tl);
  return tl;
}

/* ───────── 04 · VRxNURO ───────── */

function nuro(c: Ctx): Tl {
  const { q, qa } = mk(c);
  const tl = gsap.timeline({ paused: true });
  const layer = (n: number) => qa(`[data-layer="${n}"] circle`);
  const links = (n: number) => qa(`[data-link="${n}"]`);
  const all = [0, 1, 2, 3].flatMap(layer);
  gsap.set(all, { scale: 0, transformOrigin: "50% 50%" });
  [0, 1, 2].forEach((n) => links(n).forEach((l) => hide(c, l)));
  const ring = q("[data-p=seed-ring]");
  gsap.set(ring, { opacity: 0, scale: 1, transformOrigin: "50% 50%" });
  const axes = q("[data-p=axes]");
  const grid = q("[data-p=grid]");
  hide(c, axes);
  hide(c, grid);
  const pts = qa("[data-p=pt]");
  gsap.set(pts, { scale: 0, transformOrigin: "50% 50%" });
  const fit = q("[data-p=fit]");
  hide(c, fit);
  const outs = layer(3);
  // the last layer will become the first three points of the chart
  const target = pts.slice(0, 3).map((p) => ({ x: Number(p.getAttribute("cx")), y: Number(p.getAttribute("cy")) }));
  const home = outs.map((n) => ({ x: Number(n.getAttribute("cx")), y: Number(n.getAttribute("cy")) }));

  c.restore.push(() => {
    gsap.set([...all, ring, ...pts], { clearProps: "all" });
    outs.forEach((n, i) => {
      n.setAttribute("cx", String(home[i].x));
      n.setAttribute("cy", String(home[i].y));
    });
  });

  const rig = c.rigs[0];
  startPose(c, 0, "idle");
  figure(c, 0, { l: 16, t: 91 });

  // a single point; the stickman finds it and touches it with a pencil
  tl.to(layer(0), { scale: 1, duration: 0.7, ease: "back.out(2.4)" }, 0.1);
  pose(tl, rig, "drawing", 0.6, 0.45);
  penUp(tl, rig, 0.6);
  tl.to(ring, { opacity: 0.9, duration: 0.05 }, 1.0);
  tl.to(ring, { scale: 2.6, opacity: 0, duration: 0.7, ease: "power2.out" }, 1.0);

  // it branches, layer by layer
  tl.to(layer(1), { scale: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.12 }, 1.6);
  draw(tl, links(0), 1.7, 0.7, 0.08);
  tl.to(layer(2), { scale: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.1 }, 2.8);
  draw(tl, links(1), 2.9, 0.9, 0.04);
  tl.to(layer(3), { scale: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.12 }, 4.4);
  draw(tl, links(2), 4.5, 0.9, 0.03);
  penDown(tl, rig, 5.5);

  // the network wakes up
  [0, 1, 2, 3].forEach((n, i) => {
    tl.to(layer(n), { stroke: "#1f3dff", fill: "rgba(31,61,255,0.12)", duration: 0.3, stagger: 0.04 }, 5.7 + i * 0.15);
  });

  // and settles into data
  tl.to([...layer(0), ...layer(1), ...layer(2), ...[0, 1, 2].flatMap(links)], { opacity: 0.12, duration: 0.8 }, 6.6);
  outs.forEach((n, i) => {
    tl.to(n, { attr: { cx: target[i].x, cy: target[i].y }, duration: 0.9, ease: "power2.inOut" }, 6.6);
  });
  tl.to(outs, { opacity: 0, duration: 0.2 }, 7.5);
  tl.to(pts.slice(0, 3), { scale: 1, duration: 0.25 }, 7.45);
  draw(tl, axes, 6.9, 0.7);
  draw(tl, grid, 7.2, 0.6);
  tl.to(pts.slice(3), { scale: 1, duration: 0.4, ease: "back.out(3)", stagger: 0.15 }, 7.5);
  draw(tl, fit, 7.7, 0.9, 0, "power2.out");
  pose(tl, rig, "pointing", 8.5, 0.5);
  emerge(c, tl, 8.8, 1.1, "75% 55%");
  pad(tl);
  return tl;
}

export const BUILDERS: Record<ProjectId, (c: Ctx) => Tl> = {
  shipyard,
  termedu,
  "vrxed-meet": meet,
  vrxnuro: nuro,
};

/* ───────── threads between chapters ───────── */

export function buildThread(svg: SVGSVGElement, restore: Array<() => void>): Tl {
  const path = svg.querySelector<SVGPathElement>("[data-p=tpath]")!;
  const fork = svg.querySelector<SVGPathElement>("[data-p=tfork]");
  const glyph = svg.querySelector<SVGGElement>("[data-p=glyph]")!;
  const L = path.getTotalLength();
  path.style.strokeDasharray = `${L}`;
  path.style.strokeDashoffset = `${L}`;
  let FL = 0;
  if (fork) {
    FL = fork.getTotalLength();
    fork.style.strokeDasharray = `${FL}`;
    fork.style.strokeDashoffset = `${FL}`;
  }
  const st = { p: 0 };
  const place = () => {
    const pt = path.getPointAtLength(st.p * L);
    glyph.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
  };
  place();
  restore.push(() => {
    path.style.strokeDasharray = "";
    path.style.strokeDashoffset = "";
    if (fork) {
      fork.style.strokeDasharray = "";
      fork.style.strokeDashoffset = "";
    }
    glyph.removeAttribute("transform");
    glyph.style.opacity = "";
  });
  const tl = gsap.timeline({ paused: true });
  tl.set(glyph, { opacity: 1 }, 0.001);
  tl.to(path, { strokeDashoffset: 0, duration: 1, ease: "none" }, 0);
  tl.to(st, { p: 1, duration: 1, ease: "none", onUpdate: place }, 0);
  if (fork) tl.to(fork, { strokeDashoffset: 0, duration: 0.5, ease: "none" }, 0.55);
  // the glyph stays where the thread ends: it is what the next chapter picks up
  return tl;
}
