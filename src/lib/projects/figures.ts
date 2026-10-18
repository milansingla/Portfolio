import type { ProjectId } from "./data";

/**
 * Where each chapter's stickmen finish. Percentages of the drawing's canvas;
 * `top` is where the feet are. The server renders these, so the page is
 * complete before (and without) the scroll timelines.
 */
export interface FigPlace {
  left: string;
  top: string;
  flipped?: boolean;
  pose: "idle" | "pointing" | "waving" | "drawing";
  /** Relative size of this figure, as a share of the canvas width. */
  size?: string;
}

export const FIGURES: Record<ProjectId, FigPlace[]> = {
  shipyard: [{ left: "13%", top: "94%", pose: "pointing" }],
  termedu: [{ left: "9%", top: "96%", pose: "pointing" }],
  "vrxed-meet": [
    { left: "11%", top: "90%", pose: "pointing" },
    { left: "89%", top: "90%", pose: "waving", flipped: true },
  ],
  vrxnuro: [{ left: "16%", top: "91%", pose: "pointing" }],
};
