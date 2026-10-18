import Stickman from "../Stickman";
import Terminal from "./Terminal";
import { COLORS, INCIDENT } from "@/lib/playground/data";

/** The three optional toys. The page is complete without any of them. */
export default function Playground() {
  return (
    <div className="pg-grid">
      {/* ───── 01 · secret terminal ───── */}
      <section className="pg-card pg-card-term" id="terminal" aria-labelledby="pg-t-term">
        <p className="pg-num">01</p>
        <h3 id="pg-t-term" className="pg-ctitle">
          Secret terminal
        </h3>
        <p className="pg-hint">Only four commands exist. Try them all.</p>
        <Terminal />
      </section>

      {/* ───── 02 · cursor artist ───── */}
      <section className="pg-card pg-card-art" id="artist" aria-labelledby="pg-t-art">
        <p className="pg-num">02</p>
        <h3 id="pg-t-art" className="pg-ctitle">
          Cursor artist
        </h3>
        <p className="pg-hint">
          A blank pad. Draw whatever you like with a mouse, finger or stylus. Nothing is saved or sent anywhere.
        </p>
        <div className="pg-pad" data-pg="pad">
          <canvas
            className="pg-canvas"
            data-pg="canvas"
            role="img"
            aria-label="Drawing pad. Draw freehand with a mouse, finger or stylus; the controls below change the brush."
          />
          <div className="pfig pg-fig" data-pg-fig="artist" style={{ left: "19%", top: "95%" }} aria-hidden="true">
            <Stickman />
          </div>
        </div>
        <div className="pg-tools" role="group" aria-label="Drawing tools">
          <fieldset className="pg-colors" data-pg="colors" disabled>
            <legend className="sr-only">Brush colour</legend>
            {COLORS.map((c, i) => (
              <label key={c.name} className="pg-swatch" title={c.name}>
                <input type="radio" name="pg-color" value={c.hex} defaultChecked={i === 0} />
                <span style={{ background: c.hex }} />
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </fieldset>
          <button type="button" className="pg-tool" data-pg="eraser" aria-pressed="false" disabled>
            Eraser
          </button>
          <label className="pg-size">
            <span>Size</span>
            <input type="range" min="2" max="28" defaultValue="5" data-pg="size" disabled />
          </label>
          <button type="button" className="pg-tool" data-pg="undo" disabled>
            Undo
          </button>
          <button type="button" className="pg-tool" data-pg="clear" disabled>
            Clear
          </button>
          <button type="button" className="pg-tool pg-tool-quiet" data-pg="hi" disabled>
            Say hi
          </button>
        </div>
        <noscript>
          <p className="pg-note">The drawing pad needs JavaScript. The rest of this page does not.</p>
        </noscript>
        <p className="sr-only" role="status" aria-live="polite" data-pg="art-status" />
      </section>

      {/* ───── 03 · debugging incident ───── */}
      <section className="pg-card pg-card-inc" id="incident" aria-labelledby="pg-t-inc">
        <div className="pg-inc-text">
          <p className="pg-num">03</p>
          <h3 id="pg-t-inc" className="pg-ctitle">
            Debugging incident
          </h3>
          <p className="pg-hint">A deploy that goes about as well as you would expect. It never leaves this box.</p>
          <button type="button" className="pg-btn pg-btn-solid" data-pg="inc-run" disabled>
            Deploy to production
          </button>
          <p className="pg-status" role="status" aria-live="polite" data-pg="inc-status">
            {INCIDENT.idle}
          </p>
        </div>
        <div className="pg-inc-stage" data-pg="inc-stage">
          <svg className="pg-inc-svg" viewBox="0 50 480 250" aria-hidden="true" focusable="false">
            <path className="pg-ink" d="M10 268 C120 266 300 270 470 267" />
            <g className="pg-ink">
              <path d="M296 214 H466" />
              <path d="M310 214 V268 M452 214 V268" />
            </g>
            <g data-g="box" transform="translate(390 188)">
              <rect className="pg-box" x="-62" y="-26" width="124" height="52" rx="3" />
              <path className="pg-ink-thin" d="M-62 -8 H62" />
              <text className="pg-box-label" x="0" y="13" textAnchor="middle">
                PRODUCTION
              </text>
              <path data-g="crack" className="pg-crack" d="M-6 -26 L2 -12 L-8 -2 L4 10 L-4 26" opacity="0" />
              <path data-g="dust" className="pg-ink-thin" d="M-76 24 L-92 20 M76 24 L92 20 M-68 8 L-82 0 M68 8 L82 0" opacity="0" />
            </g>
          </svg>
          <div className="pfig pg-fig" data-pg-fig="incident" style={{ left: "18%", top: "86.8%" }} aria-hidden="true">
            <Stickman />
          </div>
        </div>
      </section>
    </div>
  );
}
