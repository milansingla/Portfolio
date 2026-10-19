import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import {
  stick,
  BODY_X,
  FOOT_Y,
  SHOULDER,
  HIP,
  type PoseName,
  type MoodName,
} from "./poses";

gsap.registerPlugin(MorphSVGPlugin);

const LIMBS = ["torso", "legL", "legR", "armL", "armR"] as const;

/**
 * A timeline a caller has added to its own master timeline (the scrubbed and
 * scripted sequences) belongs to that master and is never touched from here.
 * Only free-running ones, parented to the global timeline, are finished or
 * replaced when the same kind of move is started again.
 */
const free = (t: gsap.core.Timeline | null): t is gsap.core.Timeline => !!t && t.parent === gsap.globalTimeline;

/**
 * One shared ticker callback renders every rig that changed, instead of one idle
 * callback per rig. It is registered while at least one rig exists.
 */
const dirtyRigs = new Set<Rig>();
let liveRigs = 0;
const flush = () => {
  if (!dirtyRigs.size) return;
  dirtyRigs.forEach((r) => r.render());
  dirtyRigs.clear();
};
type Limb = (typeof LIMBS)[number];

export interface RigState {
  // head
  hx: number;
  hy: number;
  hrot: number;
  // gaze (-1..1) and head follow (degrees / units)
  gx: number;
  gy: number;
  nod: number;
  // body
  bx: number;
  by: number;
  brot: number;
  bsx: number;
  bsy: number;
  // limb swings (degrees)
  legL: number;
  legR: number;
  armR: number;
  // eyes
  blink: number; // 1 open … 0.08 shut
  // pencil
  px: number;
  py: number;
  prot: number;
  ps: number;
  pop: number;
  // shadow
  sh: number;
}

/**
 * Imperative controller for the stickman SVG. All motion goes through a plain
 * state object that GSAP tweens; one render() writes it to the DOM per frame.
 */
export class Rig {
  readonly svg: SVGSVGElement;
  readonly s: RigState;
  private p: Record<string, SVGElement> = {};
  private dirty = true;
  private flipped = false;
  private written = new Map<string, string>(); // last value written to each attribute
  private poseTl: gsap.core.Timeline | null = null;
  private waveTl: gsap.core.Timeline | null = null;
  private hopTl: gsap.core.Timeline | null = null;
  private blinkTl: gsap.core.Timeline | null = null;
  private crouchTl: gsap.core.Timeline | null = null;
  private descending = false;

  constructor(readonly root: HTMLElement) {
    this.svg = root.querySelector<SVGSVGElement>('[data-part="svg"]')!;
    this.svg.querySelectorAll<SVGElement>("[data-part]").forEach((el) => {
      this.p[el.dataset.part!] = el;
    });
    const idle = stick.poses.idle;
    this.s = {
      hx: idle.head.x,
      hy: idle.head.y,
      hrot: 0,
      gx: 0,
      gy: 0,
      nod: 0,
      bx: 0,
      by: 0,
      brot: 0,
      bsx: 1,
      bsy: 1,
      legL: 0,
      legR: 0,
      armR: 0,
      blink: 1,
      px: stick.pencil.ground.x,
      py: stick.pencil.ground.y,
      prot: stick.pencil.ground.rot,
      ps: stick.pencil.scale,
      pop: 1,
      sh: 1,
    };
    if (liveRigs++ === 0) gsap.ticker.add(flush);
    this.render(true);
  }

  destroy() {
    this.lifeStop?.();
    // nothing of this rig may keep running after it is gone
    gsap.killTweensOf(this.s);
    gsap.killTweensOf(Object.values(this.p));
    [this.poseTl, this.waveTl, this.hopTl, this.blinkTl, this.crouchTl].forEach((t) => free(t) && t.kill());
    dirtyRigs.delete(this);
    if (--liveRigs === 0) gsap.ticker.remove(flush);
  }

  private lifeStop: (() => void) | null = null;

