import type { ProjectId } from "@/lib/projects/data";

/**
 * The four chapter drawings. Each is the *finished* picture, drawn in the same
 * ink language as Part 02 (classes from journey.css). The scroll timelines in
 * src/lib/projects/timelines.ts take them apart and put them back together.
 *
 * Coordinates are in each drawing's own viewBox. The stickmen are not in these
 * SVGs: the real rig is laid over the drawing by ProjectChapter and positioned
 * in the same coordinates (percentages of the canvas).
 */

export const SIZES: Record<ProjectId, { w: number; h: number }> = {
  shipyard: { w: 640, h: 420 },
  termedu: { w: 640, h: 420 },
  "vrxed-meet": { w: 800, h: 420 },
  vrxnuro: { w: 640, h: 440 },
};

const Svg = ({ id, children }: { id: ProjectId; children: React.ReactNode }) => (
  <svg
    viewBox={`0 0 ${SIZES[id].w} ${SIZES[id].h}`}
    className="pill"
    data-ill={id}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/* ───────────────────────── SHIPYARD · the deployment factory ───────────────────────── */

const ROLLERS = [64, 112, 160, 208, 256, 304, 352, 400, 448, 496, 544, 592];

export function ShipyardIllustration() {
  return (
    <Svg id="shipyard">
      {/* belt */}
      <g data-p="belt">
        <path d="M30 298 H610" className="ill-line" />
        <path d="M30 326 H610" className="ill-line" />
        <path d="M30 298 Q14 312 30 326 M610 298 Q626 312 610 326" className="ill-line" />
        {ROLLERS.map((x) => (
          <circle key={x} cx={x} cy={312} r={8} className="ill-line ill-fill" data-p="roller" />
        ))}
        <path d="M70 326 V352 M570 326 V352 M70 352 H96 M570 352 H544" className="ill-line ill-soft" />
      </g>

      {/* 01 · build */}
      <g data-p="s1">
        <path d="M118 298 V190 Q118 164 144 164 H198 Q224 164 224 190 V298" className="ill-line ill-fill" />
        <text x={171} y={146} className="ill-label ill-label-caps">
          BUILD
        </text>
        <text x={171} y={126} className="ill-label ill-label-num">
          01
        </text>
        <g data-p="parts">
          <rect data-p="part" x={142} y={246} width={24} height={20} rx={2} className="ill-line ill-blue" />
          <rect data-p="part" x={176} y={246} width={24} height={20} rx={2} className="ill-line ill-blue" />
          <rect data-p="part" x={152} y={220} width={38} height={20} rx={2} className="ill-line ill-blue" />
          <circle data-p="part" cx={171} cy={198} r={10} className="ill-line ill-blue" />
        </g>
      </g>

      {/* 02 · health check */}
      <g data-p="s2">
        <path d="M268 298 V190 Q268 164 294 164 H348 Q374 164 374 190 V298" className="ill-line ill-fill" />
        <text x={321} y={146} className="ill-label ill-label-caps">
          HEALTH
        </text>
        <text x={321} y={126} className="ill-label ill-label-num">
          02
        </text>
        <circle data-p="ind" cx={321} cy={212} r={17} className="ill-line" />
        <circle data-p="spin" cx={321} cy={212} r={17} className="ill-line ill-blue ill-spin" />
        <path data-p="tick" d="M311 213 L318 220 L332 204" className="ill-line ill-blue" />
      </g>

      {/* 03 · traffic routing */}
      <g data-p="s3">
        <path d="M418 298 V190 Q418 164 444 164 H498 Q524 164 524 190 V298" className="ill-line ill-fill" />
        <text x={471} y={146} className="ill-label ill-label-caps">
          ROUTE
        </text>
        <text x={471} y={126} className="ill-label ill-label-num">
          03
        </text>
        <path data-p="route-a" d="M471 206 L449 258" className="ill-line ill-blue" />
        <path data-p="route-b" d="M471 206 L495 258" className="ill-line ill-soft ill-dashed" />
        <circle data-p="node-lb" cx={471} cy={206} r={9} className="ill-line ill-fill" />
        <circle data-p="node-new" cx={449} cy={262} r={9} className="ill-line ill-blue ill-fill" />
        <circle data-p="node-old" cx={495} cy={262} r={9} className="ill-line ill-soft ill-fill" />
        <circle data-p="traffic" r={4} cx={471} cy={206} className="ill-packet" />
      </g>
      {/* lever */}
      <g data-p="lever">
        <path d="M552 298 V290" className="ill-line" />
        <g data-p="lever-arm" transform="rotate(-38 552 292)">
          <path d="M552 292 V246" className="ill-line" />
          <circle cx={552} cy={242} r={6} className="ill-line ill-blue ill-fill" />
        </g>
        <circle cx={552} cy={294} r={7} className="ill-line ill-fill" />
      </g>

      {/* the application box */}
      <g data-p="box" transform="translate(471 298)">
        <rect x={-30} y={-48} width={60} height={48} rx={3} className="ill-line ill-fill" />
        <path d="M-30 -30 H30" className="ill-line ill-soft" />
        <path d="M-12 -20 H12" className="ill-line ill-blue" />
        <g transform="translate(-30 -48)">
          <g data-p="lid" transform="rotate(-62)">
            <path d="M0 0 L-8 -14 H68 L60 0 Z" className="ill-line ill-fill" />
          </g>
        </g>
      </g>

      <g className="ill-ports" />
    </Svg>
  );
}

/* ───────────────────────── TERMEDU · building a classroom ───────────────────────── */

export function TermeduIllustration() {
  return (
    <Svg id="termedu">
      <path data-p="floor" d="M24 362 H616" className="ill-line ill-soft" />

      {/* blackboard */}
      <g data-p="board">
        <rect x={64} y={48} width={236} height={128} rx={4} className="ill-line ill-fill" />
        <rect x={74} y={58} width={216} height={108} rx={2} className="ill-line ill-soft2" />
        <path d="M60 182 H304" className="ill-line" />
        <g data-p="chalk" className="ill-line ill-blue">
          <path d="M96 88 C130 80 160 96 196 86" />
          <path d="M96 114 H236" />
          <path d="M96 138 C124 130 150 146 214 136" />
        </g>
      </g>

      {/* student desks */}
      <g data-p="desks">
        {[0, 1, 2].map((i) => {
          const x = 62 + i * 82;
          return (
            <g key={i} data-p="desk" transform={`translate(${x} 0)`}>
              <path d="M0 292 H66 L60 304 H6 Z" className="ill-line ill-fill" />
              <path d="M12 304 V350 M54 304 V350" className="ill-line" />
              <path d="M18 350 H4 M48 350 H62" className="ill-line ill-soft" />
              <path d="M14 330 H52" className="ill-line ill-soft2" />
            </g>
          );
        })}
      </g>

      {/* course shelves */}
      <g data-p="shelves">
        <path d="M396 60 V208 M552 60 V208 M396 60 H552 M396 108 H552 M396 158 H552 M396 208 H552" className="ill-line" />
        {[0, 1, 2].map((row) => (
          <g key={row} data-p="books" transform={`translate(0 ${row * 50})`}>
            <rect x={408} y={78} width={14} height={30} className="ill-line ill-fill" />
            <rect x={426} y={70} width={14} height={38} className={`ill-line ill-fill ${row === 1 ? "ill-blue" : ""}`} />
            <rect x={444} y={82} width={14} height={26} className="ill-line ill-fill" />
            <rect x={468} y={74} width={20} height={34} className="ill-line ill-fill" />
            <rect x={492} y={80} width={14} height={28} className="ill-line ill-fill" />
          </g>
        ))}
      </g>

      {/* assignment tray */}
      <g data-p="tray">
        <path d="M356 318 H432 L424 346 H364 Z" className="ill-line ill-fill" />
        <path d="M368 310 H420 M372 302 H416" className="ill-line ill-soft" />
        <path d="M376 294 H412 V306 H376 Z" className="ill-line ill-blue ill-fill" data-p="paper" />
      </g>

      {/* progress chart */}
      <g data-p="chart">
        <path d="M470 244 V350 H596" className="ill-line" />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            data-p="bar"
            x={486 + i * 28}
            y={344 - (30 + i * 20)}
            width={18}
            height={30 + i * 20}
            className="ill-line ill-blue ill-fill"
          />
        ))}
        <path data-p="trend" d="M484 316 C516 306 536 286 596 256" className="ill-line ill-dashed" />
      </g>
    </Svg>
  );
}

