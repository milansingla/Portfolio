import gsap from "gsap";
import type { Rig } from "../stickman/rig";
import { stick, VB } from "../stickman/poses";

export interface IntroEls {
  root: HTMLElement;
  figure: HTMLElement;
  underline: SVGSVGElement;
  ulMain: SVGPathElement;
  ulTail: SVGPathElement;
  chars: HTMLElement[];
  words: HTMLElement[];
  support: HTMLElement;
  btns: HTMLElement[];
  bubble: HTMLElement;
  bubbleText: HTMLElement;
}

export const QUIP = "it’s a feature.";

const STROKES = ["torso", "legL", "legR", "armL", "armR"] as const;

/**
 * The underline uses non-scaling strokes, so dashes are measured in screen
 * pixels while the path lives in a stretched 1000×60 box. This samples the
 * path once and returns the on-screen length plus a progress→fraction map, so
 * the visible line and the pencil tip always agree.
 */
function screenProfile(path: SVGPathElement, box: DOMRect) {
  const N = 200;
  const L = path.getTotalLength();
  const cum = [0];
  let prev = path.getPointAtLength(0);
  for (let i = 1; i <= N; i++) {
    const pt = path.getPointAtLength((L * i) / N);
    cum.push(cum[i - 1] + Math.hypot(((pt.x - prev.x) * box.width) / 1000, ((pt.y - prev.y) * box.height) / 60));
    prev = pt;
  }
  const total = cum[N];
  return {
    total,
    frac(p: number) {
      const f = Math.min(Math.max(p, 0), 1) * N;
      const i = Math.min(Math.floor(f), N - 1);
      return (cum[i] + (cum[i + 1] - cum[i]) * (f - i)) / total;
    },
  };
}
function setDash(path: SVGPathElement, total: number, shown: number) {
  path.style.strokeDasharray = `${total + 2} ${total + 2}`;
  path.style.strokeDashoffset = String((total + 2) * (1 - shown) + (shown <= 0 ? 2 : 0));
}

let profiles: { main: ReturnType<typeof screenProfile>; tail: ReturnType<typeof screenProfile> };

/** Put every animated thing into its pre-intro state. */
function prepare(rig: Rig, els: IntroEls) {
  const { parts } = rig;
  rig.snap("idle");
  rig.set({ by: 0, brot: 0, bsx: 1, bsy: 1, legL: 0, legR: 0, armR: 0, gx: 0, gy: 0, nod: 0, blink: 1, sh: 1 });
  rig.mood("neutral", 0);

  [parts.skull, ...STROKES.map((k) => parts[k])].forEach((el) => {
    el.setAttribute("pathLength", "1");
    el.style.strokeDasharray = "1";
    el.style.strokeDashoffset = "1";
  });
  gsap.set([parts.eye0, parts.eye1, parts.mouth], { opacity: 0 });
  gsap.set(parts.shadow, { opacity: 0 });
  rig.set({ pop: 0 });

  const box = els.underline.getBoundingClientRect();
  const profMain = screenProfile(els.ulMain, box);
  const profTail = screenProfile(els.ulTail, box);
  setDash(els.ulMain, profMain.total, 0);
  setDash(els.ulTail, profTail.total, 0);
  profiles = { main: profMain, tail: profTail };

  gsap.set(els.chars, { yPercent: 118, rotate: 5, "--w": 100 });
  gsap.set(els.words, { yPercent: 118 });
  gsap.set(els.support, { autoAlpha: 0, y: 14 });
  gsap.set(els.btns, { autoAlpha: 0, y: 26 });
  gsap.set(els.bubble, { autoAlpha: 0, scale: 0.6 });
  gsap.set(els.chars.map((c) => c.parentElement), { autoAlpha: 1 });
  gsap.set(els.words.map((w) => w.parentElement), { autoAlpha: 1 });
  gsap.set([els.ulMain, els.ulTail], { autoAlpha: 1 });
  gsap.set(els.figure, { autoAlpha: 1 });
}

