import Stickman from "../Stickman";
import { CONTACT } from "@/lib/playground/data";

// A wobbly outline, drawn twice, a little off true: it is a sketch of the button.
const SKETCH_A =
  "M34 8 C92 3 208 7 268 9 C291 12 297 34 296 52 C295 76 288 91 262 92 C200 97 100 94 40 93 C12 92 4 72 5 50 C6 26 10 12 36 7";
const SKETCH_B =
  "M44 5 C104 9 196 3 262 6 C289 9 299 30 297 50 C296 72 285 94 256 95 C196 92 108 98 36 96 C9 94 2 70 3 46 C4 24 14 8 40 4";

function Arrow() {
  return (
    <svg className="btn-arrow" viewBox="0 0 22 14" aria-hidden="true" focusable="false">
      <path d="M1 7.4 C6 6.6 12 7.6 20 7 M14.4 1.6 L20.2 7 L14.6 12.6" />
    </svg>
  );
}

/**
 * The final act. Every link here is a plain anchor: with no JavaScript the
 * button, the three links and the address all work, and the stickman simply
 * sits there, already finished.
 */
export default function Contact() {
  return (
    <section id="contact" className="pg-contact" aria-labelledby="contact-title">
      <h2 id="contact-title" className="pg-title pg-title-xl">
        {CONTACT.headline.map((l, i) => (
          <span key={i} className="pg-tl">
            {l}{" "}
          </span>
        ))}
      </h2>
      <p className="pg-lede">{CONTACT.line}</p>

      <div className="pg-final" data-pg="final">
        <div className="pg-seatbox" aria-hidden="true">
          <span className="pg-stool" />
          <div className="pg-seat" data-pg-fig="final">
            <Stickman />
          </div>
        </div>
        <div className="pg-cta-wrap" data-pg="cta-wrap">
          <svg className="pg-sketch" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path data-pg="sketch" d={SKETCH_A} pathLength={1} />
            <path data-pg="sketch" d={SKETCH_B} pathLength={1} className="is-b" />
          </svg>
          <a
            className="pg-cta"
            href={CONTACT.cta.href}
            data-pg="cta"
            aria-label={`Email Milan Singla at ${CONTACT.email}`}
          >
            <span>{CONTACT.cta.label}</span>
            <Arrow />
          </a>
        </div>
      </div>

      <ul className="pg-links">
        <li>
          <span className="pg-links-k">Email</span>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <button type="button" className="pg-copy" data-pg="copy" hidden>
            Copy
          </button>
        </li>
        <li>
          <span className="pg-links-k">GitHub</span>
          <a href={CONTACT.github.url} target="_blank" rel="noopener noreferrer">
            {CONTACT.github.label}
          </a>
        </li>
        <li>
          <span className="pg-links-k">LinkedIn</span>
          <a href={CONTACT.linkedin.url} target="_blank" rel="noopener noreferrer">
            {CONTACT.linkedin.label}
          </a>
        </li>
      </ul>
      <p className="sr-only" role="status" aria-live="polite" data-pg="copy-status" />
    </section>
  );
}
