import Playground from "../playground/Playground";
import Contact from "../playground/Contact";
import { PART4_INTRO, CONTACT, FOOTER } from "@/lib/playground/data";

/** Part 04 — The Playground and the Final Act. */
export default function Part04() {
  return (
    <section id="part-04" className="part4" data-el="part4" aria-labelledby="part4-title">
      <header className="chrome">
        <a className="j-back" href="#part-03">
          <span aria-hidden="true">↑</span> Back to the projects
        </a>
      </header>

      <div className="pg-intro">
        <p className="pg-kicker">{PART4_INTRO.kicker}</p>
        <h2 id="part4-title" className="pg-title">
          {PART4_INTRO.title.map((l, i) => (
            <span key={i} className="pg-tl">
              {l}{" "}
            </span>
          ))}
        </h2>
        <p className="pg-lede">{PART4_INTRO.line}</p>
      </div>

      <Playground />
      <Contact />

      <footer className="pg-footer">
        <div>
          <p className="pg-foot-name">Milan Singla</p>
          <p className="pg-foot-line">{FOOTER.line}</p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li>
              <a href={`mailto:${CONTACT.email}`}>Email</a>
            </li>
            <li>
              <a href={CONTACT.github.url} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a href={CONTACT.linkedin.url} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
            <li>
              <a href="#part-02">Back to the road</a>
            </li>
          </ul>
        </nav>
        <p className="pg-foot-copy">© {FOOTER.year} Milan Singla</p>
      </footer>
    </section>
  );
}
