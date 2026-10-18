import { stick, VB, colour } from "@/lib/stickman/poses";

/**
 * The stickman. Server-rendered in its final resting pose (idle, facing the
 * headline) so the page is complete before — or without — any JavaScript.
 * The rig in src/lib/stickman/rig.ts drives it through data-part hooks.
 */
export default function Stickman() {
  const idle = stick.poses.idle;
  const mood = stick.moods.smile; // the resting expression
  const h = stick.head;
  const ground = stick.pencil.ground;

  return (
    <svg
      className="stick"
      viewBox={VB.x + " " + VB.y + " " + VB.w + " " + VB.h}
      aria-hidden="true"
      focusable="false"
      data-part="svg"
    >
      <path data-part="shadow" d={stick.shadow} className="stick-shadow" />
      <g data-part="dust" className="stick-dust">
        {stick.dust.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <g data-part="body">
        <path data-part="torso" d={idle.parts.torso} className="stick-line" />
        <path data-part="legL" d={idle.parts.legL} className="stick-line" />
        <path data-part="legR" d={idle.parts.legR} className="stick-line" />
        <path data-part="armL" d={idle.parts.armL} className="stick-line" />
        <path data-part="armR" d={idle.parts.armR} className="stick-line" />

        <g data-part="extras" className="stick-extras">
          <path data-part="extra0" d="M0 0" />
          <path data-part="extra1" d="M0 0" />
          <path data-part="extra2" d="M0 0" />
        </g>

        <g data-part="head" transform={`translate(${idle.head.x} ${idle.head.y})`}>
          <path data-part="skull" d={h.path} className="stick-line" />
          <path data-part="sweat" d={h.sweat} className="stick-sweat" />
          <path data-part="browL" d="M-15 -14 L-5 -14" className="stick-face" opacity="0" />
          <path data-part="browR" d="M5 -14 L15 -14" className="stick-face" opacity="0" />
          {h.eyes.map((e, i) => (
            <g key={i} data-part={`eye${i}`} transform={`translate(${e.x} ${e.y})`}>
              <circle r={h.eyeR} className="stick-eye" />
              <circle data-part={`pupil${i}`} r={h.pupilR} className="stick-pupil" />
            </g>
          ))}
          <path data-part="mouth" d={mood.mouth} className="stick-face" />
        </g>
      </g>

      <g
        data-part="pencil"
        transform={`translate(${ground.x} ${ground.y}) rotate(${ground.rot}) scale(${stick.pencil.scale})`}
      >
        {stick.pencil.parts.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={colour(p.fill)}
            stroke={colour(p.stroke)}
            strokeWidth={stick.pencil.stroke}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
