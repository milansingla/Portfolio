import gsap from "gsap";
import type { Rig } from "../stickman/rig";

export interface InteractionEls {
  root: HTMLElement;
  figure: HTMLElement;
  primary: HTMLElement;
  secondary: HTMLButtonElement;
  bubble: HTMLElement;
  bubbleText: HTMLElement;
  bubbleMeta: HTMLElement;
  bubbleLink: HTMLButtonElement;
  onExplore: () => void;
}

export const WHO_TEXT = "That’s Milan. I’m just the intern.";
export const WHO_META = "Full-stack development. AI experiments. Products built from scratch.";

/**
 * Everything that happens after the entrance: the figure watches your cursor
 * (or finger), blinks, glances around, and reacts to the buttons.
 */
export function bindInteractions(rig: Rig, els: InteractionEls, reduced: boolean) {
  const cleanups: Array<() => void> = [];
  const on = <T extends EventTarget>(t: T, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, opts);
    cleanups.push(() => t.removeEventListener(type, fn, opts));
  };

  // ───────── gaze: follows pointer or finger ─────────
  let last = { x: 0, y: 0, has: false };
  let lastMove = performance.now();
  let raf = 0;
  let awake = false;
  const pump = () => {
    raf = 0;
    if (last.has) rig.gazeAt(last.x, last.y);
  };
  const aim = (x: number, y: number) => {
    last = { x, y, has: true };
    lastMove = performance.now();
    if (awake && !raf) raf = requestAnimationFrame(pump);
  };
  if (!reduced) {
    on(window, "pointermove", ((e: PointerEvent) => aim(e.clientX, e.clientY)) as EventListener, { passive: true });
    on(window, "pointerdown", ((e: PointerEvent) => aim(e.clientX, e.clientY)) as EventListener, { passive: true });
    on(window, "touchmove", ((e: TouchEvent) => {
      const t = e.touches[0];
      if (t) aim(t.clientX, t.clientY);
    }) as EventListener, { passive: true });
  }

  // ───────── idle life: breathing, blinking, the odd glance ─────────
  // Runs only while the sheet is what the visitor is looking at. Once Part 02 has
  // taken over (html.part2-open) the breath, the timers and the cursor-following all
  // stop, and they resume if the visitor comes back to the sketch.
  let glanceLocked = false;
  let breath: gsap.core.Tween | null = null;
  let blinkTimer: number | undefined;
  let glanceTimer: number | undefined;
  const pending = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      pending.delete(id);
      fn();
    }, ms);
    pending.add(id);
  };
  const scheduleBlink = () => {
    blinkTimer = window.setTimeout(() => {
      rig.blink();
      if (Math.random() < 0.2) later(() => rig.blink(), 260);
      scheduleBlink();
    }, 2400 + Math.random() * 3600);
  };
  const scheduleGlance = () => {
    glanceTimer = window.setTimeout(() => {
      // only wander when nobody is steering
      if (performance.now() - lastMove > 3500 && !glanceLocked) {
        rig.gaze((Math.random() - 0.5) * 2, (Math.random() - 0.7) * 1.2);
        later(() => !glanceLocked && rig.gaze(0, 0), 900 + Math.random() * 700);
      }
      scheduleGlance();
    }, 3800 + Math.random() * 3000);
  };
  const wakeLife = () => {
    if (awake || reduced) return;
    awake = true;
    if (breath) breath.resume();
    else breath = gsap.to(rig.s, { nod: 1.2, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: rig.touch });
    scheduleBlink();
    scheduleGlance();
  };
  const sleepLife = () => {
    if (!awake) return;
    awake = false;
    breath?.pause();
    window.clearTimeout(blinkTimer);
    window.clearTimeout(glanceTimer);
    pending.forEach((id) => window.clearTimeout(id));
    pending.clear();
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const html = document.documentElement;
  const syncLife = () => (html.classList.contains("part2-open") ? sleepLife() : wakeLife());
  const lifeMo = new MutationObserver(syncLife);
  lifeMo.observe(html, { attributes: true, attributeFilter: ["class"] });
  cleanups.push(() => lifeMo.disconnect());
  syncLife();

  // ───────── buttons: hover/focus reactions ─────────
  const buttons = [els.primary, els.secondary];
  const rest = () => {
    glanceLocked = false;
    if (!bubbleOpen) rig.mood("smile", 0.25);
    if (last.has) rig.gazeAt(last.x, last.y);
    else rig.gaze(0, 0);
  };
  buttons.forEach((b) => {
    const isPrimary = b === els.primary;
    const enter = () => {
      if (bubbleOpen && !isPrimary) return;
      glanceLocked = true;
      const r = b.getBoundingClientRect();
      rig.gazeAt(r.left + r.width / 2, r.top + r.height / 2);
      if (!bubbleOpen) rig.mood(isPrimary ? "grin" : "smirk", 0.18);
      if (!reduced && isPrimary) rig.hop(7);
    };
    on(b, "pointerenter", ((e: PointerEvent) => { if (e.pointerType !== "touch") enter(); }) as EventListener);
    on(b, "pointerleave", ((e: PointerEvent) => { if (e.pointerType !== "touch") rest(); }) as EventListener);
    on(b, "focus", enter);
    on(b, "blur", rest);

    // bloom origin follows where the pointer entered
    on(b, "pointermove", ((e: PointerEvent) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      b.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    }) as EventListener, { passive: true });
  });

  // magnetic pull — fine pointers only
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    buttons.forEach((b) => {
      const qx = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3.out" });
      const qy = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3.out" });
      on(b, "pointermove", ((e: PointerEvent) => {
        const r = b.getBoundingClientRect();
        qx(((e.clientX - (r.left + r.width / 2)) / r.width) * 10);
        qy(((e.clientY - (r.top + r.height / 2)) / r.height) * 8);
      }) as EventListener, { passive: true });
      on(b, "pointerleave", (() => { qx(0); qy(0); }) as EventListener);
    });
  }

  // ───────── "WHO'S THIS GUY?" ─────────
  let bubbleOpen = false;
  let bubbleTween: gsap.core.Tween | null = null;
  let waveTl: gsap.core.Timeline | null = null;

  const showBubble = () => {
    bubbleOpen = true;
    els.secondary.setAttribute("aria-expanded", "true");
    els.bubbleText.textContent = WHO_TEXT;
    els.bubbleMeta.textContent = WHO_META;
    els.bubbleMeta.hidden = false;
    els.bubbleLink.hidden = false;
    els.bubble.hidden = false;
    els.bubble.removeAttribute("aria-hidden");
    els.bubble.setAttribute("role", "status");
    bubbleTween?.kill();
    bubbleTween = reduced
      ? gsap.set(els.bubble, { autoAlpha: 1, scale: 1 })
      : gsap.fromTo(els.bubble, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.8)" });
    rig.pose("waving", reduced ? 0.01 : 0.4, "back.out(1.6)");
    rig.mood("grin", 0.15);
    if (!reduced) waveTl = rig.wave(4);
    glanceLocked = true;
  };

  const hideBubble = (returnFocus = false) => {
    if (!bubbleOpen) return;
    bubbleOpen = false;
    els.secondary.setAttribute("aria-expanded", "false");
    bubbleTween?.kill();
    const finish = () => {
      els.bubble.hidden = true;
      els.bubbleMeta.hidden = true;
      els.bubbleLink.hidden = true;
      els.bubble.removeAttribute("role");
    };
    if (reduced) { gsap.set(els.bubble, { autoAlpha: 0 }); finish(); }
    else bubbleTween = gsap.to(els.bubble, { autoAlpha: 0, scale: 0.85, duration: 0.25, ease: "power2.in", onComplete: finish });
    waveTl?.kill();
    gsap.set(rig.s, { armR: 0 });
    rig.pose("idle", reduced ? 0.01 : 0.45, "power2.inOut");
    rig.mood("smile", 0.2);
    glanceLocked = false;
    if (returnFocus) els.secondary.focus({ preventScroll: true });
  };

  on(els.secondary, "click", () => (bubbleOpen ? hideBubble() : showBubble()));
  on(els.bubbleLink, "click", () => {
    hideBubble();
    els.onExplore();
  });
  on(document, "keydown", ((e: KeyboardEvent) => {
    if (e.key === "Escape" && bubbleOpen) {
      e.preventDefault();
      hideBubble(els.bubble.contains(document.activeElement));
    }
  }) as EventListener);
  on(document, "pointerdown", ((e: PointerEvent) => {
    if (!bubbleOpen) return;
    const t = e.target as Node;
    if (!els.bubble.contains(t) && !els.secondary.contains(t)) hideBubble();
  }) as EventListener);

  return {
    closeBubble: () => hideBubble(),
    destroy: () => {
      sleepLife();
      breath?.kill();
      waveTl?.kill();
      bubbleTween?.kill();
      cleanups.forEach((c) => c());
    },
  };
}
