/**
 * Part 02 content. Every claim here comes from the CV facts supplied for this
 * project. Do not add dates, metrics, team sizes or outcomes that were not
 * provided, and keep future interests framed as interests.
 */

export type IllustrationId = "foundations" | "fullstack" | "experiments" | "product" | "next";

export interface Milestone {
  id: IllustrationId;
  n: string; // "01"
  label: string; // shown in small caps
  title: string;
  body: string;
  /** Optional factual detail rendered under the body. */
  facts?: { heading: string; items: string[]; chips?: boolean };
  /** What the road does when it reaches this milestone (drives branch styling). */
  branch: "none" | "circuit" | "workflow";
}

export const JOURNEY_TITLE = "The Engineer’s Journey";
export const JOURNEY_LEAD = "A road, drawn one milestone at a time.";

export const MILESTONES: Milestone[] = [
  {
    id: "foundations",
    n: "01",
    label: "01 / THE FOUNDATIONS",
    title: "First, learn how things work.",
    body: "Milan is pursuing a B.E. in Computer Science and Engineering at Chitkara University, Punjab.",
    facts: {
      heading: "On paper",
      items: [
        "Coursework: Data Structures, Algorithms, Operating Systems, Computer Networks, Database Management",
      ],
    },
    branch: "none",
  },
  {
    id: "fullstack",
    n: "02",
    label: "02 / BUILDING SOFTWARE",
    title: "From an idea to a working product.",
    body: "Milan has worked on independent full-stack projects across web and mobile platforms, covering software design, development, testing, and deployment.",
    branch: "circuit",
  },
  {
    id: "experiments",
    n: "03",
    label: "03 / THE EXPERIMENTS",
    title: "Curiosity leads to unexpected places.",
    body: "Milan explores AI/ML integration and software experiments, including work associated with VRxNuro.",
    facts: {
      heading: "Listed in the CV for VRxNuro",
      items: ["Python", "TensorFlow", "Flask", "Machine learning", "BioMistral"],
      chips: true,
    },
    branch: "circuit",
  },
  {
    id: "product",
    n: "04",
    label: "04 / BUILDING WITH PURPOSE",
    title: "Not just writing code. Building products.",
    body: "Milan has held Tech Lead responsibilities for Termedu and VRxED, contributing to products that bring software, communication, and education together.",
    facts: {
      heading: "From the CV",
      items: ["Termedu: a learning management system", "VRxED Meet: a real-time communication platform"],
    },
    branch: "workflow",
  },
  {
    id: "next",
    n: "05",
    label: "05 / WHAT’S NEXT",
    title: "The road is still being drawn.",
    body: "Milan’s interests include AI/ML, software engineering, iOS/macOS development, Swift, SwiftUI, mobile app design, and product building.",
    branch: "none",
  },
];

export const DOOR_LABEL = "THINGS I’VE BUILT";

export const PART3 = {
  kicker: "PART 03",
  title: "THINGS I’VE BUILT",
  line: "Projects, experiments, and products.",
};