/* ───────────────────────── VRxED MEET · two people, one connection ───────────────────────── */

export function MeetIllustration() {
  return (
    <Svg id="vrxed-meet">
      <path data-p="floor" d="M24 372 H776" className="ill-line ill-soft" />
      {/* the window it opens into (behind the line, so the connection runs across it) */}
      <g data-p="window">
        <rect x={220} y={50} width={360} height={250} rx={8} className="ill-line ill-fill" />
        <path d="M220 76 H580" className="ill-line ill-soft" />
        <circle cx={237} cy={63} r={3} className="ill-dot" />
        <circle cx={249} cy={63} r={3} className="ill-dot" />
        <circle cx={261} cy={63} r={3} className="ill-dot" />
      </g>
      {/* the pencil line that becomes the connection */}
      <path
        data-p="link"
        d="M168 236 C 250 150, 330 330, 400 236 S 560 150, 632 236"
        className="ill-line ill-blue ill-link"
      />
      {/* three things the connection carries */}
      <g data-p="icons">
        <g data-p="icon" transform="translate(268 150)">
          <circle r={26} className="ill-line ill-fill" />
          <rect x={-12} y={-9} width={17} height={18} rx={2} className="ill-line ill-blue" />
          <path d="M7 -3 L14 -8 V8 L7 3 Z" className="ill-line ill-blue" />
        </g>
        <g data-p="icon" transform="translate(400 120)">
          <circle r={26} className="ill-line ill-fill" />
          <rect x={-13} y={-10} width={26} height={17} rx={2} className="ill-line ill-blue" />
          <path d="M-6 13 H6 M0 7 V13" className="ill-line ill-blue" />
        </g>
        <g data-p="icon" transform="translate(532 150)">
          <circle r={26} className="ill-line ill-fill" />
          <path d="M-13 -9 H13 V5 H3 L-5 12 V5 H-13 Z" className="ill-line ill-blue" />
        </g>
      </g>
    </Svg>
  );
}

