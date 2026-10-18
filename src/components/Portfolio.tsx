"use client";

import { useEffect, useRef } from "react";
import Stickman from "./Stickman";
import Journey from "./journey/Journey";
import Part03 from "./journey/Part03";
import Part04 from "./journey/Part04";

const FIRST = "MILAN".split("");
const LAST = "SINGLA".split("");

const HEADLINE: Array<{ w: string; em?: boolean }> = [
  { w: "I" },
  { w: "BUILD" },
  { w: "THINGS" },
  { w: "THAT" },
  { w: "PROBABLY" },
  { w: "SHOULDN’T", em: true },
  { w: "WORK" },
  { w: "THIS" },
  { w: "WELL." },
];

// One hand-drawn line, in a 1000 × 60 box. It drifts downhill as the pencil
// loses confidence, and its tail is the reason for the fall.
const UL_MAIN =
  "M80 15 C140 11 205 19 280 14 S420 20 505 16 S650 24 735 21 S860 29 930 31";
const UL_TAIL = "M930 31 C962 29 992 38 974 47 C958 55 997 52 995 59";

function Arrow() {
  return (
    <svg className="btn-arrow" viewBox="0 0 22 14" aria-hidden="true" focusable="false">
      <path d="M1 7.4 C6 6.6 12 7.6 20 7 M14.4 1.6 L20.2 7 L14.6 12.6" />
    </svg>
  );
}

