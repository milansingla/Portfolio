import Stickman from "../Stickman";
import { PROJECTS, PART4_TEASER, type Project, type Source, type ProjectId } from "@/lib/projects/data";
import {
  ShipyardIllustration,
  TermeduIllustration,
  MeetIllustration,
  NuroIllustration,
  Thread,
  Schematic,
  SIZES,
  type ThreadKind,
} from "./ProjectIllustrations";

const ILLUSTRATIONS: Record<ProjectId, () => React.ReactElement> = {
  shipyard: ShipyardIllustration,
  termedu: TermeduIllustration,
  "vrxed-meet": MeetIllustration,
  vrxnuro: NuroIllustration,
};

import { FIGURES } from "@/lib/projects/figures";

const THREADS: ThreadKind[] = ["box", "chalk", "fork"];

const SOURCE_LABEL: Record<Source, string> = {
  cv: "From the CV",
  repo: "In the repository",
  site: "From the live page",
};

function ExternalIcon() {
  return (
    <svg className="p-ext" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M4 10 L10 4 M5 4 H10 V9" />
    </svg>
  );
}

function Chapter({ p, i }: { p: Project; i: number }) {
  const Ill = ILLUSTRATIONS[p.id];
  const { w, h } = SIZES[p.id];
  const cvTech = p.tech.filter((t) => t.source === "cv");
  const repoTech = p.tech.filter((t) => t.source !== "cv");
  const shot = p.screenshots[0];
  const titleId = `${p.id}-title`;
  return (
    <article
      id={p.id}
      className={`p-chapter p-${p.layout}`}
      data-p-chapter={i}
      data-project={p.id}
      aria-labelledby={titleId}
    >
      <div className="p-text">
       <div className="p-head">
        <p className="p-kicker">
          <span className="p-num">{p.n}</span>
          <span>{p.category}</span>
        </p>
        <h3 id={titleId} className="p-title">
          {p.title}
        </h3>
        <p className="p-desc">{p.description}</p>
       </div>

       <div className="p-body">
        <dl className="p-meta">
          <div>
            <dt>Year</dt>
            <dd>{p.when}</dd>
          </div>
          {p.role && (
            <div>
              <dt>Role</dt>
              <dd>{p.role}</dd>
            </div>
          )}
        </dl>

        <ul className="p-tech" aria-label={`${p.title} technologies`}>
          {cvTech.map((t) => (
            <li key={t.name}>{t.name}</li>
          ))}
          {repoTech.map((t) => (
            <li key={t.name} className="is-repo" title="Seen in the project’s public repository">
              {t.name}
            </li>
          ))}
        </ul>

        <div className="p-links">
          {p.links.live && (
            <a className="p-link p-link-live" href={p.links.live.url} target="_blank" rel="noopener noreferrer">
              <span>Visit {p.links.live.label}</span>
              <ExternalIcon />
            </a>
          )}
          {p.links.repo && (
            <a className="p-link" href={p.links.repo.url} target="_blank" rel="noopener noreferrer">
              <span>{p.links.repo.label}</span>
              <ExternalIcon />
            </a>
          )}
        </div>

        <details className="p-more">
          <summary>
            <span>How it’s built</span>
            <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <path d="M2 5 L7 10 L12 5" />
            </svg>
          </summary>
          <div className="p-more-body">
            {p.details.map((d) => (
              <section key={d.heading}>
                <h4>{d.heading}</h4>
                <ul>
                  {d.items.map((f) => (
                    <li key={f.text}>
                      {f.text} <span className="p-src">{SOURCE_LABEL[f.source]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {p.screenshots.length > 1 && (
              <div className="p-gallery">
                {p.screenshots.slice(1).map((s) => (
                  <figure key={s.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} width={s.width} height={s.height} alt={s.alt} loading="lazy" decoding="async" />
                    <figcaption>{s.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </details>
       </div>
      </div>

      <figure className="p-stage" data-p-stage>
        <div className="p-canvas" data-p-canvas style={{ aspectRatio: `${w} / ${h}` }}>
          <Ill />
          {FIGURES[p.id].map((f, k) => (
            <div
              key={k}
              className={`pfig${f.flipped ? " is-flipped" : ""}`}
              data-fig={k}
              style={{ left: f.left, top: f.top }}
              aria-hidden="true"
            >
              <Stickman />
            </div>
          ))}
        </div>

        <div className="p-screen" data-p-screen>
          <div className="p-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{shot ? "screenshot" : "illustration"}</span>
          </div>
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} loading="lazy" decoding="async" />
          ) : (
            <div className="p-schem" role="img" aria-label={`${p.schematicLabel}. A sketch of the kind of screen this project has.`}>
              <Schematic id={p.id as Exclude<ProjectId, "shipyard">} />
            </div>
          )}
          <p className="p-screen-cap">{shot ? shot.caption : p.schematicLabel}</p>
        </div>

        <figcaption className="p-cap">
          <span className="sr-only">Illustration: </span>
          {p.concept}
          <span className="sr-only">. {p.illustrationAlt}</span>
        </figcaption>
      </figure>
    </article>
  );
}

export default function Projects() {
  return (
    <div className="p-list" data-p-list>
      {PROJECTS.map((p, i) => (
        <div key={p.id} className="p-item">
          <Chapter p={p} i={i} />
          {i < THREADS.length && <Thread kind={THREADS[i]} />}
        </div>
      ))}
      <div className="p-end">
        <Thread kind="pencil" />
        <a className="p-end-line p-end-link" href="#part-04">
          {PART4_TEASER} <span aria-hidden="true">↓</span>
        </a>
      </div>
    </div>
  );
}