/* ───────────────────────── VRxNURO · the idea becomes a network ───────────────────────── */

type N = { x: number; y: number };
const L0: N[] = [{ x: 150, y: 250 }];
const L1: N[] = [60, 0, -60].map((d) => ({ x: 236, y: 250 + d * 1.4 }));
const L2: N[] = [-100, -50, 0, 50, 100].map((d) => ({ x: 322, y: 250 + d * 1.2 }));
const L3: N[] = [-60, 0, 60].map((d) => ({ x: 408, y: 250 + d * 1.1 }));
const CHART_PTS: N[] = [
  { x: 448, y: 330 },
  { x: 482, y: 298 },
  { x: 516, y: 306 },
  { x: 548, y: 262 },
  { x: 580, y: 246 },
];

const link = (a: N, b: N) => `M${a.x} ${a.y} L${b.x} ${b.y}`;

export function NuroIllustration() {
  return (
    <Svg id="vrxnuro">
      <path data-p="floor" d="M24 392 H616" className="ill-line ill-soft" />
      {/* connections, drawn layer by layer */}
      <g data-p="links">
        {L0.flatMap((a) => L1.map((b, i) => <path key={`a${i}`} data-link="0" d={link(a, b)} className="ill-line ill-thin" />))}
        {L1.flatMap((a, i) => L2.map((b, j) => <path key={`b${i}-${j}`} data-link="1" d={link(a, b)} className="ill-line ill-thin" />))}
        {L2.flatMap((a, i) => L3.map((b, j) => <path key={`c${i}-${j}`} data-link="2" d={link(a, b)} className="ill-line ill-thin" />))}
      </g>
      {/* the first point, then the layers */}
      {[L0, L1, L2, L3].map((layer, li) => (
        <g key={li} data-p="layer" data-layer={li}>
          {layer.map((n, i) => (
            <circle
              key={i}
              data-node={li === 3 ? `out${i}` : "n"}
              cx={n.x}
              cy={n.y}
              r={li === 0 ? 7 : 9}
              className="ill-line ill-fill ill-node-line"
            />
          ))}
        </g>
      ))}
      <circle data-p="seed-ring" cx={L0[0].x} cy={L0[0].y} r={16} className="ill-line ill-blue ill-thin" />
      {/* the data visualisation the network settles into */}
      <g data-p="viz">
        <path data-p="axes" d="M432 232 V352 H600" className="ill-line" />
        <path data-p="grid" d="M432 292 H600 M432 262 H600 M432 322 H600" className="ill-line ill-thin ill-dashed" />
        {CHART_PTS.map((p, i) => (
          <circle key={i} data-p="pt" cx={p.x} cy={p.y} r={5} className="ill-dot-blue" />
        ))}
        <path data-p="fit" d="M448 330 C490 312 530 282 584 244" className="ill-line ill-blue" />
      </g>
    </Svg>
  );
}

/* ───────────────────────── threads between chapters ───────────────────────── */

export type ThreadKind = "box" | "chalk" | "fork" | "pencil";

const THREAD_PATH: Record<ThreadKind, string> = {
  box: "M140 0 C140 54 70 62 84 108 S196 150 140 200",
  chalk: "M140 0 C140 60 210 70 196 112 S84 150 140 200",
  fork: "M140 0 C140 70 140 80 140 108 C140 150 96 160 96 200",
  pencil: "M140 0 C140 50 100 70 118 112 S160 150 140 196",
};

