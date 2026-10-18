import gsap from "gsap";
import { Rig } from "../stickman/rig";
import { stick } from "../stickman/poses";
import { PROJECTS } from "./data";
import { FIGURES } from "./figures";
import { BUILDERS, buildThread, type Ctx } from "./timelines";

/**
 * Part 03 controller.
 *
 * Normal document scroll drives everything: each chapter's drawing is a paused
 * timeline whose progress is a pure function of scroll position, so it plays
 * forward and backward with the page and never pins or hijacks it.
 * With reduced motion nothing is staged and nothing is scrubbed: the markup is
 * already the finished state.
 */

export interface Projects {
  destroy: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Scrubbed {
  tl: gsap.core.Timeline;
  el: HTMLElement | SVGElement;
  /** document y of the element's top, and its height */
  top: number;
  h: number;
  from: number; // viewport fraction where progress is 0
  span: number; // viewport fraction of scroll over which progress runs 0 → 1
  cur: number;
  last: number;
  /** how far the element's own height extends the range (threads) */
  grow?: boolean;
}

export function createProjects(host: HTMLElement, reduced: boolean): Projects {
  const section = host.querySelector<HTMLElement>("#part-03");
  const list = host.querySelector<HTMLElement>("[data-p-list]");
  if (!section || !list) return { destroy() {} };

  const $$ = <T extends Element>(sel: string, root: ParentNode = section) => Array.from(root.querySelectorAll<T>(sel));
  const cleanups: Array<() => void> = [];
  const restore: Array<() => void> = [];
  const rigs: Rig[] = [];
  const scrubs: Scrubbed[] = [];
  const reveals: Array<{ els: HTMLElement[]; el: HTMLElement; top: number; done: boolean }> = [];

  const on = <T extends EventTarget>(t: T, ev: string, fn: EventListenerOrEventListenerObject, o?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn, o);
    cleanups.push(() => t.removeEventListener(ev, fn, o));
  };

  // ───────── the stickman beside the heading ─────────
  const introFig = section.querySelector<HTMLElement>("[data-fig='intro']");
  let introRig: Rig | null = null;
  if (introFig) {
    introRig = new Rig(introFig);
    introRig.setFlipped(true);
    rigs.push(introRig);
    introRig.snap("drawing");
    if (!reduced) introRig.life({ glance: true });
    const h = stick.pencil.hold;
    introRig.set({ px: h.x, py: h.y, prot: h.rot, ps: stick.pencil.scale, pop: 1 });
    const heading = section.querySelector<HTMLElement>("[data-el='part3-heading']");
    let busy = false;
    let busyTimer = 0;
    cleanups.push(() => window.clearTimeout(busyTimer));
    const react = () => {
      if (busy || !introRig) return;
      busy = true;
      introRig.hop(10);
      introRig.blink();
      busyTimer = window.setTimeout(() => (busy = false), 700);
    };
    if (heading) {
      on(heading, "pointerenter", react);
      on(heading, "focus", react);
    }
  }

  // ───────── chapters ─────────
  const chapters = $$<HTMLElement>("[data-p-chapter]");
  chapters.forEach((article, i) => {
    const id = PROJECTS[i].id;
    const svg = article.querySelector<SVGSVGElement>("svg.pill")!;
    const screen = article.querySelector<HTMLElement>("[data-p-screen]")!;
    const figEls = Array.from(article.querySelectorAll<HTMLElement>("[data-fig]"));
    const myRigs = figEls.map((el) => {
      const r = new Rig(el);
      rigs.push(r);
      return r;
    });
    const place = FIGURES[id];
    // the finished pose is what the page shows without any animation
    myRigs.forEach((r, k) => {
      r.snap(place[k].pose);
      r.set({ pop: 0 });
    });
    if (reduced) return;
    myRigs.forEach((r) => r.life());

    const ctx: Ctx = { id, article, svg, screen, figEls, rigs: myRigs, restore };
    const tl = BUILDERS[id](ctx);
    tl.progress(0.0001);
    tl.progress(0);
    const canvas = article.querySelector<HTMLElement>("[data-p-canvas]")!;
    scrubs.push({ tl, el: canvas, top: 0, h: 0, from: 0.9, span: 0.64, cur: 0, last: -1 });
  });

  // ───────── threads ─────────
  if (!reduced) {
    $$<SVGSVGElement>(".p-thread").forEach((svg) => {
      const tl = buildThread(svg, restore);
      scrubs.push({ tl, el: svg, top: 0, h: 0, from: 0.95, span: 0.5, cur: 0, last: -1, grow: true });
    });

    // text arrives once, quietly
    chapters.forEach((article) => {
      const els = Array.from(article.querySelectorAll<HTMLElement>(".p-head, .p-body"));
      gsap.set(els, { opacity: 0, y: 26 });
      restore.push(() => gsap.set(els, { clearProps: "opacity,transform" }));
      reveals.push({ els, el: article.querySelector<HTMLElement>(".p-text")!, top: 0, done: false });
    });
  }