  /**
   * Calm idle life: a slow breath, the odd blink, now and then a glance.
   * Everything pauses while the figure is off screen, and nothing here touches
   * the pose, so it never fights a timeline. Returns a function that stops it.
   */
  life(opts: { glance?: boolean } = {}) {
    if (this.lifeStop) return this.lifeStop;
    // The breath is a ~1 unit drift over 2 seconds: redrawing it every second frame is
    // indistinguishable and halves the style/layout work of every resting figure.
    let skip = 0;
    const breath = gsap.to(this.s, { nod: 1.1, duration: 2.1, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: () => ((skip ^= 1) ? undefined : this.touch()), paused: true });
    let blinkT = 0;
    let glanceT = 0;
    let glanceBackT = 0;
    const blinkLoop = () => {
      blinkT = window.setTimeout(() => {
        this.blink();
        blinkLoop();
      }, 2800 + Math.random() * 3200);
    };
    const glanceLoop = () => {
      glanceT = window.setTimeout(() => {
        this.gaze((Math.random() * 2 - 1) * 0.6, (Math.random() - 0.5) * 0.3);
        glanceBackT = window.setTimeout(() => this.gaze(0, 0), 900 + Math.random() * 700);
        glanceLoop();
      }, 6000 + Math.random() * 5000);
    };
    const stopTimers = () => {
      window.clearTimeout(blinkT);
      window.clearTimeout(glanceT);
      window.clearTimeout(glanceBackT);
    };
    const io = new IntersectionObserver(
      (entries) => {
        stopTimers();
        if (entries.some((e) => e.isIntersecting)) {
          breath.resume();
          blinkLoop();
          if (opts.glance) glanceLoop();
        } else breath.pause();
      },
      { threshold: 0.1 },
    );
    io.observe(this.root);
    this.lifeStop = () => {
      stopTimers();
      io.disconnect();
      breath.kill();
      this.lifeStop = null;
    };
    return this.lifeStop;
  }

  /** A tiny crouch before something bigger happens. */
  anticipate() {
    if (free(this.crouchTl)) this.crouchTl.progress(1); // finish a crouch still in progress instead of stacking another
    return (this.crouchTl = gsap
      .timeline()
      .to(this.s, { bsy: 0.95, bsx: 1.03, duration: 0.12, ease: "power2.out", onUpdate: this.touch })
      .to(this.s, { bsy: 1, bsx: 1, duration: 0.2, ease: "power2.inOut", onUpdate: this.touch }));
  }

  /** Mark state as changed; call from tween onUpdate (or use `to`). */
  touch = () => {
    this.dirty = true;
    dirtyRigs.add(this);
  };

  /** Tween any numeric rig state. */
  to(vars: Partial<RigState> & gsap.TweenVars) {
    return gsap.to(this.s, { ...vars, onUpdate: this.touch, overwrite: "auto" });
  }

  set(vars: Partial<RigState>) {
    Object.assign(this.s, vars);
    this.touch();
  }

