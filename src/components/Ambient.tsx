/**
 * A barely-there living background: three slow ink waves drifting at different
 * speeds, one faint blue squiggle that wanders, and two tiny sparks that
 * appear now and then. Pure CSS transforms and opacity on separate small
 * layers, so it runs on the compositor and costs no layout or script.
 * Decorative only: hidden from assistive technology, never takes pointer input,
 * still under reduced motion, paused when the tab is hidden.
 */

const W = 3600; // wide enough to cover a 2560px screen plus one drifting period

/** A wave that repeats exactly every `period` px, so the drift loops without a seam. */
function wave(period: number, amps: [number, number, number, number], mid: number) {
  const q = period / 4;
  let d = `M0 ${mid}`;
  for (let x = 0; x < W + period; x += period) {
    amps.forEach((a, i) => {
      const s = i % 2 === 0 ? -1 : 1;
      const x0 = x + i * q;
      d += ` C${(x0 + q * 0.38).toFixed(1)} ${mid + s * a} ${(x0 + q * 0.62).toFixed(1)} ${mid + s * a} ${(x0 + q).toFixed(1)} ${mid}`;
    });
  }
  return d;
}

const WAVES = [
  { period: 900, amps: [20, 30, 15, 26] as [number, number, number, number], dur: 130, up: 23, dir: 1 },
  { period: 1300, amps: [34, 20, 38, 18] as [number, number, number, number], dur: 190, up: 31, dir: -1 },
  { period: 640, amps: [12, 17, 10, 15] as [number, number, number, number], dur: 105, up: 17, dir: 1 },
];

/** Each section gets its own arrangement so the page never reads as one repeated tile. */
const VARIANTS = [
  { tops: [62, 80, 38], line: { left: 12, top: 24 }, sparks: [{ l: 78, t: 30 }, { l: 22, t: 72 }] },
  { tops: [46, 70, 86], line: { left: 62, top: 14 }, sparks: [{ l: 30, t: 22 }, { l: 84, t: 64 }] },
  { tops: [70, 52, 30], line: { left: 8, top: 66 }, sparks: [{ l: 66, t: 20 }, { l: 40, t: 84 }] },
  { tops: [58, 84, 42], line: { left: 58, top: 70 }, sparks: [{ l: 18, t: 28 }, { l: 74, t: 78 }] },
] as const;

export default function Ambient({ variant = 0 }: { variant?: 0 | 1 | 2 | 3 }) {
  const v = VARIANTS[variant];
  return (
    <div className="amb" aria-hidden="true">
      {WAVES.map((w, i) => (
        <div
          key={i}
          className={`amb-wrap amb-wrap${i + 1}`}
          style={{ top: `${v.tops[i]}%`, ["--up" as string]: `${w.up}s` }}
        >
          <svg
            className={`amb-w amb-w${i + 1}`}
            width={W}
            height="110"
            viewBox={`0 0 ${W} 110`}
            focusable="false"
            style={{ ["--p" as string]: `${w.period * w.dir}px`, ["--d" as string]: `${w.dur}s` }}
          >
            <path d={wave(w.period, w.amps, 55)} />
          </svg>
        </div>
      ))}
      <svg
        className="amb-line"
        width="420"
        height="90"
        viewBox="0 0 420 90"
        focusable="false"
        style={{ left: `${v.line.left}%`, top: `${v.line.top}%` }}
      >
        <path d="M6 58 C40 18 76 82 118 46 S190 8 236 50 S320 84 360 36 S404 28 414 40" />
      </svg>
      {v.sparks.map((s, i) => (
        <span key={i} className={`amb-sp amb-sp${i + 1}`} style={{ left: `${s.l}%`, top: `${s.t}%` }} />
      ))}
    </div>
  );
}
