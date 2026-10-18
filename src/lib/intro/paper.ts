import gsap from "gsap";

export interface PaperEls {
  sheet: HTMLElement;
  shade: HTMLElement;
  part2: HTMLElement;
  part2Heading: HTMLElement;
  part2Items: HTMLElement[];
}

export interface Paper {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  isBusy: () => boolean;
  /** Jump to a state without animating (deep links, skip, resize). */
  set: (open: boolean) => void;
  destroy: () => void;
}

const html = document.documentElement;
const HASH = "#part-02";
/** Any of these means "Part 02 or later is showing": the hero sheet stays away. */
const isOpenHash = (h: string) => /^#(part-0[234]|contact|milestone-[0-9])$/.test(h);

/**
 * The paper-lift. Part 01 is a sheet laid over Part 02. It is pinched at its
 * top edge, its bottom edge rises toward the viewer, then the whole sheet
 * swings up and away, uncovering the page beneath it.
 *
 * Scrolling is locked only while the sheet is on top. Once it has left, the
 * document scrolls normally and Part 02 owns focus.
 */
export function createPaper(
  els: PaperEls,
  reduced: boolean,
  hooks: { onOpened?: () => void; onClosed?: () => void } = {},
): Paper {
  const { sheet, shade, part2, part2Heading, part2Items } = els;
  let open = false;
  let busy = false;
  let tl: gsap.core.Timeline | null = null;

  const lockScroll = (lock: boolean) => {
    html.classList.toggle("hero-open", lock);
  };

  const sync = (isOpen: boolean) => {
    open = isOpen;
    html.classList.toggle("part2-open", isOpen);
    lockScroll(!isOpen);
    sheet.toggleAttribute("inert", isOpen);
    part2.toggleAttribute("inert", !isOpen);
    sheet.setAttribute("aria-hidden", String(isOpen));
    part2.removeAttribute("aria-hidden");
    if (!isOpen) part2.setAttribute("aria-hidden", "true");
  };

  const clearSheet = () => {
    gsap.set([sheet, shade], { clearProps: "all" });
    gsap.set(part2Items, { clearProps: "all" });
    gsap.set(part2, { clearProps: "all" });
  };

  const setHash = (on: boolean, push: boolean) => {
    try {
      if (on && !isOpenHash(location.hash)) {
        history[push ? "pushState" : "replaceState"]({ part: 2 }, "", HASH);
      } else if (!on && isOpenHash(location.hash)) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    } catch {
      /* sandboxed frames can refuse history changes; navigation still works */
    }
  };

  const doOpen = (push = true) => {
    if (open || busy) return;
    busy = true;
    sheet.style.pointerEvents = "none";
    sheet.setAttribute("aria-busy", "true");
    part2.removeAttribute("inert"); // visible underneath while the sheet leaves
    window.scrollTo(0, 0);
    setHash(true, push);

    const done = () => {
      busy = false;
      sheet.removeAttribute("aria-busy");
      clearSheet();
      sync(true);
      part2Heading.focus({ preventScroll: true });
      hooks.onOpened?.();
      reconcile();
    };

    if (reduced) {
      tl = gsap.timeline({ onComplete: done });
      tl.to(sheet, { opacity: 0, duration: 0.35, ease: "power1.out" });
      return;
    }

    gsap.set(sheet, { transformPerspective: 1800, transformOrigin: "50% 0%", willChange: "transform" });
    gsap.set(part2Items, { y: 36, opacity: 0 });
    gsap.set(part2, { scale: 0.985, transformOrigin: "50% 30%" });
    tl = gsap.timeline({ onComplete: done });
    // 1. a lift: the bottom edge comes up off the desk, shadow deepens
    tl.to(sheet, { rotateX: 16, scale: 1.015, y: -6, duration: 0.55, ease: "power2.out" }, 0);
    tl.to(sheet, { boxShadow: "0 40px 90px rgba(20,17,15,0.38), 0 8px 24px rgba(20,17,15,0.18)", duration: 0.55, ease: "power2.out" }, 0);
    tl.to(shade, { opacity: 1, duration: 0.9, ease: "power1.in" }, 0.1);
    // 2. the sheet swings up and away
    tl.to(sheet, { rotateX: 68, yPercent: -108, duration: 1.0, ease: "power3.in" }, 0.5);
    // 3. Part 02 settles into place underneath
    tl.to(part2, { scale: 1, duration: 1.3, ease: "power3.out" }, 0.5);
    tl.to(part2Items, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.09 }, 1.0);
  };

  const doClose = () => {
    if (!open || busy) return;
    busy = true;
    window.scrollTo(0, 0);
    sheet.style.pointerEvents = "none";
    lockScroll(true);
    html.classList.remove("part2-open");
    sheet.removeAttribute("inert");
    sheet.setAttribute("aria-hidden", "false");
    sheet.setAttribute("aria-busy", "true");

    const done = () => {
      busy = false;
      open = false;
      sheet.removeAttribute("aria-busy");
      sheet.style.pointerEvents = "";
      clearSheet();
      sync(false);
      setHash(false, false);
      sheet.querySelector<HTMLElement>("[data-cta='primary']")?.focus({ preventScroll: true });
      hooks.onClosed?.();
      reconcile();
    };

    if (reduced) {
      gsap.set(sheet, { opacity: 0 });
      tl = gsap.timeline({ onComplete: done });
      tl.to(sheet, { opacity: 1, duration: 0.35 });
      return;
    }

    gsap.set(sheet, { transformPerspective: 1800, transformOrigin: "50% 0%", rotateX: 68, yPercent: -108, willChange: "transform" });
    tl = gsap.timeline({ onComplete: done });
    tl.to(shade, { opacity: 1, duration: 0.01 }, 0);
    tl.to(sheet, { rotateX: 14, yPercent: 0, duration: 0.95, ease: "power3.out" }, 0);
    tl.to(sheet, { rotateX: 0, scale: 1, y: 0, boxShadow: "0 0 0 rgba(20,17,15,0)", duration: 0.5, ease: "power2.inOut" }, 0.75);
    tl.to(shade, { opacity: 0, duration: 0.6 }, 0.6);
  };

  /** The URL is the source of truth: if it disagrees with the UI, follow it. */
  const reconcile = () => {
    if (busy) return;
    const want = isOpenHash(location.hash);
    if (want && !open) doOpen(false);
    else if (!want && open) doClose();
  };
  // A Back/Forward press during a transition is picked up when it finishes.
  const onPop = () => reconcile();
  window.addEventListener("popstate", onPop);

  return {
    open: () => doOpen(true),
    close: () => {
      // If we pushed the Part 02 entry, popping it closes the sheet too.
      if (history.state && (history.state as { part?: number }).part === 2) history.back();
      else doClose();
    },
    isOpen: () => open,
    isBusy: () => busy,
    set: (v: boolean) => {
      tl?.kill();
      busy = false;
      clearSheet();
      sync(v);
    },
    destroy: () => {
      window.removeEventListener("popstate", onPop);
      tl?.kill();
    },
  };
}