  // ───────── measuring ─────────
  // Positions are document coordinates, so scrolling never invalidates them. They are
  // re-read only when something can have moved the layout: a resize, the webfonts, an
  // image loading, a <details> opening or closing, or (once, after scrolling stops) as a
  // safety net. Every read happens together, in one batch, before any write.
  let introTop = 0;
  let introH = 0;
  const measure = () => {
    const y = window.scrollY;
    scrubs.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + y;
      s.h = r.height;
    });
    reveals.forEach((r) => (r.top = r.el.getBoundingClientRect().top + y));
    if (introFig) {
      const r = introFig.getBoundingClientRect();
      introTop = r.top + y;
      introH = r.height;
    }
    dirty = true;
    wake();
  };

  // The per-frame callback exists only while something is moving. When every
  // timeline has caught up with the scroll position it removes itself from the
  // ticker, and the next scroll / measure wakes it. While Part 03 is more than a
  // screen away from the viewport it is not woken at all.
  let dirty = true;
  let ticking = false;
  let near = true; // within a screen of the viewport (IntersectionObserver keeps this up to date)
  const wake = () => {
    if (ticking || !near || reduced) return;
    ticking = true;
    gsap.ticker.add(frame);
  };
  const sleep = () => {
    if (!ticking) return;
    ticking = false;
    gsap.ticker.remove(frame);
  };

  let raf = 0;
  const scheduleMeasure = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(measure);
  };
  let settleTimer = 0;
  const onScroll = () => {
    if (!near) return;
    dirty = true;
    wake();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(measure, 160); // scrolling stopped: one safety-net measurement
  };
  const ro = new ResizeObserver(scheduleMeasure);
  ro.observe(list);
  cleanups.push(() => {
    ro.disconnect();
    cancelAnimationFrame(raf);
    window.clearTimeout(settleTimer);
    sleep();
  });
  on(window, "scroll", onScroll, { passive: true });
  on(window, "resize", scheduleMeasure);
  let alive = true;
  cleanups.push(() => (alive = false));
  document.fonts?.ready.then(() => alive && scheduleMeasure());
  // lazy images change heights
  $$<HTMLImageElement>("img").forEach((img) => on(img, "load", scheduleMeasure));
  // opening “How it’s built” changes layout
  $$<HTMLDetailsElement>("details").forEach((d) => on(d, "toggle", scheduleMeasure));

  // Far from the viewport nothing needs to run. When the section goes far away the
  // drawings are put at their final state for that side (all drawn below it, all
  // erased above it) in one step, and the callback stays asleep until it is near again.
  const io = new IntersectionObserver(
    (entries) => {
      near = entries[entries.length - 1].isIntersecting;
      if (near) {
        dirty = true;
        wake();
      } else {
        const vh = window.innerHeight;
        const y = window.scrollY;
        scrubs.forEach((s) => {
          s.cur = targetOf(s, y, vh);
          if (s.cur !== s.last) {
            s.tl.progress(s.cur);
            s.last = s.cur;
          }
        });
        sleep();
      }
    },
    { rootMargin: "100% 0px 100% 0px" },
  );
  io.observe(section);
  cleanups.push(() => io.disconnect());

  const targetOf = (s: Scrubbed, y: number, vh: number) => {
    const startY = s.top - vh * s.from; // progress 0 when the element's top is at `from` of the viewport
    const range = vh * s.span + (s.grow ? s.h : 0);
    return clamp((y - startY) / Math.max(1, range), 0, 1);
  };

  // ───────── per-frame (only while awake) ─────────
  let introWaved = reduced; // with reduced motion the heading figure never waves
  // counters for profiling, only with ?debug in the URL
  const dbg = /[?&]debug/.test(location.search) ? ((window as unknown as { __p3: { frames: number } }).__p3 = { frames: 0 }) : null;
  const frame = () => {
    if (dbg) dbg.frames++;
    const vh = window.innerHeight;
    const y = window.scrollY;
    if (!introWaved && introRig && introH) {
      const top = introTop - y; // cached position: no layout read here
      if (top < vh * 0.8 && top + introH > 0 && !document.documentElement.classList.contains("hero-open")) {
        introWaved = true;
        introRig.wave(2);
      }
    }
    const dt = Math.min(0.05, gsap.ticker.deltaRatio(60) / 60);
    let moving = dirty;
    dirty = false;
    scrubs.forEach((s) => {
      const target = targetOf(s, y, vh);
      const diff = target - s.cur;
      if (Math.abs(diff) > 0.0004) {
        s.cur += diff * (1 - Math.exp(-dt * 11));
        moving = true;
      } else s.cur = target;
      if (s.cur !== s.last) {
        s.tl.progress(s.cur);
        s.last = s.cur;
      }
    });
    reveals.forEach((r) => {
      if (!r.done && r.top - y < vh * 0.82 && r.top - y > -vh * 2) {
        r.done = true;
        gsap.to(r.els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.14, overwrite: true });
      }
    });
    if (!moving && !dirty) sleep();
  };
  cleanups.push(sleep);

  // the layout may not be final yet (webfonts, hash scroll): measure again on the next frames
  measure();
  requestAnimationFrame(() => requestAnimationFrame(measure));

  return {
    destroy: () => {
      cleanups.forEach((c) => c());
      scrubs.forEach((s) => s.tl.kill());
      gsap.killTweensOf(reveals.flatMap((r) => r.els));
      restore.forEach((r) => r());
      rigs.forEach((r) => r.destroy());
    },
  };
}
