import { setSfx, type SfxName } from "./sfx";

/**
 * Sound for The Little Engineer, with no audio files: every effect and the
 * optional ambient music are synthesised with the Web Audio API.
 *
 *  - Muted by default. Nothing is created or played before the visitor turns
 *    sound on, and nothing plays before the browser has seen a real interaction.
 *  - Effects are tied to actions (a click, a stroke starting, a command running),
 *    never to hover or to animation frames, and each has a minimum gap.
 *  - Music is separate, starts only from an explicit click, fades in and out,
 *    stays quiet, and is never restored as "on" after a reload.
 *  - Every audio call is guarded: an unsupported or failing audio system turns
 *    the control off and nothing else.
 */

const KEY = "le.sound.v1";
export interface SoundState {
  fx: boolean;
  music: boolean;
  /** Music was on last time: shown as ready to play, never started without a click. */
  ready: boolean;
  /** 0..1, music volume */
  volume: number;
  available: boolean;
}
type Listener = (s: SoundState) => void;

const GAP: Record<SfxName, number> = { click: 60, pop: 70, chime: 700, confirm: 450, key: 70, pencil: 160, whoosh: 900 };

// ── preferences ──
const load = (): { fx: boolean; volume: number; music: boolean } => {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { fx: j.fx === true, music: j.music === true, volume: typeof j.volume === "number" ? Math.min(1, Math.max(0, j.volume)) : 0.35 };
  } catch {
    return { fx: false, music: false, volume: 0.35 };
  }
};
const save = (s: SoundState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ fx: s.fx, volume: s.volume, music: s.music || s.ready })); // remembered only as "ready"; it never plays by itself
  } catch {
    /* private mode etc. */
  }
};