  render(force = false) {
    if (!this.dirty && !force) return;
    this.dirty = false;
    const s = this.s;
    const { head, body, legL, legR, armR, eye0, eye1, pupil0, pupil1, pencil, shadow } = this.p;
    const gazeT = stick.head.travel;
    // Only attributes whose value changed are written: a breathing figure touches one.
    const put = (el: SVGElement, name: string, value: string) => {
      const key = (el.dataset.part ?? "") + name;
      if (this.written.get(key) === value) return;
      this.written.set(key, value);
      el.setAttribute(name, value);
    };

    put(body, "transform", `translate(${s.bx} ${s.by}) translate(${BODY_X} ${FOOT_Y}) rotate(${s.brot}) scale(${s.bsx} ${s.bsy}) translate(${-BODY_X} ${-FOOT_Y})`,
    );
    put(head, "transform", `translate(${s.hx + s.gx * 1.6} ${s.hy + s.gy * 1.2 + s.nod}) rotate(${s.hrot + s.gx * 5})`,
    );
    put(legL, "transform", `rotate(${s.legL} ${HIP.x} ${HIP.y})`);
    put(legR, "transform", `rotate(${s.legR} ${HIP.x} ${HIP.y})`);
    put(armR, "transform", `rotate(${s.armR} ${SHOULDER.x} ${SHOULDER.y})`);

    const ex = (i: number) => stick.head.eyes[i];
    put(eye0, "transform", `translate(${ex(0).x} ${ex(0).y}) scale(1 ${s.blink})`);
    put(eye1, "transform", `translate(${ex(1).x} ${ex(1).y}) scale(1 ${s.blink})`);
    const pp = `translate(${s.gx * gazeT} ${s.gy * gazeT})`;
    put(pupil0, "transform", pp);
    put(pupil1, "transform", pp);

    put(pencil, "transform", `translate(${s.px} ${s.py}) rotate(${s.prot}) scale(${s.ps})`,
    );
    put(pencil, "opacity", String(s.pop));
    put(shadow, "transform", `translate(${BODY_X} 0) scale(${s.sh} 1) translate(${-BODY_X} 0)`);
  }

  // ---------- poses & moods ----------

  pose(name: PoseName, dur = 0.5, ease = "power3.inOut"): gsap.core.Timeline {
    const pose = stick.poses[name];
    // A new pose takes over from one still morphing; the limbs continue from where they are.
    if (free(this.poseTl)) this.poseTl.kill();
    const tl = (this.poseTl = gsap.timeline());
    LIMBS.forEach((limb: Limb) => {
      tl.to(this.p[limb], { morphSVG: { shape: pose.parts[limb], shapeIndex: "auto" }, duration: dur, ease }, 0);
    });
    tl.to(this.s, { hx: pose.head.x, hy: pose.head.y, hrot: pose.head.rot, duration: dur, ease, onUpdate: this.touch }, 0);
    tl.add(() => this.mood(pose.mood as MoodName, Math.min(0.2, dur)), dur * 0.3);
    tl.add(() => this.extras(pose.extras), dur * 0.55);
    return tl;
  }

  /** Snap straight to a pose with no animation. */
  snap(name: PoseName) {
    const pose = stick.poses[name];
    if (free(this.poseTl)) this.poseTl.kill(); // a free-running pose must not overwrite the snapped one
    LIMBS.forEach((l) => this.p[l].setAttribute("d", pose.parts[l]));
    this.set({ hx: pose.head.x, hy: pose.head.y, hrot: pose.head.rot });
    this.mood(pose.mood as MoodName, 0);
    this.extras(pose.extras, 0);
  }

  mood(name: MoodName, dur = 0.18) {
    const m = stick.moods[name];
    gsap.to(this.p.mouth, { morphSVG: { shape: m.mouth }, duration: dur, ease: "power2.out", overwrite: "auto" });
    (["browL", "browR"] as const).forEach((k, i) => {
      const d = m.brows[i];
      const el = this.p[k];
      if (d) {
        el.setAttribute("d", d);
        gsap.to(el, { opacity: 1, duration: dur, overwrite: "auto" });
      } else {
        gsap.to(el, { opacity: 0, duration: dur, overwrite: "auto" });
      }
    });
    gsap.to(this.p.sweat, { opacity: name === "grimace" ? 1 : 0, duration: dur, overwrite: "auto" });
  }

