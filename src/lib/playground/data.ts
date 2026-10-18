/**
 * Part 04 content. Contact details come from Milan's CV and nowhere else.
 */

export const PART4_INTRO = {
  kicker: "PART 04 / THE PLAYGROUND",
  title: ["A LITTLE", "PLAYGROUND."],
  line: "Three small things to poke at. All optional, none of them stands between you and the real content.",
} as const;

export const CONTACT = {
  headline: ["LET’S BUILD", "SOMETHING", "INTERESTING."],
  line: "Have an idea, a project, or an opportunity? Let’s talk.",
  email: "milansingla15@gmail.com",
  github: { url: "https://github.com/milansingla", label: "github.com/milansingla" },
  linkedin: {
    url: "https://www.linkedin.com/in/milan-singla-146437215/",
    label: "linkedin.com/in/milan-singla-146437215",
  },
  /** Where the primary button goes. */
  cta: { label: "SAY HELLO", href: "mailto:milansingla15@gmail.com" },
} as const;

export const FOOTER = {
  line: "Designed and built by Milan Singla with Next.js, React, TypeScript and GSAP.",
  year: "2026",
} as const;

/** Brush colours for the drawing pad: the site's ink and blue, its pencil red, and two quiet extras. */
export const COLORS = [
  { name: "Ink", hex: "#14110f" },
  { name: "Blue", hex: "#1f3dff" },
  { name: "Red", hex: "#d9482b" },
  { name: "Green", hex: "#2f7d4f" },
  { name: "Gold", hex: "#d19a14" },
] as const;

/** The incident, in order. Text only: the animation just reveals it. */
export const INCIDENT = {
  idle: "Nothing has fallen. Yet.",
  error: "ERROR 500: PRODUCTION is no longer upright.",
  excuse: "It worked on my machine.",
  recovered: "Rolled back. Everything is fine. (Everything is always fine.)",
} as const;