/** Everything back to the finished, CSS-driven composition. */
export function applyFinal(rig: Rig, els: IntroEls) {
  const { parts } = rig;
  gsap.killTweensOf([
    rig.s,
    els.figure,
    els.chars,
    els.words,
    els.support,
    els.btns,
    els.bubble,
    parts.mouth,
    parts.eye0,
    parts.eye1,
    parts.sweat,
    parts.browL,
    parts.browR,
    parts.dust,
    parts.shadow,
    els.root.querySelector(".stick"),
    ...STROKES.map((k) => parts[k]),
    parts.extra0,
    parts.extra1,
    parts.extra2,
  ]);

  rig.snap("idle");
  rig.mood("smile", 0);
  const g = stick.pencil.ground;
  rig.set({
    by: 0, brot: 0, bsx: 1, bsy: 1, legL: 0, legR: 0, armR: 0, nod: 0, blink: 1, sh: 1,
    px: g.x, py: g.y, prot: g.rot, ps: stick.pencil.scale, pop: 1,
  });

  [parts.skull, ...STROKES.map((k) => parts[k])].forEach((el) => {
    el.style.strokeDasharray = "";
    el.style.strokeDashoffset = "";
    el.removeAttribute("pathLength");
  });
  gsap.set([parts.eye0, parts.eye1, parts.mouth, parts.shadow], { clearProps: "opacity,visibility" });
  gsap.set(parts.dust, { clearProps: "all" });

  for (const p of [els.ulMain, els.ulTail]) {
    p.removeAttribute("pathLength");
    p.style.strokeDasharray = "";
    p.style.strokeDashoffset = "";
  }
  gsap.set(
    [
      els.figure,
      els.support,
      ...els.btns,
      ...els.words,
      ...els.chars,
      ...els.chars.map((c) => c.parentElement!),
      ...els.words.map((w) => w.parentElement!),
      els.ulMain,
      els.ulTail,
    ],
    { clearProps: "all" },
  );
  els.chars.forEach((c) => c.style.removeProperty("--w"));
  gsap.set(els.bubble, { clearProps: "all" });
  els.bubble.hidden = true;
  const svg = els.root.querySelector<SVGElement>(".stick");
  if (svg) gsap.set(svg, { clearProps: "all" });
  els.figure.classList.add("is-flipped");
  rig.setFlipped(true);
  rig.touch();
  rig.render(true);
}

export interface IntroHandle {
  tl: gsap.core.Timeline;
  kill: () => void;
}

/**
 * The entrance. One GSAP timeline, ~11s, skippable at any moment.
 */