export function createSound() {
  const pref = load();
  const state: SoundState = { fx: pref.fx, music: false, ready: pref.music, volume: pref.volume, available: true };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l({ ...state }));

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  const last: Partial<Record<SfxName, number>> = {};
  const cleanups: Array<() => void> = [];

  const Ctor: typeof AudioContext | undefined =
    typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
  if (!Ctor) state.available = false;

  const userActive = () => {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    return ua ? ua.hasBeenActive : true;
  };

  /** Creates the audio graph on first real use. Returns null when sound is impossible. */
  const ensure = (): AudioContext | null => {
    if (!state.available || !Ctor) return null;
    try {
      if (!ctx) {
        if (!userActive()) return null; // autoplay rules: wait for a real interaction
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
        const n = Math.floor(ctx.sampleRate * 0.5);
        noise = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      return ctx;
    } catch {
      state.available = false;
      state.fx = false;
      state.music = false;
      emit();
      return null;
    }
  };

  // ── building blocks ──
  const tone = (c: AudioContext, o: { f: number; to?: number; dur: number; type?: OscillatorType; gain: number; at?: number; attack?: number }) => {
    const t0 = c.currentTime + (o.at ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(master!);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  };
  const burst = (c: AudioContext, o: { dur: number; freq: number; q: number; gain: number; at?: number; to?: number; type?: BiquadFilterType }) => {
    const t0 = c.currentTime + (o.at ?? 0);
    const src = c.createBufferSource();
    src.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.frequency.setValueAtTime(o.freq, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    f.Q.value = o.q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(master!);
    src.start(t0, Math.random() * 0.3, o.dur + 0.02);
  };

  const SOUNDS: Record<SfxName, (c: AudioContext) => void> = {
    // soft tactile click
    click: (c) => {
      burst(c, { dur: 0.022, freq: 3400, q: 1.1, gain: 0.32 });
      tone(c, { f: 1700, to: 1050, dur: 0.03, gain: 0.1 });
    },
    // quiet pop
    pop: (c) => tone(c, { f: 560, to: 250, dur: 0.1, gain: 0.2, attack: 0.006 }),
    // tiny friendly chime
    chime: (c) => {
      tone(c, { f: 784, dur: 0.5, gain: 0.1, type: "triangle" });
      tone(c, { f: 1175, dur: 0.55, gain: 0.08, at: 0.075, type: "sine" });
    },
    // soft two-note confirmation
    confirm: (c) => {
      tone(c, { f: 523, dur: 0.16, gain: 0.12, attack: 0.01 });
      tone(c, { f: 659, dur: 0.26, gain: 0.12, at: 0.09, attack: 0.01 });
    },
    // subtle mechanical key
    key: (c) => {
      tone(c, { f: 150, to: 90, dur: 0.02, gain: 0.16, type: "square" });
      burst(c, { dur: 0.016, freq: 1900, q: 1.4, gain: 0.3 });
    },
    // a short pencil scratch
    pencil: (c) => {
      for (let i = 0; i < 3; i++) burst(c, { dur: 0.04, freq: 4300 + i * 500, q: 0.7, gain: 0.07 - i * 0.012, at: i * 0.045 });
    },
    // very quiet paper whoosh
    whoosh: (c) => burst(c, { dur: 0.38, freq: 380, to: 1700, q: 0.6, gain: 0.05, type: "bandpass" }),
  };

  const play = (name: SfxName) => {
    if (!state.fx) return;
    const now = performance.now();
    if (now - (last[name] ?? -1e9) < GAP[name]) return;
    const c = ensure();
    if (!c || !master) return;
    last[name] = now;
    try {
      SOUNDS[name](c);
    } catch {
      /* a failed effect is just silence */
    }
  };

  // ── ambient music ──
  // The track in /public/audio is the main source. If it cannot be loaded or played, a slow, quiet,
  // generative pad (original, synthesised here) takes over so the control still does something.
  const CHORDS: number[][] = [
    [110, 164.81, 220, 329.63], // A  E  A  E
    [87.31, 130.81, 220, 261.63], // F  C  A  C
    [130.81, 196, 246.94, 329.63], // C  G  B  E
    [98, 146.83, 196, 246.94], // G  D  G  B
  ];
  const BELLS = [659.25, 783.99, 987.77, 1174.66];
  let music: { bus: GainNode; oscs: OscillatorNode[]; lfo: OscillatorNode; timers: number[]; step: number } | null = null;
  const musicLevel = () => state.volume * 0.2;

  const startSynth = () => {
    const c = ensure();
    if (!c || !master || music) return;
    try {
      const bus = c.createGain();
      bus.gain.value = 0.0001;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 780;
      lp.Q.value = 0.4;
      lp.connect(bus).connect(master);
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.frequency.value = 0.045;
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain).connect(lp.frequency);
      lfo.start();
      const oscs: OscillatorNode[] = [];
      CHORDS[0].forEach((f, i) => {
        [-6, 6].forEach((det) => {
          const o = c.createOscillator();
          o.type = i < 2 ? "triangle" : "sine";
          o.frequency.value = f;
          o.detune.value = det;
          const g = c.createGain();
          g.gain.value = i < 2 ? 0.09 : 0.06;
          o.connect(g).connect(lp);
          o.start();
          oscs.push(o);
        });
      });
      const m = { bus, oscs, lfo, timers: [] as number[], step: 0 };
      music = m;
      bus.gain.setTargetAtTime(musicLevel(), c.currentTime, 1.4); // fade in
      const nextChord = () => {
        m.step = (m.step + 1) % CHORDS.length;
        const t = c.currentTime;
        m.oscs.forEach((o, k) => o.frequency.setTargetAtTime(CHORDS[m.step][Math.floor(k / 2)], t, 2.6));
        m.timers.push(window.setTimeout(nextChord, 13000));
      };
      m.timers.push(window.setTimeout(nextChord, 13000));
      const bell = () => {
        try {
          tone(c, { f: BELLS[Math.floor(Math.random() * BELLS.length)], dur: 3.2, gain: 0.035, attack: 0.05 });
        } catch {
          /* ignore */
        }
        m.timers.push(window.setTimeout(bell, 6500 + Math.random() * 5500));
      };
      m.timers.push(window.setTimeout(bell, 4000));
    } catch {
      music = null;
      state.music = false;
    }
  };
  const stopSynth = () => {
    const m = music;
    if (!m || !ctx) return;
    music = null;
    m.timers.forEach((t) => window.clearTimeout(t));
    try {
      m.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.45); // fade out
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      m.oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        m.lfo.stop();
        m.bus.disconnect();
      } catch {
        /* ignore */
      }
    }, 2200);
  };

  // ── the track (an HTMLAudioElement: created only after the visitor turns music on, so nothing is downloaded before) ──
  const TRACK = "/audio/ambient-portfolio.mp3";
  const TRACK_START = 0.6; // the file opens with half a second of silence
  const FILE_GAIN = 0.35; // the track is mastered loud (about -9.5 LUFS); this keeps the slider's range in background territory
  let el: HTMLAudioElement | null = null;
  let stopping = false;
  let fadeT = 0;
  const fileLevel = () => Math.min(1, Math.max(0, state.volume * FILE_GAIN));
  const fadeTo = (target: number, ms: number, done?: () => void) => {
    window.clearInterval(fadeT);
    const a = el;
    if (!a) return;
    const from = a.volume;
    const t0 = performance.now();
    fadeT = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      try {
        a.volume = Math.min(1, Math.max(0, from + (target - from) * k));
      } catch {
        /* ignore */
      }
      if (k >= 1) {
        window.clearInterval(fadeT);
        done?.();
      }
    }, 50);
  };
  const dropFile = () => {
    window.clearInterval(fadeT);
    const a = el;
    el = null;
    stopping = false;
    if (!a) return;
    try {
      a.pause();
      a.removeAttribute("src");
      a.load();
    } catch {
      /* ignore */
    }
  };
  const fileFailed = () => {
    // missing, blocked or undecodable: fall back to the synthesised pad
    dropFile();
    if (state.music) startSynth();
  };
  const startFile = () => {
    if (el) {
      // already there (maybe fading out): bring it back instead of making a second one
      stopping = false;
      if (el.paused) void el.play().catch(fileFailed);
      fadeTo(fileLevel(), 900);
      return;
    }
    try {
      const a = new Audio();
      el = a;
      a.preload = "auto";
      a.volume = 0;
      a.addEventListener("error", fileFailed);
      a.addEventListener(
        "loadedmetadata",
        () => {
          try {
            a.currentTime = TRACK_START;
          } catch {
            /* ignore */
          }
        },
        { once: true },
      );
      a.addEventListener("ended", () => {
        // our own loop, so every pass fades in instead of starting hard
        try {
          a.currentTime = TRACK_START;
          a.volume = 0;
          void a.play().then(() => fadeTo(fileLevel(), 1500)).catch(fileFailed);
        } catch {
          fileFailed();
        }
      });
      a.src = TRACK;
      void a.play().then(() => fadeTo(fileLevel(), 1800)).catch(fileFailed);
    } catch {
      fileFailed();
    }
  };
  const startMusic = () => {
    if (typeof Audio === "undefined") startSynth();
    else startFile();
  };
  const stopMusic = () => {
    stopSynth();
    if (!el) return;
    stopping = true;
    fadeTo(0, 700, () => {
      if (stopping) dropFile();
    });
  };

  // ── public controls ──
  const api = {
    get: () => ({ ...state }),
    subscribe(l: Listener) {
      listeners.add(l);
      l({ ...state });
      return () => listeners.delete(l);
    },
    setFx(on: boolean) {
      if (!state.available) return;
      state.fx = on;
      save(state);
      emit();
      if (on) {
        ensure();
        last.confirm = undefined;
        play("confirm");
      }
    },
    setMusic(on: boolean) {
      if (!state.available) return;
      state.music = on;
      state.ready = false;
      save(state);
      emit();
      if (on) startMusic();
      else stopMusic();
    },
    setVolume(v: number) {
      state.volume = Math.min(1, Math.max(0, v));
      save(state);
      if (music && ctx) music.bus.gain.setTargetAtTime(Math.max(0.0001, musicLevel()), ctx.currentTime, 0.2);
      if (el && !stopping) fadeTo(fileLevel(), 150);
      emit();
    },
    destroy() {
      cleanups.forEach((c) => c());
      cleanups.length = 0;
      setSfx(null);
      stopSynth();
      dropFile();
      listeners.clear();
      window.setTimeout(() => {
        try {
          void ctx?.close();
        } catch {
          /* ignore */
        }
        ctx = null;
      }, 2300);
    },
  };

  // ── wire effects to real actions (delegated, so nothing is attached per element) ──
  const on = <K extends keyof DocumentEventMap>(type: K, fn: (e: DocumentEventMap[K]) => void, capture = false) => {
    document.addEventListener(type, fn as EventListener, capture);
    cleanups.push(() => document.removeEventListener(type, fn as EventListener, capture));
  };
  const CLICKS = ".btn, .skip, .j-back, .p-link, .p-end-link, .pg-btn, .pg-chip, .pg-cta, .pg-copy, .pg-links a, .pg-footer a, summary";
  on("click", (e) => {
    const t = e.target as Element | null;
    if (!t || !t.closest || t.closest(".snd")) return;
    if (t.closest(".pg-tool, .pg-swatch")) play("pop");
    else if (t.closest(CLICKS)) play("click");
  });
  on("change", (e) => {
    const t = e.target as Element | null;
    if (t?.matches?.("[data-pg=size]")) play("pop");
  });
  on("pointerdown", (e) => {
    if ((e.target as Element | null)?.matches?.("[data-pg=canvas]")) play("pencil");
  });
  on(
    "toggle",
    (e) => {
      const d = e.target as HTMLDetailsElement | null;
      if (d?.matches?.("details.p-more") && d.open) play("confirm");
    },
    true,
  );
  const onTerminal = () => play("key");
  window.addEventListener("le:terminal", onTerminal);
  cleanups.push(() => window.removeEventListener("le:terminal", onTerminal));
  // paper whoosh when the sheet lifts or comes back
  const html = document.documentElement;
  let was = html.classList.contains("part2-open");
  const mo = new MutationObserver(() => {
    const now = html.classList.contains("part2-open");
    if (now !== was) {
      was = now;
      play("whoosh");
    }
  });
  mo.observe(html, { attributes: true, attributeFilter: ["class"] });
  cleanups.push(() => mo.disconnect());
  // pause everything while the tab is hidden
  const onVis = () => {
    if (el && !stopping) {
      if (document.hidden) el.pause();
      else void el.play().catch(() => {});
    }
    if (!ctx) return;
    if (document.hidden) void ctx.suspend().catch(() => {});
    else if (state.fx || state.music) void ctx.resume().catch(() => {});
  };
  document.addEventListener("visibilitychange", onVis);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

  setSfx(play);
  return api;
}
export type Sound = ReturnType<typeof createSound>;
