import { stick, BODY_X, FOOT_Y, type PoseName, type MoodName } from "@/lib/stickman/poses";

/**
 * Original hand-drawn illustrations for Part 02. All are decorative
 * (aria-hidden): the milestone text carries the meaning. They share one ink
 * weight and expose `data-part` hooks for the GSAP activation timelines and
 * `data-port` markers so the roadmap can wire branches to whichever side
 * faces the road.
 *
 * Every illustration is authored in a 440 × 320 box.
 */

export const ILL_W = 440;
export const ILL_H = 320;

type P = { x: number; y: number };

/** Small invisible marker the road controller measures. */
function Port({ id, x, y }: { id: string; x: number; y: number }) {
  return <circle data-port={id} cx={x} cy={y} r={1.5} className="ill-port" />;
}

/** The same stickman, reused from poses.json, for scenes that need a second character. */
export function MiniFigure({
  pose = "idle",
  mood = "smile",
  x,
  y,
  scale = 0.46,
  flip = false,
  part,
}: {
  pose?: PoseName;
  mood?: MoodName;
  x: number; // where the feet land
  y: number;
  scale?: number;
  flip?: boolean;
  part?: string;
}) {
  const p = stick.poses[pose];
  const m = stick.moods[mood];
  const h = stick.head;
  const t = `translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale}) translate(${-BODY_X} ${-FOOT_Y})`;
  return (
    <g transform={t} data-part={part} className="mini-fig">
      {Object.values(p.parts).map((d, i) => (
        <path key={i} d={d} className="fig-line" />
      ))}
      <g transform={`translate(${p.head.x} ${p.head.y}) rotate(${p.head.rot})`}>
        <path d={h.path} className="fig-line" />
        {h.eyes.map((e, i) => (
          <g key={i} transform={`translate(${e.x} ${e.y})`}>
            <circle r={h.eyeR} className="fig-eye" />
            <circle r={h.pupilR} className="fig-pupil" />
          </g>
        ))}
        <path d={m.mouth} className="fig-face" />
      </g>
    </g>
  );
}

/* ───────────────────────── 01 · FOUNDATIONS ───────────────────────── */

const BLOCKS: P[] = [
  { x: 272, y: 242 },
  { x: 318, y: 242 },
  { x: 364, y: 242 },
  { x: 295, y: 198 },
  { x: 341, y: 198 },
];

export function FoundationsIllustration() {
  return (
    <svg viewBox={`0 0 ${ILL_W} ${ILL_H}`} className="ill" data-ill="foundations" aria-hidden="true" focusable="false">
      <path data-part="floor" d="M30 284 H414" className="ill-line ill-soft" />
      <g data-part="blocks">
        {BLOCKS.map((b, i) => (
          <rect key={i} data-block={i} x={b.x} y={b.y} width={42} height={42} rx={3} className="ill-line ill-fill" />
        ))}
      </g>
      <g data-part="laptop">
        <path data-part="base" d="M56 266 H254 L242 283 H68 Z" className="ill-line ill-fill" />
        <g data-part="lid">
          <path d="M84 266 L97 146 H213 L226 266" className="ill-line ill-fill" />
          <g data-part="screen" className="ill-line ill-blue">
            <path d="M112 172 H168" />
            <path d="M112 190 H196" />
            <path d="M124 208 H174" />
            <path d="M124 226 H186" />
          </g>
        </g>
      </g>
      <g className="ill-ports">
        <Port id="l0" x={56} y={274} />
        <Port id="l1" x={90} y={206} />
        <Port id="r0" x={408} y={263} />
        <Port id="r1" x={386} y={219} />
      </g>
    </svg>
  );
}

/* ───────────────────────── 02 · FULL-STACK ───────────────────────── */

