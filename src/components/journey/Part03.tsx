import Stickman from "../Stickman";
import Projects from "../projects/Projects";
import { PART3_INTRO } from "@/lib/projects/data";

/**
 * Part 03 — The Things I've Built.
 *
 * The same intro text is rendered twice: once as the real section, and once as
 * the doorway overlay that the door opens onto, so the hand-off is seamless.
 */
function IntroText({ overlay }: { overlay: boolean }) {
  const Title = overlay ? "p" : "h2";
  return (
    <div className="p-intro" data-p-intro>
      <div className="p-intro-text">
        <p className="part3-kicker">{PART3_INTRO.kicker}</p>
        <Title
          className="part3-title"
          {...(overlay ? {} : { id: "part3-title", tabIndex: -1, "data-el": "part3-heading" })}
        >
          {PART3_INTRO.title.map((l, i) => (
            <span key={i} className="p-tl">
              <span className="p-tl-i">{l}</span>{" "}
            </span>
          ))}
        </Title>
        <p className="part3-line">{PART3_INTRO.line}</p>
      </div>
      {!overlay && (
        <div className="p-intro-fig" data-p-intro-fig aria-hidden="true">
          <div className="pfig pfig-intro" data-fig="intro">
            <Stickman />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Part03({ overlay = false }: { overlay?: boolean }) {
  if (overlay) {
    return (
      <div className="part3 part3-overlay" aria-hidden="true" data-j="doorway">
        <header className="chrome">
          <span />
        </header>
        <IntroText overlay />
      </div>
    );
  }
  return (
    <section id="part-03" className="part3" data-el="part3" aria-labelledby="part3-title">
      <header className="chrome">
        <a className="j-back" href="#part-02" data-el="to-journey">
          <span aria-hidden="true">↑</span> Back to the road
        </a>
      </header>
      <IntroText overlay={false} />
      <Projects />
    </section>
  );
}
