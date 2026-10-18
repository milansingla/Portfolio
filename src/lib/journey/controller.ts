import gsap from "gsap";
import { Rig } from "../stickman/rig";
import { stick } from "../stickman/poses";
import { MILESTONES } from "./data";
import { prepareIllustration, activateIllustration, finalizeIllustration } from "./illustrations";

/**
 * The Road That Builds Itself.
 *
 * The road is one SVG path whose geometry is *measured from the page* (each
 * milestone owns an invisible anchor), so it always passes through the real
 * layout, whatever the viewport. Scrolling maps, deterministically, to a length
 * along that path: scroll down and the road grows, scroll up and it retreats.
 * Nothing about the road depends on time except the opening and the final
 * extension to the door.
 */

interface Pt {
  x: number;
  y: number;
}
const FOCUS = 0.55; // fraction of the viewport height where "now" is
const SAMPLES = 700;
const NS = "http://www.w3.org/2000/svg";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mk = <K extends keyof SVGElementTagNameMap>(tag: K, cls: string) => {
  const e = document.createElementNS(NS, tag);
  e.setAttribute("class", cls);
  return e;
};

export interface Journey {
  /** Run the opening (Part 02 just became visible). Idempotent. */
  start: () => void;
  /** Part 02 was closed again: stage it for the next opening. */
  reset: () => void;
  destroy: () => void;
}