export function FullStackIllustration() {
  return (
    <svg viewBox={`0 0 ${ILL_W} ${ILL_H}`} className="ill" data-ill="fullstack" aria-hidden="true" focusable="false">
      <g data-part="browser">
        <rect x={28} y={78} width={170} height={124} rx={7} className="ill-line ill-fill" />
        <path d="M28 102 H198" className="ill-line" />
        <circle cx={44} cy={90} r={2.6} className="ill-dot" />
        <circle cx={55} cy={90} r={2.6} className="ill-dot" />
        <circle cx={66} cy={90} r={2.6} className="ill-dot" />
        <g className="ill-line ill-blue">
          <path d="M46 124 H120" />
          <path d="M46 142 H168" />
          <path d="M46 160 H148" />
        </g>
        <rect x={46} y={172} width={46} height={18} rx={9} className="ill-line" />
        <text x={113} y={226} className="ill-label">UI</text>
      </g>
      <g data-part="backend">
        <rect x={240} y={110} width={84} height={84} rx={7} className="ill-line ill-fill" />
        <path d="M240 138 H324 M240 166 H324" className="ill-line" />
        <circle cx={256} cy={124} r={2.6} className="ill-dot ill-dot-blue" />
        <circle cx={256} cy={152} r={2.6} className="ill-dot ill-dot-blue" />
        <circle cx={256} cy={180} r={2.6} className="ill-dot ill-dot-blue" />
        <text x={282} y={226} className="ill-label">API</text>
      </g>
      <g data-part="database">
        <path d="M356 214 V266 C356 277 424 277 424 266 V214" className="ill-line ill-fill" />
        <ellipse cx={390} cy={214} rx={34} ry={11} className="ill-line ill-fill" />
        <path d="M356 240 C356 251 424 251 424 240" className="ill-line" />
        <text x={390} y={304} className="ill-label">DB</text>
      </g>
      <path data-part="wire1" d="M198 152 H240" className="ill-line ill-blue ill-wire" />
      <path data-part="wire2" d="M324 152 H390 V203" className="ill-line ill-blue ill-wire" />
      <circle data-part="packet" r={4} cx={198} cy={152} className="ill-packet" />
      <g className="ill-ports">
        <Port id="l0" x={28} y={118} />
        <Port id="l1" x={28} y={168} />
        <Port id="r0" x={424} y={236} />
        <Port id="r1" x={422} y={262} />
      </g>
    </svg>
  );
}

/* ───────────────────────── 03 · EXPERIMENTS ───────────────────────── */

const NET = {
  input: [
    { x: 176, y: 96 },
    { x: 176, y: 160 },
    { x: 176, y: 224 },
  ],
  hidden: [
    { x: 254, y: 66 },
    { x: 254, y: 128 },
    { x: 254, y: 192 },
    { x: 254, y: 254 },
  ],
  output: [
    { x: 332, y: 118 },
    { x: 332, y: 202 },
  ],
};

function links(a: P[], b: P[], layer: string) {
  return a.flatMap((p, i) =>
    b.map((q, j) => <path key={`${layer}-${i}-${j}`} data-link={layer} d={`M${p.x} ${p.y} L${q.x} ${q.y}`} className="ill-line ill-thin" />),
  );
}

export function ExperimentsIllustration() {
  const layers: Array<[string, P[]]> = [
    ["input", NET.input],
    ["hidden", NET.hidden],
    ["output", NET.output],
  ];
  return (
    <svg viewBox={`0 0 ${ILL_W} ${ILL_H}`} className="ill" data-ill="experiments" aria-hidden="true" focusable="false">
      <g data-part="laptop">
        <rect x={24} y={128} width={74} height={50} rx={4} className="ill-line ill-fill" />
        <path d="M14 178 H108 L102 188 H20 Z" className="ill-line ill-fill" />
        <path d="M38 146 H70 M38 158 H84" className="ill-line ill-blue" />
      </g>
      <path data-part="wire" d="M98 153 C128 153 140 160 176 160 M98 153 C128 153 140 100 176 96 M98 153 C128 153 140 214 176 224" className="ill-line ill-blue ill-wire" />
      <g data-part="links">
        {links(NET.input, NET.hidden, "a")}
        {links(NET.hidden, NET.output, "b")}
      </g>
      <g data-part="nodes">
        {layers.map(([name, pts]) =>
          pts.map((p, i) => (
            <circle key={`${name}-${i}`} data-node={name} cx={p.x} cy={p.y} r={12} className="ill-line ill-fill ill-node" />
          )),
        )}
      </g>
      <g className="ill-ports">
        <Port id="l0" x={14} y={156} />
        <Port id="l1" x={20} y={184} />
        <Port id="r0" x={346} y={118} />
        <Port id="r1" x={346} y={202} />
      </g>
    </svg>
  );
}

/* ───────────────────────── 04 · PRODUCT ───────────────────────── */

