/**
 * Freehand drawing engine for the Part 04 pad.
 *
 * What it does: records exactly what the visitor draws (a list of points per
 * stroke) and paints it smoothly. What it deliberately does not do: recognise,
 * snap, tidy or replace shapes. A stroke is only ever smoothed with a standard
 * midpoint curve, so a wobbly circle stays a wobbly circle.
 *
 * Input is Pointer Events only (mouse, touch, pen), with pointer capture so a
 * stroke continues when the pointer leaves the canvas. Rendering is
 * synchronous per event; there is no animation loop to leak.
 */

export interface Brush {
  color: string;
  /** Line width in CSS pixels. */
  size: number;
  erase: boolean;
}

export interface PadHooks {
  brush: () => Brush;
  onStart?: (clientX: number, clientY: number) => void;
  onMove?: (clientX: number, clientY: number) => void;
  onEnd?: () => void;
  /** Called when the stroke list changes (count after the change). */
  onChange?: (count: number) => void;
  /** Called when a new stroke is refused because the pad is full. */
  onFull?: () => void;
}

export interface Pad {
  undo: () => boolean;
  clear: () => void;
  count: () => number;
  destroy: () => void;
}

interface Stroke {
  brush: Brush;
  /** x, y pairs, in canvas-width units (so strokes scale if the canvas is resized). */
  pts: number[];
}

export const MAX_STROKES = 400;
const MAX_POINTS = 6000;
const MIN_STEP = 1.2; // CSS px; closer points add nothing

export function createPad(canvas: HTMLCanvasElement, hooks: PadHooks): Pad {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { undo: () => false, clear() {}, count: () => 0, destroy() {} };

  const strokes: Stroke[] = [];
  let live: Stroke | null = null;
  let active: number | null = null;
  let w = 1;
  let h = 1;
  let dpr = 1;

  const setupCtx = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const style = (b: Brush) => {
    ctx.globalCompositeOperation = b.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = b.color;
    ctx.fillStyle = b.color;
    ctx.lineWidth = b.size;
  };

  // pixel position of point i of a stroke
  const px = (s: Stroke, i: number): [number, number] => [s.pts[i * 2] * w, s.pts[i * 2 + 1] * w];
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  /** Paints the piece of the stroke that point `k` completes (k >= 1). */
  const segment = (s: Stroke, k: number) => {
    const p1 = px(s, k - 1);
    const p2 = px(s, k);
    const from = k === 1 ? p1 : mid(px(s, k - 2), p1);
    const to = mid(p1, p2);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.quadraticCurveTo(p1[0], p1[1], to[0], to[1]);
    ctx.stroke();
  };
  /** The last half-segment, from the last midpoint to the final point. */
  const tail = (s: Stroke) => {
    const n = s.pts.length / 2;
    if (n < 2) return;
    const from = mid(px(s, n - 2), px(s, n - 1));
    const end = px(s, n - 1);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  };
  const dot = (s: Stroke) => {
    const [x, y] = px(s, 0);
    ctx.beginPath();
    ctx.arc(x, y, s.brush.size / 2, 0, Math.PI * 2);
    ctx.fill();
  };
  const paintAll = (s: Stroke) => {
    style(s.brush);
    const n = s.pts.length / 2;
    if (n === 1) {
      dot(s);
      return;
    }
    for (let k = 1; k < n; k++) segment(s, k);
    tail(s);
  };

  const redraw = () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setupCtx();
    for (const s of strokes) paintAll(s);
    if (live) paintAll(live);
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const nw = Math.max(1, r.width);
    const nh = Math.max(1, r.height);
    const nd = Math.min(window.devicePixelRatio || 1, 3);
    if (Math.abs(nw - w) < 0.5 && Math.abs(nh - h) < 0.5 && nd === dpr && canvas.width > 1) return;
    w = nw;
    h = nh;
    dpr = nd;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    redraw();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const addPoint = (s: Stroke, cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    const x = (cx - r.left) / w;
    const y = (cy - r.top) / w;
    const n = s.pts.length / 2;
    if (n > 0) {
      const dx = (x - s.pts[(n - 1) * 2]) * w;
      const dy = (y - s.pts[(n - 1) * 2 + 1]) * w;
      if (dx * dx + dy * dy < MIN_STEP * MIN_STEP) return;
      if (n >= MAX_POINTS) return;
    }
    s.pts.push(x, y);
    if (n + 1 >= 2) {
      style(s.brush);
      segment(s, n);
    }
  };

  const finish = () => {
    if (!live) return;
    const s = live;
    live = null;
    active = null;
    style(s.brush);
    tail(s);
    strokes.push(s);
    hooks.onChange?.(strokes.length);
    hooks.onEnd?.();
  };

  const onDown = (e: PointerEvent) => {
    if (active !== null) return; // a second finger or button never starts a second stroke
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (strokes.length >= MAX_STROKES) {
      hooks.onFull?.();
      return;
    }
    e.preventDefault();
    active = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; drawing still works inside the canvas */
    }
    live = { brush: { ...hooks.brush() }, pts: [] };
    addPoint(live, e.clientX, e.clientY);
    style(live.brush);
    dot(live); // a click leaves a dot straight away; a drag paints over it
    hooks.onStart?.(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== active || !live) return;
    const list = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const evs = list.length ? list : [e];
    for (const ev of evs) addPoint(live, ev.clientX, ev.clientY);
    hooks.onMove?.(e.clientX, e.clientY);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (live && e.type === "pointerup") addPoint(live, e.clientX, e.clientY);
    finish();
  };
  const onLost = (e: PointerEvent) => {
    if (e.pointerId === active) finish();
  };
  const noop = (e: Event) => e.preventDefault();

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onLost);
  canvas.addEventListener("dragstart", noop);
  canvas.addEventListener("contextmenu", noop);

  return {
    undo() {
      if (live || !strokes.length) return false;
      strokes.pop();
      redraw();
      hooks.onChange?.(strokes.length);
      return true;
    },
    clear() {
      if (live) finish();
      strokes.length = 0;
      redraw();
      hooks.onChange?.(0);
    },
    count: () => strokes.length,
    destroy() {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("lostpointercapture", onLost);
      canvas.removeEventListener("dragstart", noop);
      canvas.removeEventListener("contextmenu", noop);
      live = null;
      active = null;
    },
  };
}