export function createJourney(host: HTMLElement, reduced: boolean): Journey {
  const html = document.documentElement;
  const $ = <T extends Element>(sel: string, root: ParentNode = host) => root.querySelector<T>(sel)!;
  const $$ = <T extends Element>(sel: string, root: ParentNode = host) => Array.from(root.querySelectorAll<T>(sel));

  const section = $<HTMLElement>("[data-j='section']");
  const track = $<HTMLElement>("[data-j='track']");
  const road = $<SVGSVGElement>("[data-j='road']");
  const main = $<SVGPathElement>("[data-j='main']");
  const trace = $<SVGPathElement>("[data-j='trace']");
  const joinsG = $<SVGGElement>("[data-j='joins']");
  const nodesG = $<SVGGElement>("[data-j='nodes']");
  const grad = $<SVGLinearGradientElement>("#road-fade");
  const walkerEl = $<HTMLElement>("[data-j='walker']");
  const rail = $<HTMLElement>("[data-j='rail']");
  const railLinks = $$<HTMLAnchorElement>("[data-rail]", rail);
  const cue = $<HTMLElement>("[data-j='cue']");
  const door = $<HTMLAnchorElement>("[data-j='door']");
  const doorway = $<HTMLElement>("[data-j='doorway']");
  const part3 = $<HTMLElement>("#part-03");
  const articles = $$<HTMLElement>("article.milestone");
  const anchorEls = {
    start: $<HTMLElement>("[data-anchor='start']"),
    ms: [1, 2, 3, 4, 5].map((n) => $<HTMLElement>(`[data-anchor='${n}']`)),
    door: $<HTMLElement>("[data-anchor='door']"),
  };
  const introWords = $$<HTMLElement>("[data-j='intro'] .jw-i");
  const lead = $<HTMLElement>(".j-lead");

  const cleanups: Array<() => void> = [];
  const on = <T extends EventTarget>(t: T, ev: string, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn, opts);
    cleanups.push(() => t.removeEventListener(ev, fn, opts));
  };

  const mqNarrow = matchMedia("(max-width: 899px)");

  // ───────── the walker ─────────
  const rig = new Rig(walkerEl);
  rig.snap("drawing");
  const hold = stick.pencil.hold;
  rig.set({ px: hold.x, py: hold.y, prot: hold.rot, ps: stick.pencil.scale, pop: 1 });
  cleanups.push(() => rig.destroy());

  // ───────── geometry (rebuilt on resize) ─────────
  let W = 0;
  let H = 0;
  let L = 0; // full length, through the door
  let openLen = 0;
  let Ls: number[] = []; // length at milestone anchors 1..5, then the door
  let Ay: number[] = []; // y of milestone anchors 1..5
  let doorY = 0;
  let tbl: Array<{ y: number; l: number }> = [];
  let traceLen = 0;
  let traceFrom = 0;
  let traceTo = 0;
  let trackTop = 0; // document y of the track's top

  const lenAtY = (y: number) => {
    if (y <= tbl[0].y) return 0;
    if (y >= tbl[tbl.length - 1].y) return L;
    let lo = 0;
    let hi = tbl.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (tbl[m].y <= y) lo = m;
      else hi = m;
    }
    const a = tbl[lo];
    const b = tbl[hi];
    return a.l + ((y - a.y) / Math.max(0.0001, b.y - a.y)) * (b.l - a.l);
  };
  const ptAtY = (y: number) => main.getPointAtLength(lenAtY(y));

  /** Position of an element's centre in track coordinates. */
  const local = (el: Element): Pt => {
    const t = track.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2 };
  };

  const curve = (pts: Pt[], swing: number, dx = 0) => {
    let d = `M${pts[0].x + dx} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dy = b.y - a.y;
      if (i === 0 && Math.abs(b.x - a.x) > 60) {
        // the opening line: a loose pencil stroke that settles into the road's direction
        const w = b.x - a.x;
        d += `C${a.x + dx + w * 0.5} ${a.y} ${b.x + dx} ${b.y - dy * 0.5} ${b.x + dx} ${b.y}`;
        continue;
      }
      const s = i % 2 ? 1 : -1;
      const m = { x: (a.x + b.x) / 2 + s * swing, y: (a.y + b.y) / 2 };
      d += `C${a.x + dx} ${a.y + dy * 0.28} ${m.x + dx} ${m.y - dy * 0.22} ${m.x + dx} ${m.y}`;
      d += `C${m.x + dx} ${m.y + dy * 0.22} ${b.x + dx} ${b.y - dy * 0.28} ${b.x + dx} ${b.y}`;
    }
    return d;
  };

  // state that survives rebuilds
  const reached: boolean[] = [false, false, false, false, false];
  const activated: boolean[] = [false, false, false, false, false];
  const timelines: Array<gsap.core.Timeline | null> = [null, null, null, null, null];
  let nodes: SVGCircleElement[] = [];
  let joins: Array<Array<{ path: SVGPathElement; chip: SVGCircleElement; len: number }>> = [[], [], [], [], []];

  // Rebuilding samples the road 700 times, so it only runs when something it reads has moved.
  let sig = "";
  function build(force = false) {
    const tr = track.getBoundingClientRect();
    W = Math.max(1, track.clientWidth);
    H = Math.max(1, track.clientHeight);
    trackTop = tr.top + window.scrollY;
    road.setAttribute("viewBox", `0 0 ${W} ${H}`);
    road.setAttribute("preserveAspectRatio", "none");
    const narrow = mqNarrow.matches;

    const start = local(anchorEls.start);
    const ms = anchorEls.ms.map(local);
    const dr = local(anchorEls.door);
    const lr = lead.getBoundingClientRect();
    const s0: Pt = narrow
      ? { x: start.x, y: lr.bottom - tr.top + 36 }
      : { x: lr.left - tr.left + 14, y: lr.bottom - tr.top + 40 };
    if (s0.y > start.y - 40) s0.y = start.y - 40;
    const nextSig = [W, H, narrow, trackTop, s0.x, s0.y, start.x, start.y, dr.x, dr.y, ...ms.flatMap((p) => [p.x, p.y])]
      .map((v) => (typeof v === "number" ? Math.round(v * 2) / 2 : v))
      .join();
    if (!force && nextSig === sig) return;
    sig = nextSig;
    const pts = [s0, start, ...ms, dr];
    Ay = ms.map((p) => p.y);
    doorY = dr.y;
    const swing = narrow ? 7 : clamp(W * 0.1, 40, 150);

    main.setAttribute("d", curve(pts, swing));
    L = main.getTotalLength();
    // y is monotone along the path, so a sampled table inverts it exactly enough
    tbl = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const l = (L * i) / SAMPLES;
      tbl.push({ y: main.getPointAtLength(l).y, l });
    }
    for (let i = 1; i < tbl.length; i++) if (tbl[i].y < tbl[i - 1].y) tbl[i].y = tbl[i - 1].y;
    openLen = lenAtY(start.y);
    Ls = [...ms.map((p) => lenAtY(p.y)), L];
    main.style.strokeDasharray = `${L} ${L}`;

    // the blue "trace" that runs beside the road through the technical milestones
    const traceFromLen = Ls[1];
    const traceToLen = Ls[3];
    const tpts = [pts[3], pts[4], pts[5]]; // milestones 2, 3, 4
    trace.setAttribute("d", narrow ? "M0 0" : curve(tpts, swing, 9));
    traceLen = narrow ? 0 : trace.getTotalLength();
    traceFrom = traceFromLen;
    traceTo = traceToLen;
    trace.style.strokeDasharray = `${traceLen} ${traceLen}`;

    // fade-toward-unfinished gradient: ink → faint after milestone 5 → ink again at the door
    const a5 = ms[4].y;
    const stops = [
      [0, 1],
      [clamp((a5 - 30) / H, 0, 1), 1],
      [clamp((a5 + (dr.y - a5) * 0.4) / H, 0, 1), 0.2],
      [clamp((dr.y - 20) / H, 0, 1), 0.9],
      [1, 0.9],
    ];
    grad.setAttribute("y2", String(H));
    grad.replaceChildren(
      ...stops.map(([o, a]) => {
        const st = document.createElementNS(NS, "stop");
        st.setAttribute("offset", String(o));
        st.setAttribute("stop-color", "#14110f");
        st.setAttribute("stop-opacity", String(a));
        return st;
      }),
    );

    // nodes
    nodesG.replaceChildren();
    nodes = ms.map((p, i) => {
      const c = mk("circle", "road-node");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", reached[i] || reduced ? "10" : "0");
      nodesG.appendChild(c);
      return c;
    });

    // joins: circuit / workflow wiring from the road to the illustration's near ports
    joinsG.replaceChildren();
    joins = [[], [], [], [], []];
    MILESTONES.forEach((m, i) => {
      if (m.branch === "none") return;
      const ill = articles[i].querySelector<HTMLElement>("[data-m-ill]")!;
      const ports = (side: string) =>
        [0, 1]
          .map((k) => ill.querySelector<SVGElement>(`[data-port='${side}${k}']`))
          .filter(Boolean)
          .map((e) => local(e!));
      const L2 = ports("l");
      const R2 = ports("r");
      if (L2.length < 2 || R2.length < 2) return;
      const rx = ms[i].x;
      const dist = (a: Pt[]) => Math.abs(a.reduce((s, p) => s + p.x, 0) / a.length - rx);
      const chosen = dist(L2) <= dist(R2) ? L2 : R2;
      chosen.forEach((p, k) => {
        const off = k === 0 ? -22 : 22;
        const rp = ptAtY(ms[i].y + off);
        const path = mk("path", `road-join is-${m.branch}`);
        const dxs = Math.sign(p.x - rp.x) || 1;
        let d: string;
        if (m.branch === "circuit") {
          const mx = rp.x + (p.x - rp.x) * (k === 0 ? 0.42 : 0.62);
          const c = 10;
          const dys = Math.sign(p.y - rp.y) || 1;
          d = `M${rp.x} ${rp.y} H${mx - dxs * c} L${mx} ${rp.y + dys * c} V${p.y - dys * c} L${mx + dxs * c} ${p.y} H${p.x}`;
        } else {
          const half = (p.x - rp.x) * 0.5;
          d = `M${rp.x} ${rp.y} C${rp.x + half} ${rp.y} ${p.x - half} ${p.y} ${p.x} ${p.y}`;
        }
        path.setAttribute("d", d);
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len} ${len}`;
        path.style.strokeDashoffset = activated[i] || reduced ? "0" : String(len);
        const chip = mk("circle", "road-chip");
        chip.setAttribute("cx", String(p.x));
        chip.setAttribute("cy", String(p.y));
        chip.setAttribute("r", activated[i] || reduced ? "4.5" : "0");
        joinsG.append(path, chip);
        joins[i].push({ path, chip, len });
      });
    });

    dirty = true;
  }

  // ───────── scroll → road ─────────
  let started = reduced; // reduced motion shows everything at once
  let opening = reduced ? 1 : 0; // 0..1 of the pencil's opening line
  let ext = reduced ? 1 : 0; // 0..1 of the extension to the door
  let cur = 0;
  let dirty = true;
  let facingLeft = false;
  let lastMove = 0;
  let walking: gsap.core.Tween | null = null;
  let inJourney = false;

  const focusY = () => window.scrollY + window.innerHeight * FOCUS - trackTop;

  const target = () => {
    if (reduced) return L;
    if (!started) return 0;
    if (ext > 0) return Ls[4] + ext * (L - Ls[4]);
    return Math.max(opening * openLen, Math.min(lenAtY(focusY()), Ls[4]));
  };

  const setActive = (i: number) => {
    articles.forEach((a, k) => a.classList.toggle("is-active", k === i));
    railLinks.forEach((a, k) => {
      a.classList.toggle("is-active", k === i);
      if (k === i) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    });
    nodes.forEach((n, k) => n.classList.toggle("is-active", k === i));
  };
  let activeIdx = -2;

  function frame() {
    const t = target();
    const diff = t - cur;
    if (!dirty && Math.abs(diff) < 0.05) return;
    dirty = false;
    const dt = Math.min(0.05, gsap.ticker.deltaRatio(60) / 60);
    cur = reduced || Math.abs(diff) < 0.05 ? t : cur + diff * (1 - Math.exp(-dt * 16));
    if (Math.abs(t - cur) > 0.05) dirty = true;

    main.style.strokeDashoffset = String(L - cur);
    if (traceLen) {
      const p = clamp((cur - traceFrom) / Math.max(1, traceTo - traceFrom), 0, 1);
      trace.style.strokeDashoffset = String(traceLen * (1 - p));
    }

    // nodes pop as the road reaches them
    nodes.forEach((n, i) => {
      const r = cur >= Ls[i] - 1;
      if (r && !reached[i]) {
        reached[i] = true;
        if (reduced) n.setAttribute("r", "10");
        else gsap.fromTo(n, { attr: { r: 0 } }, { attr: { r: 10 }, duration: 0.45, ease: "back.out(2.4)" });
      } else if (!r && reached[i]) {
        reached[i] = false;
        gsap.to(n, { attr: { r: 0 }, duration: 0.2 });
      }
    });

    // the walker
    if (!reduced) {
      const wl = Math.max(0, cur - 2);
      const p = main.getPointAtLength(wl);
      const a = main.getPointAtLength(Math.max(0, wl - 10));
      const b = main.getPointAtLength(Math.min(L, wl + 10));
      const dx = b.x - a.x;
      if (mqNarrow.matches) facingLeft = false;
      else if (Math.abs(dx) > 1.2) facingLeft = dx < 0;
      const ws = (walkerEl.offsetHeight || 120) / 300; // the box is 300 viewBox units tall
      walkerEl.style.transform = `translate(${p.x - 170 * ws}px, ${p.y - 275 * ws}px)`;
      walkerEl.classList.toggle("is-flipped", facingLeft);
      if (started) walkerEl.classList.add("is-ready");
      if (Math.abs(diff) > 0.4) {
        lastMove = performance.now();
        if (!walking) walking = rig.walk(0.17);
      }
    }
    const prog = clamp(cur / Math.max(1, Ls[4]), 0, 1);
    rail.style.setProperty("--p", prog.toFixed(4));
  }

  const idleCheck = () => {
    if (walking && performance.now() - lastMove > 220) {
      walking.kill();
      walking = null;
      rig.stopWalk();
    }
  };

  function scrollState() {
    const fy = focusY();
    const vh = window.innerHeight;
    // which milestone is "now"
    let idx = -1;
    Ay.forEach((y, i) => {
      if (fy >= y - 4) idx = i;
    });
    if (started && idx !== activeIdx) {
      activeIdx = idx;
      setActive(idx);
    }
    // reveal a little before the focus line arrives
    if (started) Ay.forEach((y, i) => fy >= y - vh * 0.3 && activate(i));
    // chrome that belongs to the journey
    const p3 = part3.getBoundingClientRect().top + window.scrollY;
    const inside = window.scrollY > vh * 0.35 && window.scrollY < p3 - vh * 0.45 && !html.classList.contains("hero-open");
    if (inside !== inJourney) {
      inJourney = inside;
      html.classList.toggle("in-journey", inside);
    }
    cue.classList.toggle("is-on", started && window.scrollY < vh * 0.25 && !reduced);
    // the extension to the door, once the visitor has arrived there
    if (!reduced && started) setExt(fy >= doorY - vh * 0.85 ? 1 : 0);
    dirty = true;
  }
  const state = { ext: reduced ? 1 : 0 };
  let extTween: gsap.core.Tween | null = null;
  let extWant = 0;
  function setExt(want: number) {
    if (want === extWant) return;
    extWant = want;
    extTween?.kill();
    extTween = gsap.to(state, {
      ext: want,
      duration: want ? 1.8 : 0.9,
      ease: "power1.inOut",
      onUpdate: () => {
        ext = state.ext;
        dirty = true;
      },
    });
  }

  // ───────── milestone staging & activation ─────────
  const parts = (a: HTMLElement) => ({
    words: Array.from(a.querySelectorAll<HTMLElement>(".m-title .jw-i")),
    label: a.querySelector<HTMLElement>(".m-label")!,
    body: a.querySelector<HTMLElement>(".m-body")!,
    facts: a.querySelector<HTMLElement>(".m-facts"),
    ill: a.querySelector<HTMLElement>("[data-m-ill]")!,
  });

  function stage() {
    section.classList.add("j-anim");
    articles.forEach((a, i) => {
      const p = parts(a);
      gsap.set([p.label, p.body, p.facts].filter(Boolean), { opacity: 0, y: 18 });
      gsap.set(p.words, { yPercent: 115 });
      gsap.set(p.ill, { opacity: 0 });
      prepareIllustration(MILESTONES[i].id, p.ill);
    });
    gsap.set(introWords, { yPercent: 115 });
    gsap.set(lead, { opacity: 0 });
  }

  function unstage() {
    section.classList.remove("j-anim");
    articles.forEach((a, i) => {
      const p = parts(a);
      gsap.set([p.label, p.body, p.facts, ...p.words, p.ill].filter(Boolean), { clearProps: "all" });
      finalizeIllustration(p.ill);
      void i;
    });
    gsap.set([...introWords, lead], { clearProps: "all" });
  }

  function activate(i: number) {
    if (activated[i] || reduced) return;
    activated[i] = true;
    const a = articles[i];
    const p = parts(a);
    const tl = gsap.timeline();
    timelines[i] = tl;
    tl.to(p.label, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0);
    tl.to(p.words, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.09 }, 0.08);
    tl.to([p.body, p.facts].filter(Boolean), { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12 }, 0.35);
    tl.to(p.ill, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0.25);
    tl.add(activateIllustration(MILESTONES[i].id, p.ill), 0.4);
    wireJoins(i, tl, 1.6);
  }

  function wireJoins(i: number, tl: gsap.core.Timeline, at: number) {
    joins[i].forEach((j, k) => {
      gsap.set(j.path, { strokeDashoffset: j.len });
      gsap.set(j.chip, { attr: { r: 0 } });
      tl.to(j.path, { strokeDashoffset: 0, duration: 0.9, ease: "power1.inOut" }, at + k * 0.18);
      tl.to(j.chip, { attr: { r: 4.5 }, duration: 0.3, ease: "back.out(3)" }, at + 0.8 + k * 0.18);
    });
  }

  function replay(i: number) {
    if (reduced) return;
    const p = parts(articles[i]);
    timelines[i]?.kill();
    finalizeIllustration(p.ill);
    prepareIllustration(MILESTONES[i].id, p.ill);
    const tl = gsap.timeline();
    timelines[i] = tl;
    tl.add(activateIllustration(MILESTONES[i].id, p.ill), 0);
    wireJoins(i, tl, 1.2);
  }

  // ───────── interaction ─────────
  const scrollToY = (y: number) => {
    const top = Math.max(0, y);
    if (reduced) window.scrollTo(0, top);
    else window.scrollTo({ top, behavior: "smooth" });
  };
  const anchorTop = (i: number) => Ay[i] + trackTop - window.innerHeight * FOCUS + 2;

  railLinks.forEach((a, i) => {
    on(a, "click", (e) => {
      const ev = e as MouseEvent;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      scrollToY(anchorTop(i));
      try {
        history.replaceState(history.state, "", `#milestone-${i + 1}`);
      } catch {}
    });
  });

  const hotTimers: number[] = [];
  $$<HTMLButtonElement>("[data-m-btn]").forEach((btn) => {
    const i = Number(btn.dataset.mBtn);
    on(btn, "click", () => {
      const a = articles[i];
      const need = Math.abs(window.scrollY - anchorTop(i)) > window.innerHeight * 0.25;
      if (need) scrollToY(anchorTop(i));
      a.classList.add("is-hot");
      nodes[i]?.classList.add("is-hot");
      window.clearTimeout(hotTimers[i]);
      hotTimers[i] = window.setTimeout(() => {
        a.classList.remove("is-hot");
        nodes[i]?.classList.remove("is-hot");
      }, 1800);
      if (!started) return;
      if (activated[i]) replay(i);
      else activate(i);
      rig.hop(8);
    });
  });

  // hover: the stop lights up and the walker glances at it (fine pointers only)
  if (matchMedia("(hover: hover)").matches && !reduced) {
    articles.forEach((a, i) => {
      on(a, "pointerenter", () => {
        a.classList.add("is-hot");
        nodes[i]?.classList.add("is-hot");
        const r = a.getBoundingClientRect();
        rig.gazeAt(r.left + r.width / 2, r.top + r.height / 2);
      });
      on(a, "pointerleave", () => {
        a.classList.remove("is-hot");
        nodes[i]?.classList.remove("is-hot");
        rig.gaze(0, 0);
      });
    });
  }

  // ───────── the door ─────────
  let leaving = false;
  const leaf = door.querySelector<SVGElement>("[data-part='leaf']");
  const handle = door.querySelector<SVGElement>("[data-part='handle']");
  const p3Heading = part3.querySelector<HTMLElement>("[data-el='part3-heading']");

  const arrive = () => {
    window.scrollTo(0, part3.getBoundingClientRect().top + window.scrollY);
    try {
      history.pushState({ part: 3 }, "", "#part-03");
    } catch {}
    p3Heading?.focus({ preventScroll: true });
  };

  on(door, "click", (e) => {
    const ev = e as MouseEvent;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
    ev.preventDefault();
    if (leaving) return;
    if (reduced || !leaf) {
      arrive();
      return;
    }
    leaving = true;
    const r = door.querySelector<SVGElement>("[data-part='behind']")?.getBoundingClientRect() ?? door.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inset = { t: r.top, r: vw - r.right, b: vh - r.bottom, l: r.left };
    gsap.set(doorway, { visibility: "visible", clipPath: `inset(${inset.t}px ${inset.r}px ${inset.b}px ${inset.l}px round 40px 40px 0 0)` });
    const tl = gsap.timeline({
      onComplete: () => {
        arrive();
        gsap.to(doorway, {
          opacity: 0,
          duration: 0.5,
          ease: "power1.out",
          onComplete: () => {
            gsap.set(doorway, { clearProps: "all" });
            gsap.set(leaf, { clearProps: "all" });
            leaving = false;
          },
        });
      },
    });
    tl.to(leaf, { scaleX: 0.08, svgOrigin: "72 240", duration: 0.7, ease: "power2.inOut" }, 0);
    tl.to(doorway, { clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)", duration: 0.9, ease: "power3.inOut" }, 0.45);
  });
  if (handle && !reduced) {
    on(door, "pointerenter", () => {
      gsap.fromTo(handle, { rotation: 0 }, { rotation: 8, svgOrigin: "262 262", duration: 0.12, yoyo: true, repeat: 3, ease: "sine.inOut", overwrite: true });
    });
  }

  // If someone follows #part-03 / #milestone-N natively, nothing needs doing: the
  // anchors are real. We only keep our own state honest.
  on(window, "scroll", () => scrollState(), { passive: true });
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(rebuildRaf);
    rebuildRaf = requestAnimationFrame(() => {
      build();
      scrollState();
    });
  });
  let rebuildRaf = 0;
  ro.observe(track);
  cleanups.push(() => {
    ro.disconnect();
    cancelAnimationFrame(rebuildRaf);
  });
  on(mqNarrow, "change", () => {
    build();
    scrollState();
  });
  gsap.ticker.add(frame);
  gsap.ticker.add(idleCheck);
  cleanups.push(() => {
    gsap.ticker.remove(frame);
    gsap.ticker.remove(idleCheck);
  });

  // Part 03 sits below Part 02; while the hero covers everything it must not be tabbable.
  const syncInert = () => part3.toggleAttribute("inert", html.classList.contains("hero-open"));
  const mo = new MutationObserver(syncInert);
  mo.observe(html, { attributes: true, attributeFilter: ["class"] });
  cleanups.push(() => {
    mo.disconnect();
    part3.removeAttribute("inert");
  });
  syncInert();

  // ───────── lifecycle ─────────
  let openTl: gsap.core.Timeline | null = null;

  build();
  if (!reduced) {
    stage();
    walkerEl.classList.remove("is-ready");
  } else {
    // reduced motion: a complete, still page; no walker, nothing staged
    nodes.forEach((n, i) => {
      n.setAttribute("r", "10");
      reached[i] = true;
    });
    activated.fill(true);
  }
  scrollState();

  // fonts change heading height, which moves anchors
  document.fonts?.ready.then(() => {
    build();
    scrollState();
  });

  function start() {
    if (started && !reduced) return;
    if (reduced) {
      dirty = true;
      return;
    }
    started = true;
    build();
    rig.snap("drawing");
    rig.set({ px: hold.x, py: hold.y, prot: hold.rot, ps: stick.pencil.scale, pop: 1 });
    openTl = gsap.timeline();
    openTl.to(introWords, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.12 }, 0);
    openTl.to(lead, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.5);
    const o = { v: 0 };
    openTl.to(
      o,
      {
        v: 1,
        duration: 2.2,
        ease: "power2.inOut",
        onUpdate: () => {
          opening = o.v;
          dirty = true;
        },
      },
      0.7,
    );
    walkerEl.classList.add("is-ready");
    scrollState();
  }

  function reset() {
    if (reduced) return;
    openTl?.kill();
    extTween?.kill();
    extTween = null;
    extWant = 0;
    state.ext = 0;
    ext = 0;
    opening = 0;
    started = false;
    cur = 0;
    activeIdx = -2;
    activated.fill(false);
    reached.fill(false);
    timelines.forEach((t) => t?.kill());
    walkerEl.classList.remove("is-ready");
    walking?.kill();
    walking = null;
    unstage();
    stage();
    build(true);
    setActive(-1);
    dirty = true;
  }

  return {
    start,
    reset,
    destroy: () => {
      openTl?.kill();
      extTween?.kill();
      timelines.forEach((t) => t?.kill());
      walking?.kill();
      hotTimers.forEach((t) => window.clearTimeout(t));
      cleanups.forEach((c) => c());
      html.classList.remove("in-journey");
      unstage();
      gsap.set(walkerEl, { clearProps: "all" });
    },
  };
}
