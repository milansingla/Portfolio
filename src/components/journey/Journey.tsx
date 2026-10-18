import Stickman from "../Stickman";
import { MILESTONES, JOURNEY_TITLE, JOURNEY_LEAD, DOOR_LABEL, type IllustrationId } from "@/lib/journey/data";
import {
  FoundationsIllustration,
  FullStackIllustration,
  ExperimentsIllustration,
  ProductIllustration,
  NextIllustration,
  DoorIllustration,
} from "./Illustrations";

const ILLUSTRATIONS: Record<IllustrationId, () => React.ReactElement> = {
  foundations: FoundationsIllustration,
  fullstack: FullStackIllustration,
  experiments: ExperimentsIllustration,
  product: ProductIllustration,
  next: NextIllustration,
};

/** Splits a heading into masked words so it can be revealed line by line. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="jw">
            <span className="jw-i">{w}</span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 22 14" aria-hidden="true" focusable="false">
      <path d="M1 7.4 C6 6.6 12 7.6 20 7 M14.4 1.6 L20.2 7 L14.6 12.6" />
    </svg>
  );
}

/**
 * Part 02 — The Engineer's Journey.
 *
 * Everything meaningful is ordinary document-flow HTML. The road, the walker
 * and the branches are decorative layers added on top by the journey
 * controller; without them (or without animation) the section still reads as
 * five labelled milestones and a link to Part 03.
 */
export default function Journey() {
  return (
    <section
      id="part-02"
      className="journey"
      data-el="part2"
      data-j="section"
      aria-labelledby="journey-title"
    >
      <header className="chrome j-chrome" data-open-reveal>
        <button type="button" className="j-back" data-el="back">
          <span aria-hidden="true">↑</span> Back to the sketch
        </button>
      </header>

      <div className="journey-track" data-j="track">
        {/* decorative layers */}
        <svg className="road" data-j="road" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="road-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#14110f" />
              <stop offset="1" stopColor="#14110f" />
            </linearGradient>
          </defs>
          <path className="road-trace" data-j="trace" d="M0 0" />
          <g data-j="joins" />
          <path className="road-main" data-j="main" d="M0 0" />
          <g data-j="nodes" />
        </svg>
        <div className="walker" data-j="walker" aria-hidden="true">
          <Stickman />
        </div>

        <nav className="j-rail" aria-label="Journey milestones" data-j="rail">
          <ol>
            {MILESTONES.map((m, i) => (
              <li key={m.id}>
                <a href={`#milestone-${i + 1}`} data-rail={i} aria-label={`${m.label}`}>
                  <span>{m.n}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* the opening screen */}
        <div className="j-intro" data-j="intro">
          <h2 id="journey-title" tabIndex={-1} data-el="part2-heading" data-open-reveal>
            <Words text={JOURNEY_TITLE} />
          </h2>
          <p className="j-lead" data-open-reveal>
            {JOURNEY_LEAD}
          </p>
          <span className="j-anchor" data-anchor="start" aria-hidden="true" />
          <p className="j-cue" data-j="cue" aria-hidden="true">
            <span>Scroll to follow the road</span>
            <svg viewBox="0 0 14 22" focusable="false">
              <path d="M7 1 C6.4 7 7.6 13 7 20 M1.4 14.6 L7 20.4 L12.6 14.6" />
            </svg>
          </p>
        </div>

        {/* the five milestones */}
        <ol className="milestones">
          {MILESTONES.map((m, i) => {
            const Ill = ILLUSTRATIONS[m.id];
            const labelRest = m.label.replace(/^\d+ \/ /, "");
            return (
              <li key={m.id} className="m-item">
                <article
                  id={`milestone-${i + 1}`}
                  className="milestone"
                  data-m={i}
                  data-branch={m.branch}
                  aria-labelledby={`m-title-${i + 1}`}
                >
                  <span className="j-anchor" data-anchor={i + 1} aria-hidden="true" />
                  <div className="m-copy">
                    <button type="button" className="m-label" data-m-btn={i} aria-describedby={`m-title-${i + 1}`}>
                      <span className="m-num">{m.n}</span>
                      <span className="m-label-text">
                        <span aria-hidden="true">/ </span>
                        {labelRest}
                      </span>
                      <Arrow />
                      <span className="sr-only"> — highlight this stop on the road</span>
                    </button>
                    <h3 id={`m-title-${i + 1}`} className="m-title">
                      <Words text={m.title} />
                    </h3>
                    <p className="m-body">{m.body}</p>
                    {m.facts && (
                      <div className="m-facts">
                        <h4 className="m-facts-h">{m.facts.heading}</h4>
                        <ul className={m.facts.chips ? "m-chips" : "m-list"}>
                          {m.facts.items.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <figure className="m-ill" data-m-ill aria-hidden="true">
                    <Ill />
                  </figure>
                </article>
              </li>
            );
          })}
        </ol>

        {/* the door */}
        <div className="j-end" data-j="end">
          <a className="door" href="#part-03" data-j="door" aria-label={`${DOOR_LABEL.toLowerCase()} — continue to Part 03`}>
            <DoorIllustration label={["THINGS", "I’VE", "BUILT"]} />
            <span className="j-anchor" data-anchor="door" aria-hidden="true" />
            <span className="door-cap" aria-hidden="true">
              Continue to Part 03
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