export function ProductIllustration() {
  const boxes = [
    { x: 40, label: "PLAN" },
    { x: 175, label: "BUILD" },
    { x: 310, label: "SHIP" },
  ];
  return (
    <svg viewBox={`0 0 ${ILL_W} ${ILL_H}`} className="ill" data-ill="product" aria-hidden="true" focusable="false">
      <g data-part="flow">
        {boxes.map((b, i) => (
          <g key={b.label} data-step={i}>
            <rect x={b.x} y={58} width={90} height={58} rx={8} className="ill-line ill-fill" />
            <text x={b.x + 45} y={92} className="ill-label ill-label-caps">{b.label}</text>
          </g>
        ))}
        <path data-arrow="0" d="M130 87 H175 M166 81 L175 87 L166 93" className="ill-line ill-blue" />
        <path data-arrow="1" d="M265 87 H310 M301 81 L310 87 L301 93" className="ill-line ill-blue" />
      </g>
      <path d="M30 284 H414" className="ill-line ill-soft" />
      <g data-part="product">
        <rect data-piece="base" x={168} y={246} width={104} height={14} rx={4} className="ill-line ill-fill" />
        <rect data-piece="screen" x={180} y={160} width={80} height={84} rx={8} className="ill-line ill-fill" />
        <path data-piece="lines" d="M194 184 H246 M194 202 H232 M194 220 H240" className="ill-line ill-blue" />
        <circle data-piece="dot" cx={220} cy={253} r={3} className="ill-dot ill-dot-blue" />
      </g>
      <g data-part="second">
        <MiniFigure pose="pointing" mood="smile" x={338} y={284} scale={0.5} flip />
      </g>
      <g className="ill-ports">
        <Port id="l0" x={40} y={78} />
        <Port id="l1" x={40} y={100} />
        <Port id="r0" x={400} y={78} />
        <Port id="r1" x={400} y={100} />
      </g>
    </svg>
  );
}

/* ───────────────────────── 05 · WHAT'S NEXT ───────────────────────── */

export function NextIllustration() {
  return (
    <svg viewBox={`0 0 ${ILL_W} ${ILL_H}`} className="ill" data-ill="next" aria-hidden="true" focusable="false">
      <path data-part="page" d="M96 262 V30 H344 V262" className="ill-line ill-fill" />
      <path data-part="edge" d="M96 262 H344" className="ill-line ill-dashed" />
      <g data-part="text" className="ill-line">
        <path d="M126 66 H230" />
        <path d="M126 98 H316" className="ill-soft" />
        <path d="M126 122 H300" className="ill-soft" />
        <path d="M126 146 H312" className="ill-soft2" />
        <path d="M126 170 H268" className="ill-soft3" />
      </g>
      <g data-part="next" className="ill-line ill-blue ill-dashed">
        <path d="M126 204 H220" />
        <path d="M126 228 H176" />
      </g>
      <g className="ill-ports">
        <Port id="l0" x={96} y={150} />
        <Port id="l1" x={96} y={190} />
        <Port id="r0" x={344} y={150} />
        <Port id="r1" x={344} y={190} />
      </g>
    </svg>
  );
}

/* ───────────────────────── THE DOOR ───────────────────────── */

export function DoorIllustration({ label }: { label: string[] }) {
  return (
    <svg viewBox="0 0 300 430" className="door-svg" aria-hidden="true" focusable="false">
      <defs>
        <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </defs>
      <path d="M20 416 H280" className="ill-line ill-soft" />
      <g filter="url(#ink-rough)">
        {/* what is behind the door */}
        <g data-part="behind">
          <path d="M72 410 V82 Q72 54 100 54 H200 Q228 54 228 82 V410 Z" className="door-light" />
          <text x={150} y={190} className="door-peek-kicker">PART 03</text>
          <path d="M104 214 H196 M104 234 H178" className="ill-line ill-soft" />
        </g>
        {/* frame */}
        <path d="M58 416 V80 Q58 38 100 38 H200 Q242 38 242 80 V416" className="ill-line door-frame" />
        <path d="M72 410 V82 Q72 54 100 54 H200 Q228 54 228 82 V410" className="ill-line" />
        {/* the leaf, hinged on the left */}
        <g data-part="leaf">
          <path d="M72 410 V82 Q72 54 100 54 H200 Q228 54 228 82 V410 Z" className="ill-line ill-fill" />
          <path d="M92 90 H208 V232 H92 Z" className="ill-line ill-soft" />
          <path d="M92 258 H208 V394 H92 Z" className="ill-line ill-soft" />
          <g className="door-text">
            {label.map((l, i) => (
              <text key={l} x={150} y={128 + i * 38} textAnchor="middle">{l}</text>
            ))}
          </g>
          <g data-part="handle">
            <circle cx={207} cy={322} r={7} className="ill-line ill-fill" />
            <path d="M207 322 H186" className="ill-line door-lever" />
          </g>
        </g>
      </g>
      <path data-part="hint" d="M14 340 C34 332 44 340 54 337 M45 327 L55 337 L45 347" className="ill-line ill-blue door-hint" />
    </svg>
  );
}