  extras(list: readonly string[], dur = 0.15) {
    [0, 1, 2].forEach((i) => {
      const el = this.p["extra" + i];
      const d = list[i];
      if (d) {
        el.setAttribute("d", d);
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur, delay: dur ? 0.05 * i : 0, overwrite: "auto" });
      } else {
        gsap.to(el, { opacity: 0, duration: dur, overwrite: "auto" });
      }
    });
  }

  // ---------- life ----------

  /** Look toward a point in svg-user-space-independent screen terms: x/y in -1..1. */

  gaze(x: number, y: number) {
    // The figure is mirrored with CSS when facing the headline: un-mirror x.
    const fx = this.flipped ? -x : x;
    gsap.to(this.s, {
      gx: gsap.utils.clamp(-1, 1, fx),
      gy: gsap.utils.clamp(-1, 1, y),
      duration: 0.35,
      ease: "power3.out",
      overwrite: "auto",
      onUpdate: this.touch,
    });
  }

  setFlipped(f: boolean) {
    this.flipped = f;
  }

  /** Aim the gaze at a viewport point. */
  gazeAt(clientX: number, clientY: number) {
    const r = this.p.head.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const reach = Math.max(120, Math.min(window.innerWidth, 900) * 0.45);
    this.gaze(dx / reach, dy / reach);
  }

  blink() {
    if (free(this.blinkTl)) this.blinkTl.progress(1); // finish the blink in progress rather than overlapping a second one
    return (this.blinkTl = gsap.timeline().to(this.s, { blink: 0.08, duration: 0.06, onUpdate: this.touch }).to(this.s, { blink: 1, duration: 0.1, onUpdate: this.touch }));
  }

  /** Waving arm loop. Returns the timeline so callers can kill it. */
  wave(times = 3) {
    if (free(this.waveTl)) this.waveTl.progress(1); // a second wave settles the first instead of fighting it
    return (this.waveTl = gsap.timeline().to(this.s, { armR: 16, duration: 0.18, ease: "sine.inOut", yoyo: true, repeat: times * 2 - 1, onUpdate: this.touch }).to(this.s, { armR: 0, duration: 0.15, onUpdate: this.touch }));
  }

  /** Quick hop used for little reactions. */
  hop(h = 10) {
    if (free(this.hopTl)) this.hopTl.progress(1);
    return (this.hopTl = gsap
      .timeline()
      .to(this.s, { by: -h, bsy: 1.03, duration: 0.14, ease: "power2.out", onUpdate: this.touch })
      .to(this.s, { by: 0, bsy: 0.94, bsx: 1.05, duration: 0.14, ease: "power2.in", onUpdate: this.touch })
      .to(this.s, { bsy: 1, bsx: 1, duration: 0.22, ease: "elastic.out(1,0.5)", onUpdate: this.touch }));
  }

  /** Alternate leg swing; returns a tween that can be killed. */
  walk(speed = 0.16) {
    this.s.legL = -12;
    this.s.legR = 12;
    return gsap.to(this.s, { legL: 12, legR: -12, duration: speed, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: this.touch });
  }

  /**
   * The same stepping, for a figure travelling straight down a vertical road
   * (narrow screens): longer alternating steps with a small vertical bob, so
   * the movement reads as going down, not as walking sideways.
   */
  descend(speed = 0.2) {
    this.descending = true;
    this.s.legL = -16;
    this.s.legR = 16;
    return gsap
      .timeline({ repeat: -1 })
      .to(this.s, { legL: 16, legR: -16, by: -4, duration: speed, ease: "sine.inOut", onUpdate: this.touch })
      .to(this.s, { legL: -16, legR: 16, by: 0, duration: speed, ease: "sine.inOut", onUpdate: this.touch });
  }

  stopWalk() {
    const to: gsap.TweenVars = { legL: 0, legR: 0, duration: 0.15, onUpdate: this.touch, overwrite: "auto" };
    if (this.descending) {
      to.by = 0;
      this.descending = false;
    }
    gsap.to(this.s, to);
  }

  // ---------- geometry helpers ----------

  /** Convert an element's local point to svg user space (viewBox units). */
  toSvg(el: SVGGeometryElement, x: number, y: number) {
    const a = this.svg.getScreenCTM();
    const b = el.getScreenCTM();
    if (!a || !b) return { x, y };
    const m = a.inverse().multiply(b);
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }

  get parts() {
    return this.p;
  }

  /** Put the pencil tip at a point in svg user space. */
  pencilTip(x: number, y: number, rot?: number) {
    this.s.px = x;
    this.s.py = y;
    if (rot !== undefined) this.s.prot = rot;
    this.touch();
  }
}