export function Thread({ kind }: { kind: ThreadKind }) {
  return (
    <svg className="p-thread" data-thread={kind} viewBox="0 0 280 200" aria-hidden="true" focusable="false">
      <path data-p="tpath" d={THREAD_PATH[kind]} className="ill-line ill-dashed-fine" />
      {kind === "fork" && <path data-p="tfork" d="M140 108 C150 150 196 160 196 200" className="ill-line ill-blue" />}
      <g data-p="glyph" className="p-glyph">
        {kind === "box" && (
          <>
            <rect x={-12} y={-18} width={24} height={18} rx={2} className="ill-line ill-fill" />
            <path d="M-12 -12 H12" className="ill-line ill-soft" />
          </>
        )}
        {kind === "chalk" && <path d="M-10 -4 L10 4" className="ill-line ill-chalk" />}
        {kind === "fork" && <circle r={6} className="ill-line ill-blue ill-fill" />}
        {kind === "pencil" && (
          <>
            <path d="M-3 -22 L3 -22 L3 -6 L0 0 L-3 -6 Z" className="ill-line ill-fill" />
            <path d="M-3 -10 H3" className="ill-line ill-soft" />
          </>
        )}
      </g>
    </svg>
  );
}

/* ───────────────────────── stand-in interface panels (clearly labelled illustrations) ───────────────────────── */

/**
 * Used only where no genuine screenshot exists. Drawn as a sketch, in ink and
 * blue, with an explicit label: it must never read as the real product.
 */
export function Schematic({ id }: { id: Exclude<ProjectId, "shipyard"> }) {
  if (id === "termedu") {
    return (
      <svg viewBox="0 0 480 300" className="schem" aria-hidden="true" focusable="false">
        <path d="M14 14 H112 V286 H14 Z" className="ill-line ill-fill" />
        {[48, 80, 112, 144].map((y) => (
          <path key={y} d={`M28 ${y} H92`} className="ill-line ill-soft" />
        ))}
        <path d="M28 48 H72" className="ill-line ill-blue" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${130 + i * 112} 28)`}>
            <rect width={102} height={92} rx={4} className="ill-line ill-fill" />
            <path d="M10 62 H72 M10 76 H52" className="ill-line ill-soft" />
            <rect x={10} y={10} width={82} height={34} rx={2} className="ill-line ill-soft2" />
          </g>
        ))}
        <rect x={130} y={140} width={206} height={130} rx={4} className="ill-line ill-fill" />
        <path d="M148 168 H260 M148 188 H300 M148 208 H232" className="ill-line ill-soft" />
        <rect x={148} y={232} width={74} height={22} rx={11} className="ill-line ill-blue" />
        <rect x={352} y={140} width={102} height={130} rx={4} className="ill-line ill-fill" />
        <path d="M368 240 H438" className="ill-line ill-soft" />
        <rect x={368} y={248} width={70} height={8} rx={4} className="ill-line ill-fill" />
        <rect x={368} y={248} width={44} height={8} rx={4} className="ill-line ill-blue ill-fill" />
        <path d="M370 226 C388 200 404 214 436 168" className="ill-line ill-blue" />
      </svg>
    );
  }
  if (id === "vrxed-meet") {
    return (
      <svg viewBox="0 0 480 300" className="schem" aria-hidden="true" focusable="false">
        {[0, 1, 2, 3].map((i) => {
          const x = 14 + (i % 2) * 176;
          const y = 14 + Math.floor(i / 2) * 118;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect width={166} height={108} rx={6} className="ill-line ill-fill" />
              <circle cx={83} cy={44} r={15} className="ill-line ill-soft" />
              <path d="M52 92 Q83 60 114 92" className="ill-line ill-soft" />
            </g>
          );
        })}
        <rect x={372} y={14} width={94} height={226} rx={6} className="ill-line ill-fill" />
        <path d="M384 40 H454 M384 62 H436 M384 84 H448" className="ill-line ill-soft" />
        <path d="M384 190 H454" className="ill-line ill-blue" />
        <rect x={150} y={252} width={180} height={34} rx={17} className="ill-line ill-fill" />
        {[190, 240, 290].map((x) => (
          <circle key={x} cx={x} cy={269} r={9} className="ill-line ill-blue" />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 480 300" className="schem" aria-hidden="true" focusable="false">
      <path d="M14 14 H466 V286 H14 Z" className="ill-line ill-soft2" />
      <path d="M40 250 V50 M40 250 H440" className="ill-line" />
      {[90, 130, 170, 210].map((y) => (
        <path key={y} d={`M40 ${y} H440`} className="ill-line ill-thin ill-dashed" />
      ))}
      {[
        [80, 210],
        [130, 186],
        [170, 196],
        [220, 150],
        [262, 160],
        [310, 112],
        [360, 98],
        [404, 76],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={5} className="ill-dot-blue" />
      ))}
      <path d="M70 218 C150 196 230 160 300 124 S390 84 420 70" className="ill-line ill-blue" />
    </svg>
  );
}
