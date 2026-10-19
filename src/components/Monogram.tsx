"use client";

import { useRef } from "react";

/**
 * The MS monogram that stands in for the name in the top-left corner (the full
 * name stays in the headline). The finished mark is the default state: the
 * ink-stroke reveal is a CSS animation that only decorates it, so if it never
 * runs the letters are simply there. Hover nudges the letters and shows a small
 * blue full stop; clicking replays the reveal and returns to the top. The S overlaps
 * the M (see below).
 */
export default function Monogram({ replay = true }: { replay?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onClick = (e: React.MouseEvent) => {
    if (!replay) return; // on other pages it is an ordinary link home
    e.preventDefault();
    const el = ref.current;
    if (el && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.remove("is-replay");
      void el.getBoundingClientRect(); // restart the animation
      el.classList.add("is-replay");
    }
    window.scrollTo({ top: 0 });
  };
  // The S is drawn over the M with a paper-coloured outline underneath it, so where they cross
  // the S cuts through the M's strokes: one interlocked mark, not two letters side by side.
  const S = "M35 11C32.5 6.8 23 6.6 23 13C23 19.5 36 18.6 36 26C36 32.5 26 34 21.5 29.5";
  return (
    <a ref={ref} href="/" className="ms" aria-label="Milan Singla — Home" onClick={onClick}>
      <svg viewBox="0 0 42 40" width="42" height="40" aria-hidden="true" focusable="false">
        <path className="ms-m" pathLength={1} d="M4 33V6l15 17 15-17v27" />
        <g transform="translate(10 9.5) scale(0.8)">
          <path className="ms-s ms-halo" pathLength={1} d={S} />
          <path className="ms-s" pathLength={1} d={S} />
        </g>
        <circle className="ms-dot" cx="38.6" cy="34.2" r="1.9" />
      </svg>
    </a>
  );
}
