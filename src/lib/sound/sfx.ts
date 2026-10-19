/**
 * The only thing the animation code knows about sound: a facade that does
 * nothing until the sound engine has registered itself, and never throws.
 * A missing, blocked or broken audio system therefore cannot touch animation.
 */
export type SfxName = "click" | "pop" | "chime" | "confirm" | "key" | "pencil" | "whoosh";

let impl: ((name: SfxName) => void) | null = null;

export const setSfx = (fn: ((name: SfxName) => void) | null) => {
  impl = fn;
};

export const sfx = {
  play(name: SfxName) {
    try {
      impl?.(name);
    } catch {
      /* sound is optional */
    }
  },
};
