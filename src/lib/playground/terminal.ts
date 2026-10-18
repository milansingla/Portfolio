import { PROJECTS } from "../projects/data";

/**
 * The simulated terminal.
 *
 * This is a pure lookup. The text a visitor types is compared, as a string,
 * against four fixed words and is never evaluated, executed, sent anywhere or
 * used as a property name. Anything else gets the same polite refusal.
 */

export const COMMANDS = ["help", "about", "projects", "coffee"] as const;
export type Command = (typeof COMMANDS)[number];

export const MAX_INPUT = 24;

export interface Result {
  known: boolean;
  lines: string[];
}

const HELP: string[] = [
  "Commands I know:",
  "  help      this list",
  "  about     who built this",
  "  projects  the four things above",
  "  coffee    ask for coffee",
];

const ABOUT: string[] = [
  "Milan Singla",
  "Computer Science and Engineering student, Chitkara University, Punjab.",
  "Builds full-stack applications across web and mobile, and keeps asking:",
  "“What if I built it myself?”",
];

const COFFEE: string[] = [
  "Brewing…",
  "HTTP 418: I’m a teapot.",
  "No coffee here. Shipping on curiosity instead.",
];

const projectLines = (): string[] => [
  ...PROJECTS.map((p) => `  ${p.n}  ${p.title.padEnd(11)} ${p.concept}`),
  "Scroll up for the full chapters.",
];

/** Collapse whitespace and case, and cap the length. */
export const normalise = (raw: string): string => raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_INPUT);

export function run(raw: string): Result {
  const cmd = normalise(raw);
  switch (cmd) {
    case "help":
      return { known: true, lines: HELP };
    case "about":
      return { known: true, lines: ABOUT };
    case "projects":
      return { known: true, lines: projectLines() };
    case "coffee":
      return { known: true, lines: COFFEE };
    default:
      return {
        known: false,
        lines: [`command not found: ${cmd.length ? cmd : "(nothing)"}`, "Try “help”. This is a simulation: it runs nothing."],
      };
  }
}
