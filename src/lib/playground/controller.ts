import gsap from "gsap";
import { Rig } from "../stickman/rig";
import { stick } from "../stickman/poses";
import { mover } from "./../stickman/mover";
import { INCIDENT } from "./data";
import { createPad } from "./pad";

/**
 * Part 04 controller: the three toys and the final act.
 *
 * Everything here is optional and local. Nothing scrolls the page, nothing
 * covers it, nothing is sent anywhere. With reduced motion the stickman only
 * changes pose; nothing travels.
 */

export interface Playground {
  destroy: () => void;
}

const hold = stick.pencil.hold;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const html = document.documentElement;

export function createPlayground(host: HTMLElement, reduced: boolean): Playground {
  const section = host.querySelector<HTMLElement>("#part-04");
  if (!section) return { destroy() {} };

  const q = <T extends Element = HTMLElement>(sel: string) => section.querySelector<T>(sel);
  const cleanups: Array<() => void> = [];
  const rigs: Rig[] = [];
  const timelines = new Set<gsap.core.Timeline>();
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const on = <T extends EventTarget>(t: T | null, ev: string, fn: (e: never) => void, o?: AddEventListenerOptions) => {
    if (!t) return;
    t.addEventListener(ev, fn as EventListener, o);
    cleanups.push(() => t.removeEventListener(ev, fn as EventListener, o));
  };
  const newRig = (el: HTMLElement) => {
    const r = new Rig(el);
    rigs.push(r);
    return r;
  };

  // Part 04 is below the sheet and the road: it must not be tabbable while Part 01 covers everything.
  const syncInert = () => section.toggleAttribute("inert", html.classList.contains("hero-open"));
  const mo = new MutationObserver(syncInert);
  mo.observe(html, { attributes: true, attributeFilter: ["class"] });
  cleanups.push(() => {
    mo.disconnect();
    section.removeAttribute("inert");
  });
  syncInert();

  /* ─────────────────────────── 02 · cursor artist (freehand pad) ─────────────────────────── */
  (() => {
    const pad = q("[data-pg=pad]");
    const canvas = q<HTMLCanvasElement>("[data-pg=canvas]");
    const figEl = q("[data-pg-fig=artist]");
    const hi = q<HTMLButtonElement>("[data-pg=hi]");
    const eraserBtn = q<HTMLButtonElement>("[data-pg=eraser]");
    const undoBtn = q<HTMLButtonElement>("[data-pg=undo]");
    const clearBtn = q<HTMLButtonElement>("[data-pg=clear]");
    const sizeInput = q<HTMLInputElement>("[data-pg=size]");
    const colors = q<HTMLFieldSetElement>("[data-pg=colors]");
    const status = q("[data-pg=art-status]");
    const card = q("#artist");
    if (!pad || !canvas || !figEl || !hi || !eraserBtn || !undoBtn || !clearBtn || !sizeInput || !colors || !card) return;

    const say = (t: string) => {
      if (status) status.textContent = t;
    };

    // ── the stickman keeps the visitor company ──
    const rig = newRig(figEl);
    rig.snap("idle");
    rig.set({ pop: 0 });
    if (!reduced) rig.life();
    let faceLeft = false;
    const face = (left: boolean) => {
      if (left === faceLeft) return;
      faceLeft = left;
      figEl.classList.toggle("is-flipped", left);
      rig.setFlipped(left);
    };
    let busy = false; // drawing pose is on
    let settle = 0;
    let raf = 0;
    let lastX = 0;
    let lastY = 0;
    const watch = () => {
      raf = 0;
      rig.gazeAt(lastX, lastY);
    };

    // ── brush state (read by the engine at the start of every stroke) ──
    let erase = false;
    const color = () => colors.querySelector<HTMLInputElement>("input:checked")?.value ?? "#14110f";
    const brush = () => ({ color: color(), size: Number(sizeInput.value) || 5, erase });

    const ring = () => {
      // a cursor the size of the brush, so what you see is what you draw
      const d = Math.max(10, Math.min(64, Number(sizeInput.value) * 1 + 6));
      const c = d / 2;
      const r = Math.max(2, (d - 6) / 2);
      const dash = erase ? ' stroke-dasharray="3 2"' : "";
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${d}' height='${d}'>` +
        `<circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='white' stroke-width='3'/>` +
        `<circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='%2314110f' stroke-width='1.25'${dash}/></svg>`;
      canvas.style.cursor = `url("data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}") ${c} ${c}, crosshair`;
    };
    ring();

    const pen = createPad(canvas, {
      brush,
      onStart(x, y) {
        window.clearTimeout(settle);
        if (reduced) return;
        const fr = figEl.getBoundingClientRect();
        face(x < fr.left + fr.width / 2);
        if (!busy) {
          busy = true;
          rig.pose("drawing", 0.3);
          rig.to({ pop: 1, px: hold.x, py: hold.y, prot: hold.rot, ps: stick.pencil.scale, duration: 0.25 });
        }
        lastX = x;
        lastY = y;
        rig.gazeAt(x, y);
      },
      onMove(x, y) {
        if (reduced) return;
        lastX = x;
        lastY = y;
        if (!raf) raf = requestAnimationFrame(watch);
      },
      onEnd() {
        if (reduced) return;
        window.clearTimeout(settle);
        settle = later(() => {
          busy = false;
          face(false);
          rig.pose("idle", 0.5);
          rig.to({ pop: 0, duration: 0.2 });
          rig.gaze(0, 0);
          rig.mood("grin", 0.15);
          later(() => rig.mood("smile", 0.25), 900);
        }, 1100);
      },
      onChange(n) {
        undoBtn.setAttribute("aria-disabled", String(n === 0));
        clearBtn.setAttribute("aria-disabled", String(n === 0));
      },
      onFull() {
        say("The pad is full. Clear it to keep drawing.");
      },
    });
    cleanups.push(() => {
      pen.destroy();
      cancelAnimationFrame(raf);
    });
    undoBtn.setAttribute("aria-disabled", "true");
    clearBtn.setAttribute("aria-disabled", "true");

    if (!reduced) {
      on(pad, "pointermove", (e: PointerEvent) => {
        if (e.pointerType === "touch" || busy) return;
        lastX = e.clientX;
        lastY = e.clientY;
        if (!raf) raf = requestAnimationFrame(watch);
      });
      on(pad, "pointerleave", () => {
        if (!busy) rig.gaze(0, 0);
      });
    }

    // ── controls ──
    on(eraserBtn, "click", () => {
      erase = !erase;
      eraserBtn.setAttribute("aria-pressed", String(erase));
      ring();
      say(erase ? "Eraser on." : "Pen on.");
    });
    on(colors, "change", () => {
      if (erase) {
        erase = false;
        eraserBtn.setAttribute("aria-pressed", "false");
      }
      ring();
    });
    on(sizeInput, "input", ring);

    const undo = () => {
      say(pen.undo() ? "Last stroke undone." : "Nothing to undo.");
    };
    on(undoBtn, "click", undo);
    on(card, "keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        if ((e.target as Element).closest("[data-pg=terminal]")) return;
        e.preventDefault();
        undo();
      }
    });

    // Clear asks twice instead of opening a dialog.
    let confirmTimer = 0;
    const resetClear = () => {
      window.clearTimeout(confirmTimer);
      clearBtn.textContent = "Clear";
      clearBtn.removeAttribute("data-confirm");
    };
    on(clearBtn, "click", () => {
      if (pen.count() === 0) {
        say("The pad is already empty.");
        return;
      }
      if (clearBtn.dataset.confirm) {
        resetClear();
        pen.clear();
        say("Pad cleared.");
        return;
      }
      clearBtn.dataset.confirm = "1";
      clearBtn.textContent = "Sure? Clear";
      say("Press clear again to erase everything.");
      confirmTimer = later(resetClear, 3500);
    });
    cleanups.push(() => window.clearTimeout(confirmTimer));

    on(hi, "click", () => {
      if (!reduced) {
        face(false);
        rig.mood("grin", 0.15);
        rig.wave(2);
        rig.hop(8);
        later(() => rig.mood("smile", 0.2), 1200);
      }
      say("The stickman waves.");
    });

    const enable = [eraserBtn, sizeInput, hi, colors] as const;
    enable.forEach((el) => (el.disabled = false));
    undoBtn.disabled = false;
    clearBtn.disabled = false;
    cleanups.push(() => {
      enable.forEach((el) => (el.disabled = true));
      undoBtn.disabled = true;
      clearBtn.disabled = true;
    });
  })();

  /* ─────────────────────────── 03 · debugging incident ─────────────────────────── */
  (() => {
    const stage = q("[data-pg=inc-stage]");
    const btn = q<HTMLButtonElement>("[data-pg=inc-run]");
    const status = q("[data-pg=inc-status]");
    const figEl = q("[data-pg-fig=incident]");
    const svg = stage?.querySelector<SVGSVGElement>("svg");
    const box = svg?.querySelector<SVGGElement>("[data-g=box]");
    const crack = svg?.querySelector<SVGPathElement>("[data-g=crack]");
    const dust = svg?.querySelector<SVGPathElement>("[data-g=dust]");
    if (!stage || !btn || !status || !figEl || !svg || !box || !crack || !dust) return;

    const rig = newRig(figEl);
    rig.snap("idle");
    rig.set({ pop: 0 });
    if (!reduced) rig.life();

    const U = 4.8; // canvas units per percent of width
    const TABLE = { x: 390, y: 188, rot: 0 };
    const GROUND_Y = 242;
    const fig = { l: 18 };
    const mv = mover(figEl, figEl.parentElement as HTMLElement);
    cleanups.push(mv.dispose);
    let right = true;
    const placeFig = () => {
      mv.write(fig.l, mv.home.t);
      figEl.classList.toggle("is-flipped", !right);
      rig.setFlipped(!right);
    };
    const face = (r: boolean) => {
      right = r;
      placeFig();
    };

    // the box: from → held, blended by k; or free-falling
    const b = { x: TABLE.x, y: TABLE.y, rot: 0 };
    let from = { ...TABLE };
    let k = 0;
    let mode: "carry" | "free" = "carry";
    const heldPos = () => ({ x: fig.l * U + (right ? 68 : -68), y: 200, rot: 0 });
    const applyBox = () => {
      if (mode === "carry") {
        const h = heldPos();
        b.x = lerp(from.x, h.x, k);
        b.y = lerp(from.y, h.y, k);
        b.rot = lerp(from.rot, h.rot, k);
      }
      box.setAttribute("transform", `translate(${b.x} ${b.y}) rotate(${b.rot})`);
    };
    const reset = () => {
      fig.l = 18;
      right = true;
      from = { ...TABLE };
      k = 0;
      mode = "carry";
      placeFig();
      applyBox();
      gsap.set([crack, dust], { opacity: 0 });
      gsap.set(svg, { clearProps: "x" });
      rig.snap("idle");
      rig.set({ pop: 0, by: 0 });
    };

    const say = (lines: string[], err = false) => {
      status.classList.toggle("is-error", err);
      status.replaceChildren(
        ...lines.map((t) => {
          const s = document.createElement("span");
          s.textContent = t;
          return s;
        }),
      );
    };

    let running = false;
    const finish = () => {
      running = false;
      btn.disabled = false;
      btn.textContent = "Deploy again";
    };

    const runStill = () => {
      // reduced motion: the same story, as text only
      running = true;
      btn.disabled = true;
      say(["Deploying…"]);
      later(() => say([INCIDENT.error, INCIDENT.excuse], true), 1200);
      later(() => say([INCIDENT.recovered]), 3600);
      later(finish, 4200);
    };

    const play = () => {
      if (running) return;
      if (reduced) return runStill();
      running = true;
      btn.disabled = true;
      reset();
      const tl = gsap.timeline({
        onComplete: () => {
          timelines.delete(tl);
          tl.kill();
          finish();
        },
      });
      timelines.add(tl);
      const fMove = (to: number, pos: number, dur: number, ease = "power1.inOut") =>
        tl.to(fig, { l: to, duration: dur, ease, onUpdate: () => (placeFig(), applyBox()) }, pos);

      tl.call(() => say(["Deploying…"]), undefined, 0);
      // walk to the table
      tl.call(() => rig.anticipate(), undefined, 0);
      tl.call(() => (rig.walk(), face(true)), undefined, 0.35);
      fMove(58, 0.35, 1.5);
      tl.call(() => rig.stopWalk(), undefined, 1.85);
      // lift the box
      tl.to({ v: 0 }, { v: 1, duration: 0.35, onUpdate: function (this: gsap.core.Tween) { k = this.progress(); applyBox(); } }, 2.0);
      // carry it back
      tl.call(() => (rig.walk(), face(false)), undefined, 2.45);
      fMove(42, 2.45, 1.25);
      // trip
      tl.call(
        () => {
          rig.stopWalk();
          rig.pose("falling", 0.25);
          rig.mood("surprised", 0.1);
          // the box leaves his hands
          const h = heldPos();
          mode = "free";
          b.x = h.x;
          b.y = h.y;
          b.rot = 0;
          applyBox();
        },
        undefined,
        3.7,
      );
      fMove(39, 3.7, 0.4, "power2.out");
      tl.to(b, { x: b.x + 0, y: GROUND_Y, duration: 0.7, ease: "bounce.out", onUpdate: applyBox }, 3.75);
      tl.to(b, { rot: -10, duration: 0.5, ease: "power2.out", onUpdate: applyBox }, 3.75);
      tl.to(b, { x: `-=34`, duration: 0.7, ease: "power1.out", onUpdate: applyBox }, 3.75);
      tl.to([crack, dust], { opacity: 1, duration: 0.12 }, 4.2);
      tl.to(dust, { opacity: 0, duration: 0.9 }, 4.5);
      tl.to(svg, { x: 3, duration: 0.05, yoyo: true, repeat: 5, ease: "none" }, 4.2);
      tl.set(svg, { x: 0 }, 4.55);
      tl.call(
        () => {
          rig.mood("grimace", 0.15);
          say([INCIDENT.error], true);
        },
        undefined,
        4.6,
      );
      tl.call(() => say([INCIDENT.error, INCIDENT.excuse], true), undefined, 5.4);
      // recover
      tl.call(
        () => {
          rig.pose("idle", 0.5);
          rig.mood("smile", 0.2);
          // pick up the box where it lies
          from = { x: b.x, y: b.y, rot: b.rot };
          k = 0;
          mode = "carry";
        },
        undefined,
        6.6,
      );
      tl.to({ v: 0 }, { v: 1, duration: 0.4, onUpdate: function (this: gsap.core.Tween) { k = this.progress(); applyBox(); } }, 6.9);
      tl.call(() => (rig.walk(), face(true), gsap.to([crack], { opacity: 0, duration: 0.3 })), undefined, 7.4);
      fMove(58, 7.4, 1.5);
      tl.call(() => rig.stopWalk(), undefined, 8.9);
      // put it back on the table
      tl.call(() => (from = { ...TABLE }), undefined, 8.95);
      tl.to({ v: 1 }, { v: 0, duration: 0.35, onUpdate: function (this: gsap.core.Tween) { k = 1 - this.progress(); applyBox(); } }, 9.0);
      tl.call(
        () => {
          say([INCIDENT.recovered]);
          rig.mood("grin", 0.15);
          rig.wave(1);
        },
        undefined,
        9.4,
      );
      // and home again
      tl.call(() => (rig.walk(), face(false)), undefined, 10.4);
      fMove(18, 10.4, 1.3);
      tl.call(() => (rig.stopWalk(), rig.mood("smile", 0.2)), undefined, 11.7);
      tl.to({}, { duration: 0.2 }, 11.9);
    };

    reset();
    on(btn, "click", play);
    btn.disabled = false;
    cleanups.push(() => (btn.disabled = true));
  })();

  /* ─────────────────────────── final act ─────────────────────────── */
  (() => {
    const finalEl = q("[data-pg=final]");
    const seat = q("[data-pg-fig=final]");
    const cta = q<HTMLAnchorElement>("a[data-pg=cta]");
    const sketches = Array.from(section.querySelectorAll<SVGPathElement>("[data-pg=sketch]"));
    const copy = q<HTMLButtonElement>("[data-pg=copy]");
    const copyStatus = q("[data-pg=copy-status]");
    if (!finalEl || !seat || !cta) return;

    const rig = newRig(seat);
    const SIT = 40;
    const PEN = { px: 221, py: 103 + SIT, prot: 75, ps: stick.pencil.scale };
    // Reduced motion: nothing is staged, so he is already sitting; everyone else gets life once he sits.
    let tl: gsap.core.Timeline | null = null;
    let done = true;
    let pointing = false;

    // the finished state: sitting, pencil in hand, button drawn
    const finalPose = () => {
      rig.snap("seated");
      rig.set({ by: SIT, pop: 1, ...PEN });
    };
    finalPose();

    const point = () => {
      if (!done && tl) tl.progress(1);
      if (pointing) return;
      pointing = true;
      const r = cta.getBoundingClientRect();
      if (reduced) {
        rig.snap("seatedPointing");
        rig.set({ pop: 0 });
        return;
      }
      rig.pose("seatedPointing", 0.35);
      rig.to({ pop: 0, duration: 0.2 });
      rig.gazeAt(r.left + r.width / 2, r.top + r.height / 2);
    };
    const unpoint = () => {
      if (!pointing) return;
      pointing = false;
      if (reduced) {
        rig.snap("seated");
        rig.set({ pop: 1, ...PEN });
        return;
      }
      rig.pose("seated", 0.4);
      rig.to({ pop: 1, ...PEN, duration: 0.3 });
      rig.gaze(0, 0);
    };

    let touchTimer = 0;
    on(cta, "pointerenter", (e: PointerEvent) => e.pointerType !== "touch" && point());
    on(cta, "pointerleave", (e: PointerEvent) => e.pointerType !== "touch" && unpoint());
    on(cta, "focus", point);
    on(cta, "blur", unpoint);
    on(cta, "pointerdown", (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      point();
      window.clearTimeout(touchTimer);
      touchTimer = later(unpoint, 1400);
    });
    on(cta, "click", () => {
      if (!reduced) rig.mood("grin", 0.15);
    });

    if (copy && navigator.clipboard?.writeText) {
      copy.hidden = false;
      on(copy, "click", () => {
        navigator.clipboard
          .writeText(cta.getAttribute("href")!.replace(/^mailto:/, ""))
          .then(() => {
            copy.textContent = "Copied";
            if (copyStatus) copyStatus.textContent = "Email address copied.";
            later(() => (copy.textContent = "Copy"), 1800);
          })
          .catch(() => {
            if (copyStatus) copyStatus.textContent = "Could not copy. The address is shown beside the button.";
          });
      });
    }

    if (reduced) return;

    // ───────── staging: he walks in, sits, draws the button ─────────
    finalEl.classList.add("is-staged");
    rig.snap("idle");
    rig.set({ by: 0, pop: 0 });
    gsap.set(seat, { xPercent: -140 });
    gsap.set(cta, { opacity: 0, y: 8 });
    sketches.forEach((p) => {
      p.style.strokeDasharray = "1 1";
      p.style.strokeDashoffset = "1";
    });
    done = false;

    const wrapUp = () => {
      done = true;
      finalEl.classList.remove("is-staged");
      gsap.set(cta, { clearProps: "opacity,transform" });
      gsap.set(seat, { clearProps: "transform" });
      sketches.forEach((p) => {
        p.style.strokeDasharray = "";
        p.style.strokeDashoffset = "";
      });
      finalPose();
      rig.life();
    };

    const build = () => {
      const t = gsap.timeline({ paused: true, onComplete: wrapUp });
      timelines.add(t);
      t.call(() => rig.anticipate(), undefined, 0);
      t.call(() => rig.walk(), undefined, 0.35);
      t.to(seat, { xPercent: 0, duration: 1.5, ease: "power1.out" }, 0.35);
      t.call(() => rig.stopWalk(), undefined, 1.85);
      t.add(rig.pose("seated", 0.6), 1.95);
      t.to(rig.s, { by: SIT, duration: 0.6, ease: "power2.inOut", onUpdate: rig.touch }, 1.95);
      t.to(rig.s, { pop: 1, ...PEN, duration: 0.3, onUpdate: rig.touch }, 2.65);
      t.to(sketches, { strokeDashoffset: 0, duration: 1.3, ease: "power1.inOut", stagger: 0.25 }, 3.05);
      t.to(rig.s, { prot: 64, py: PEN.py + 3, duration: 0.17, yoyo: true, repeat: 9, ease: "sine.inOut", onUpdate: rig.touch }, 3.05);
      t.to(cta, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 4.45);
      t.call(() => rig.mood("grin", 0.2), undefined, 4.85);
      t.call(() => rig.mood("smile", 0.3), undefined, 5.7);
      t.to({}, { duration: 0.4 }, 5.15);
      return t;
    };
    tl = build();

    on(cta, "focus", () => tl?.progress(1));
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && tl && !done && tl.progress() === 0) {
          io.disconnect();
          tl.play();
        }
      },
      { threshold: 0.55 },
    );
    io.observe(finalEl);
    cleanups.push(() => io.disconnect());
  })();

  return {
    destroy: () => {
      cleanups.forEach((c) => c());
      timelines.forEach((t) => t.kill());
      timers.forEach((id) => window.clearTimeout(id));
      rigs.forEach((r) => r.destroy());
    },
  };
}