export function playIntro(
  rig: Rig,
  els: IntroEls,
  hooks: { onDone: () => void; onBail: () => void; allowBail: boolean },
): IntroHandle {
  els.figure.classList.remove("is-flipped");
  rig.setFlipped(false);
  prepare(rig, els);

  const { parts } = rig;
  const s = rig.s;
  const svgEl = els.root.querySelector<SVGElement>(".stick")!;
  const hold = stick.pencil.hold;
  const ground = stick.pencil.ground;
  const tl = gsap.timeline({ defaults: { overwrite: false }, onComplete: hooks.onDone });

  // ── geometry (measured once, with the figure at its CSS resting place) ──
  const fr = els.figure.getBoundingClientRect();
  const upx = fr.width / VB.w; // px per viewBox unit
  const tipX = fr.left + (hold.x - VB.x) * upx;
  const tipY = fr.top + hold.y * upx;
  const ur = els.underline.getBoundingClientRect();
  const mapX = (u: number) => ur.left + (u * ur.width) / 1000;
  const mapY = (v: number) => ur.top + (v * ur.height) / 60;
  const L = els.ulMain.getTotalLength();
  const at = (p: number) => {
    const pt = els.ulMain.getPointAtLength(p * L);
    return { x: mapX(pt.x) - tipX, y: mapY(pt.y) - tipY };
  };
  const start = at(0);
  gsap.set(els.figure, { x: start.x, y: start.y });

  const point = (el: SVGGeometryElement, p: number, len: number) => {
    const pt = el.getPointAtLength(p * len);
    return rig.toSvg(el, pt.x, pt.y);
  };

  const DRAW_ROT = 205;
  const pencilMove = (x: number, y: number, dur = 0.1) =>
    tl.to(s, { px: x, py: y, duration: dur, ease: "power2.inOut", onUpdate: rig.touch });

  // ── 0.0  an almost empty page; a pencil wanders in ──
  const skullStart = point(parts.skull as unknown as SVGGeometryElement, 0, (parts.skull as unknown as SVGGeometryElement).getTotalLength());
  rig.pencilTip(skullStart.x + 46, skullStart.y - 54, DRAW_ROT + 40);
  tl.to(s, { pop: 1, duration: 0.4, ease: "power1.out", onUpdate: rig.touch }, 0.35);
  tl.to(s, { px: skullStart.x, py: skullStart.y, prot: DRAW_ROT, duration: 0.45, ease: "power3.out", onUpdate: rig.touch }, 0.35);
  tl.to(parts.shadow, { opacity: 1, duration: 0.4 }, 0.4);

  // ── 0.8  the pencil draws the stickman, stroke by stroke ──
  const stroke = (el: SVGElement, dur: number, ease = "sine.inOut") => {
    const g = el as unknown as SVGGeometryElement;
    const len = g.getTotalLength();
    const o = { p: 0 };
    tl.to(o, {
      p: 1,
      duration: dur,
      ease,
      onUpdate: () => {
        el.style.strokeDashoffset = String(1 - o.p);
        const q = point(g, o.p, len);
        rig.pencilTip(q.x, q.y);
      },
    });
  };
  const lead = (el: SVGElement) => {
    const g = el as unknown as SVGGeometryElement;
    const q = point(g, 0, g.getTotalLength());
    pencilMove(q.x, q.y, 0.09);
  };

  stroke(parts.skull, 0.45);
  (["torso", "legL", "legR", "armL", "armR"] as const).forEach((k) => {
    lead(parts[k]);
    stroke(parts[k], k === "torso" ? 0.26 : 0.2);
  });

  // face: the pencil dabs two eyes and a mouth
  const dab = (el: SVGElement, lx = 0, ly = 0, dur = 0.1) => {
    const q = rig.toSvg(el as unknown as SVGGeometryElement, lx, ly);
    pencilMove(q.x, q.y, 0.12);
    tl.to(el, { opacity: 1, duration: dur });
  };
  dab(parts.eye0);
  dab(parts.eye1);
  dab(parts.mouth, 0, 12);

  // ── the figure wakes up and grabs the pencil ──
  tl.addLabel("wake");
  tl.to(s, { blink: 0.08, duration: 0.01 }, "wake");
  tl.to(s, { blink: 1, duration: 0.22, ease: "power2.out", onUpdate: rig.touch }, "wake+=0.05");
  tl.to(s, { px: hold.x, py: hold.y, prot: hold.rot + 360, ps: stick.pencil.scale, duration: 0.6, ease: "back.out(1.4)", onUpdate: rig.touch }, "wake+=0.2");
  tl.add(rig.pose("drawing", 0.55, "power2.inOut"), "wake+=0.2");
  tl.add(() => { s.prot = hold.rot; }, "wake+=0.8");

  // ── MILAN SINGLA: letters rise through a mask while the weight inflates ──
  tl.addLabel("name", "wake+=0.4");
  tl.to(
    els.chars,
    { yPercent: 0, rotate: 0, duration: 1.0, ease: "expo.out", stagger: { each: 0.055, from: "start" } },
    "name",
  );
  tl.to(
    els.chars,
    { "--w": 600, duration: 1.25, ease: "power2.out", stagger: { each: 0.055, from: "start" } },
    "name",
  );
  // he looks up at the name, impressed with himself
  tl.to(s, { gy: -1, gx: 0.15, duration: 0.4, ease: "power2.out", onUpdate: rig.touch }, "name+=0.1");
  tl.to(s, { gy: 0, gx: 0.6, duration: 0.5, ease: "power2.inOut", onUpdate: rig.touch }, "name+=1.0");

  // ── the underline: a confident start… ──
  tl.addLabel("underline", "name+=1.05");
  tl.add(() => rig.mood("focus", 0.15), "underline");
  const walkLegs = { tween: null as gsap.core.Tween | null };
  tl.add(() => { walkLegs.tween = rig.walk(0.15); }, "underline");
  const w = { p: 0 };
  tl.to(
    w,
    {
      p: 1,
      duration: 1.35,
      ease: "sine.inOut",
      onUpdate: () => {
        setDash(els.ulMain, profiles.main.total, profiles.main.frac(w.p));
        const a = at(w.p);
        const bob = Math.sin(w.p * 38) * (1.6 + w.p * 1.8);
        gsap.set(els.figure, { x: a.x, y: a.y + bob });
      },
    },
    "underline",
  );
  // …a wobble of doubt…
  tl.to(s, { hrot: -12, duration: 0.2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: rig.touch }, "underline+=0.85");
  tl.add(() => rig.mood("grimace", 0.15), "underline+=1.05");

  // ── …and the overreach ──
  tl.addLabel("fall", "underline+=1.35");
  tl.add(() => { walkLegs.tween?.kill(); rig.stopWalk(); }, "fall");
  tl.add(rig.pose("falling", 0.32, "power2.out"), "fall");
  tl.add(() => rig.mood("surprised", 0.1), "fall+=0.05");
  const tail = { p: 0 };
  tl.to(
    tail,
    {
      p: 1,
      duration: 0.42,
      ease: "power2.in",
      onUpdate: () => {
        setDash(els.ulTail, profiles.tail.total, profiles.tail.frac(tail.p));
      },
    },
    "fall",
  );
  // pencil is flung away and tumbles to the ground
  tl.to(s, { py: hold.y - 70, px: hold.x + 36, prot: 540, duration: 0.3, ease: "power2.out", onUpdate: rig.touch }, "fall+=0.1");
  tl.to(s, { px: ground.x, py: ground.y, prot: 360 + ground.rot, duration: 0.5, ease: "bounce.out", onUpdate: rig.touch }, "fall+=0.4");
  // the body tips over and lands
  tl.to(s, { by: -16, brot: -9, duration: 0.2, ease: "power2.out", onUpdate: rig.touch }, "fall+=0.1");
  tl.to(s, { by: 0, brot: 0, duration: 0.22, ease: "power3.in", onUpdate: rig.touch }, "fall+=0.3");
  tl.to(els.figure, { x: 0, y: 0, duration: 0.5, ease: "power2.out" }, "fall");
  tl.addLabel("land", "fall+=0.52");
  tl.to(s, { bsy: 0.88, bsx: 1.08, sh: 1.35, duration: 0.09, ease: "power2.out", onUpdate: rig.touch }, "land");
  tl.to(s, { bsy: 1, bsx: 1, sh: 1, duration: 0.5, ease: "elastic.out(1,0.45)", onUpdate: rig.touch }, "land+=0.09");
  tl.fromTo(parts.dust, { opacity: 0, scale: 0.6, svgOrigin: "130 285" }, { opacity: 1, scale: 1.1, duration: 0.14 }, "land");
  tl.to(parts.dust, { opacity: 0, duration: 0.5 }, "land+=0.35");
  tl.add(() => rig.mood("grimace", 0.1), "land");

  // ── reaction: lie there, stare at the damage ──
  tl.addLabel("react", "land+=0.6");
  tl.add(rig.pose("idle", 0.45, "back.out(1.3)"), "react");
  tl.add(() => rig.mood("deadpan", 0.15), "react+=0.2");
  tl.add(rig.hop(8), "react+=0.1");
  tl.to(s, { gx: -0.35, gy: -1, duration: 0.3, ease: "power2.out", onUpdate: rig.touch }, "react+=0.5");
  tl.add(() => {
    els.bubbleText.textContent = QUIP;
    els.bubble.hidden = false;
    els.bubble.setAttribute("aria-hidden", "true");
  }, "react+=0.7");
  tl.to(els.bubble, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, "react+=0.7");
  tl.to(s, { gx: 0.5, gy: 0, duration: 0.3, ease: "power2.inOut", onUpdate: rig.touch }, "react+=1.35");
  tl.add(() => rig.mood("smirk", 0.2), "react+=1.5");
  tl.add(rig.hop(6), "react+=1.6");
  tl.to(els.bubble, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: "power2.in" }, "react+=2.0");
  tl.add(() => { els.bubble.hidden = true; els.bubble.removeAttribute("aria-hidden"); }, "react+=2.35");

  // ── he turns to face the headline and points at it ──
  tl.addLabel("point", "react+=2.15");
  tl.to(svgEl, { scaleX: -1, duration: 0.42, ease: "power2.inOut" }, "point");
  tl.add(() => rig.setFlipped(true), "point+=0.21");
  tl.add(rig.pose("pointing", 0.45, "back.out(1.6)"), "point+=0.3");
  tl.to(s, { gx: 0, gy: 0, duration: 0.3, onUpdate: rig.touch }, "point+=0.3");
  tl.to(els.words, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.055 }, "point+=0.45");
  tl.to(els.support, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, "point+=1.2");

  // ── buttons rise; he waves at them ──
  tl.addLabel("wave", "point+=1.4");
  tl.to(els.btns, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.12 }, "wave");
  tl.add(rig.pose("waving", 0.4, "back.out(1.6)"), "wave");
  tl.add(() => { rig.wave(3); }, "wave+=0.35");
  tl.add(rig.pose("idle", 0.5, "power2.inOut"), "wave+=1.7");
  tl.add(() => rig.mood("smile", 0.25), "wave+=1.9");

  // ── bail-out if this device can't keep up ──
  if (hooks.allowBail) {
    let t0 = 0;
    let frames = 0;
    let acc = 0;
    const sample = () => {
      const now = performance.now();
      if (t0) {
        acc += now - t0;
        frames++;
      }
      t0 = now;
      if (acc > 1800) {
        gsap.ticker.remove(sample);
        if (acc / frames > 58) hooks.onBail();
      }
    };
    gsap.ticker.add(sample);
    tl.eventCallback("onComplete", () => {
      gsap.ticker.remove(sample);
      hooks.onDone();
    });
  }

  return {
    tl,
    kill: () => {
      tl.kill();
    },
  };
}
