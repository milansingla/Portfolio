import raw from "./poses.json";

export const stick = raw;
export type PoseName = keyof typeof raw.poses;
export type MoodName = keyof typeof raw.moods;

export const VB = {
  x: raw.viewBox[0],
  y: raw.viewBox[1],
  w: raw.viewBox[2],
  h: raw.viewBox[3],
};

/** Centre line of the body. The figure mirrors around this x. */
export const BODY_X = 130;
export const FOOT_Y = 275;
export const SHOULDER = { x: 130, y: 108 };
export const HIP = { x: 130, y: 178 };

export const colour = (k: string) =>
  ((raw.colors as Record<string, string>)[k] ?? (k === "none" ? "none" : k)) as string;