export default function Portfolio() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let disposed = false;
    const teardown: Array<() => void> = [];
    const html = document.documentElement;
    const w = window as unknown as { __peReady?: boolean; __peFallback?: () => void };
    w.__peReady = true; // tells the boot script's watchdog that the app started
    if (html.classList.contains("fallback")) return; // watchdog already showed the finished page

    (async () => {
      const [{ default: gsap }, { Rig }, intro, paperMod, inter, journeyMod, projectsMod, playgroundMod] = await Promise.all([
        import("gsap"),
        import("@/lib/stickman/rig"),
        import("@/lib/intro/intro"),
        import("@/lib/intro/paper"),
        import("@/lib/intro/interactions"),
        import("@/lib/journey/controller"),
        import("@/lib/projects/controller"),
        import("@/lib/playground/controller"),
      ]);
      // Webfonts change heading widths, which moves everything the controllers measure.
      await (window as unknown as { __fontsReady?: Promise<void> }).__fontsReady;
      if (disposed) return;

      const q = <T extends Element>(sel: string) => host.querySelector<T>(sel)!;
      const qa = <T extends Element>(sel: string) => Array.from(host.querySelectorAll<T>(sel));
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const forced = /[?&]intro=full/.test(location.search);
      const debug = /[?&]debug/.test(location.search);

      const sheet = q<HTMLElement>("[data-el='sheet']");
      const figure = q<HTMLElement>("[data-el='figure']");
      const rig = new Rig(figure);
      rig.setFlipped(true);
      teardown.push(() => rig.destroy());

      const els = {
        root: host,
        figure,
        underline: q<SVGSVGElement>("[data-el='underline']"),
        ulMain: q<SVGPathElement>("[data-el='ul-main']"),
        ulTail: q<SVGPathElement>("[data-el='ul-tail']"),
        chars: qa<HTMLElement>(".ch"),
        words: qa<HTMLElement>(".hw-i"),
        support: q<HTMLElement>("[data-el='support']"),
        btns: qa<HTMLElement>(".ctas .btn"),
        bubble: q<HTMLElement>("[data-el='bubble']"),
        bubbleText: q<HTMLElement>("[data-el='bubble-text']"),
      };

      // ───────── Part 02 hand-off ─────────
      const part2 = q<HTMLElement>("[data-el='part2']");
      const paper = paperMod.createPaper(
        {
          sheet,
          shade: q<HTMLElement>("[data-el='shade']"),
          part2,
          part2Heading: q<HTMLElement>("[data-el='part2-heading']"),
          part2Items: qa<HTMLElement>("[data-open-reveal]"),
        },
        reduced,
        { onOpened: () => journey?.start(), onClosed: () => journey?.reset() },
      );
      teardown.push(() => paper.destroy());

      const journey = journeyMod.createJourney(host, reduced);
      teardown.push(() => journey.destroy());
      const projects = projectsMod.createProjects(host, reduced);
      teardown.push(() => projects.destroy());
      const playground = playgroundMod.createPlayground(host, reduced);
      teardown.push(() => playground.destroy());
      const deepLinked = html.classList.contains("part2-open");
      paper.set(deepLinked);
      if (deepLinked) journey.start();

      const explore = () => {
        if (!paper.isBusy() && !paper.isOpen()) {
          inters?.closeBubble();
          paper.open();
        }
      };

      const primary = q<HTMLAnchorElement>("[data-cta='primary']");
      const onPrimary = (e: MouseEvent) => {
        // modified clicks (new tab etc.) keep native anchor behaviour
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        explore();
      };
      primary.addEventListener("click", onPrimary);
      teardown.push(() => primary.removeEventListener("click", onPrimary));

      const back = q<HTMLButtonElement>("[data-el='back']");
      const onBack = () => paper.close();
      back.addEventListener("click", onBack);
      teardown.push(() => back.removeEventListener("click", onBack));

      // ───────── post-intro behaviour (bound once the entrance has settled) ─────────
      let inters: ReturnType<typeof inter.bindInteractions> | null = null;
      const bind = () => {
        if (inters) return;
        inters = inter.bindInteractions(
          rig,
          {
            root: host,
            figure,
            primary,
            secondary: q<HTMLButtonElement>("[data-cta='secondary']"),
            bubble: els.bubble,
            bubbleText: els.bubbleText,
            bubbleMeta: q<HTMLElement>("[data-el='bubble-meta']"),
            bubbleLink: q<HTMLButtonElement>("[data-el='bubble-link']"),
            onExplore: explore,
          },
          reduced && !forced,
        );
        teardown.push(() => inters?.destroy());
      };

      // ───────── the entrance ─────────
      const settle = () => {
        html.classList.remove("intro");
        intro.applyFinal(rig, els);
        // Interactions are bound only now: finishing the intro clears every
        // tween on the rig and the buttons, which would break earlier ones.
        bind();
        rig.gaze(0, 0);
      };

      const skip = q<HTMLButtonElement>("[data-el='skip']");
      let handle: ReturnType<typeof intro.playIntro> | null = null;

      if (html.classList.contains("intro")) {
        try {
          handle = intro.playIntro(rig, els, {
            allowBail: !forced,
            onDone: () => {
              handle = null;
              settle();
            },
            onBail: () => {
              handle?.kill();
              handle = null;
              settle();
            },
          });
          if (debug) (window as unknown as { __intro: unknown }).__intro = handle.tl;
        } catch (err) {
          console.error("Intro failed; showing the finished page.", err);
          settle();
        }
      } else {
        settle();
      }

      const onSkip = () => {
        if (!handle) return;
        handle.kill();
        handle = null;
        settle();
        primary.focus({ preventScroll: true });
      };
      skip.addEventListener("click", onSkip);
      const onKey = (e: KeyboardEvent) => {
        if (handle && (e.key === "Escape" || e.key === " " || e.key === "Enter")) {
          if (document.activeElement === skip && e.key !== "Escape") return; // let the button handle itself
          e.preventDefault();
          onSkip();
        }
      };
      document.addEventListener("keydown", onKey);
      teardown.push(() => {
        skip.removeEventListener("click", onSkip);
        document.removeEventListener("keydown", onKey);
        handle?.kill();
      });

      // A resized window mid-intro makes our measurements stale: finish cleanly.
      const onResize = () => handle && onSkip();
      window.addEventListener("resize", onResize);
      teardown.push(() => window.removeEventListener("resize", onResize));

      // Watchdog: never leave a visitor staring at a half-built page.
      const wd = window.setTimeout(() => handle && onSkip(), 30000);
      teardown.push(() => clearTimeout(wd));
      void gsap;
    })().catch((err) => {
      console.error("Animation layer failed to load; showing the finished page.", err);
      html.classList.remove("intro");
      w.__peFallback?.();
    });

    return () => {
      disposed = true;
      teardown.forEach((t) => t());
    };
  }, []);

  return (
    <div ref={root}>
      {/* ═════════ PART 01 — THE UNEXPECTED ENTRANCE ═════════ */}
      <section id="part-01" className="sheet" data-el="sheet" aria-label="Part 01 — The Unexpected Entrance">
        <div className="sheet-shade" data-el="shade" aria-hidden="true" />

        <header className="chrome">
          <span>
            <b>Milan Singla</b>
          </span>
        </header>

        <div className="stage">
         <div className="stage-inner">
          <div className="namewrap">
            <h1 className="name">
              <span className="sr-only">Milan Singla</span>
              <span aria-hidden="true">
                <span className="word">
                  {FIRST.map((c, i) => (
                    <span className="cm i-hide" key={i}>
                      <span className="ch">{c}</span>
                    </span>
                  ))}
                </span>{" "}
                <span className="word">
                  {LAST.map((c, i) => (
                    <span className="cm i-hide" key={i}>
                      <span className="ch">{c}</span>
                    </span>
                  ))}
                </span>
              </span>
            </h1>
            <svg
              className="underline"
              data-el="underline"
              viewBox="0 0 1000 60"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path className="i-hide" data-el="ul-main" d={UL_MAIN} />
              <path className="i-hide" data-el="ul-tail" d={UL_TAIL} />
            </svg>
          </div>

          <div className="row">
            <div className="copy">
              <p className="headline">
                <span className="sr-only">I build things that probably shouldn’t work this well.</span>
                <span aria-hidden="true">
                  {HEADLINE.map((h, i) => (
                    <span key={i}>
                      <span className="hw i-hide">
                        <span className="hw-i">{h.em ? <em>{h.w}</em> : h.w}</span>
                      </span>
                      {i < HEADLINE.length - 1 ? " " : ""}
                    </span>
                  ))}
                </span>
              </p>
              <p className="support i-hide" data-el="support">
                Full-stack development. AI experiments. Products built from scratch.
              </p>
              <div className="ctas">
                <a className="btn btn-primary i-hide" href="#part-02" data-cta="primary">
                  <span className="btn-label">
                    <span className="btn-text" data-text="EXPLORE MY WORK">
                      EXPLORE MY WORK
                    </span>
                  </span>
                  <Arrow />
                </a>
                <button
                  type="button"
                  className="btn btn-ghost i-hide"
                  data-cta="secondary"
                  aria-expanded="false"
                  aria-controls="who-bubble"
                >
                  <span className="btn-label">
                    <span className="btn-text" data-text="WHO’S THIS GUY?">
                      WHO’S THIS GUY?
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div className="figure is-flipped i-hide" data-el="figure">
              <Stickman />
              <div className="bubble" id="who-bubble" data-el="bubble" hidden>
                <p data-el="bubble-text" />
                <p className="bubble-meta" data-el="bubble-meta" hidden />
                <button type="button" className="bubble-link" data-el="bubble-link" hidden>
                  Show me the work →
                </button>
              </div>
            </div>
          </div>
         </div>
        </div>

        <footer className="chrome">
          <span>The Unexpected Entrance</span>
          <button type="button" className="skip" data-el="skip">
            Skip intro
          </button>
        </footer>
      </section>

      {/* ═════════ PART 02 — THE ENGINEER'S JOURNEY ═════════ */}
      <main>
        <Journey />
        {/* ═════════ PART 03 — THE THINGS I'VE BUILT ═════════ */}
        <Part03 />
        {/* ═════════ PART 04 — THE PLAYGROUND AND THE FINAL ACT ═════════ */}
        <Part04 />
      </main>
      <Part03 overlay />
    </div>
  );
}
