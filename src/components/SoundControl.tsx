"use client";

import { useEffect, useRef, useState } from "react";
import type { Sound, SoundState } from "@/lib/sound/engine";

/**
 * Two small toggles in the top-right corner: sound effects and ambient music
 * (with a volume slider that appears only while music plays). Everything is
 * off by default. The engine is loaded after the page is up, in its own
 * try/catch, so a failure here can never affect the page or its animation.
 */
export default function SoundControl() {
  const engine = useRef<Sound | null>(null);
  const [s, setS] = useState<SoundState>({ fx: false, music: false, ready: false, volume: 0.35, available: true });
  const [ready, setReady] = useState(false);
  const [said, setSaid] = useState("");
  const [pulse, setPulse] = useState<"fx" | "music" | null>(null);
  const pulseT = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  // Tucks away while the visitor scrolls down through the content (so it never
  // sits over a link, field or the drawing pad) and returns on scroll up, near
  // the top, or whenever it has keyboard focus.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const away = y > 160 && y > last + 2;
      if (y < 160 || y < last - 2) box.current?.classList.remove("snd-away");
      else if (away) box.current?.classList.add("snd-away");
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let off: (() => void) | null = null;
    let gone = false;
    import("@/lib/sound/engine")
      .then((m) => {
        if (gone) return;
        const e = m.createSound();
        engine.current = e;
        off = e.subscribe(setS);
        setReady(true);
      })
      .catch(() => setS((p) => ({ ...p, available: false })));
    return () => {
      gone = true;
      window.clearTimeout(pulseT.current);
      off?.();
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);

  const flash = (k: "fx" | "music") => {
    setPulse(k);
    window.clearTimeout(pulseT.current);
    pulseT.current = window.setTimeout(() => setPulse(null), 700);
  };
  const toggleFx = () => {
    const e = engine.current;
    if (!e || !s.available) return;
    const next = !s.fx;
    e.setFx(next);
    setSaid(next ? "Sound effects on." : "Sound effects off.");
    flash("fx");
  };
  const toggleMusic = () => {
    const e = engine.current;
    if (!e || !s.available) return;
    const next = !s.music;
    e.setMusic(next);
    setSaid(next ? "Ambient music on." : "Ambient music off.");
    flash("music");
  };

  const disabled = !ready || !s.available;
  const unavailable = ready && !s.available ? "Sound is not available in this browser. " : "";
  return (
    <div className="snd" role="group" aria-label="Sound" ref={box}>
      <button
        type="button"
        className={`snd-btn${pulse === "fx" ? " is-pulse" : ""}`}
        aria-pressed={s.fx}
        aria-disabled={disabled}
        onClick={toggleFx}
        title={unavailable + (s.fx ? "Sound effects: on" : "Sound effects: off")}
      >
        <span className="sr-only">Sound effects</span>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path className="snd-body" d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" />
          <path className="snd-wave snd-w1" d="M15 9.2c1.1 1.5 1.1 4.1 0 5.6" />
          <path className="snd-wave snd-w2" d="M17.7 6.8c2.4 3 2.4 7.4 0 10.4" />
          <path className="snd-off" d="M15.2 9.4l5 5.2M20.2 9.4l-5 5.2" />
        </svg>
      </button>
      <button
        type="button"
        className={`snd-btn${pulse === "music" ? " is-pulse" : ""}`}
        data-ready={s.ready && !s.music ? "true" : undefined}
        aria-pressed={s.music}
        aria-disabled={disabled}
        onClick={toggleMusic}
        title={unavailable + (s.music ? "Ambient music: on" : s.ready ? "Ambient music: ready — press to play" : "Ambient music: off")}
      >
        <span className="sr-only">Ambient music</span>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path className="snd-note" d="M9 17.5V6.6l9-1.8v10.4" />
          <ellipse className="snd-note-h" cx="7" cy="17.6" rx="2.3" ry="1.9" />
          <ellipse className="snd-note-h" cx="16" cy="15.4" rx="2.3" ry="1.9" />
          <path className="snd-off" d="M3.5 4l17 16" />
        </svg>
      </button>
      {s.music && (
        <label className="snd-vol">
          <span className="sr-only">Music volume</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(s.volume * 100)}
            onChange={(e) => engine.current?.setVolume(Number(e.target.value) / 100)}
          />
        </label>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
