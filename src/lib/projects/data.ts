/**
 * Part 03 content. Every claim carries its provenance:
 *   cv    — stated on Milan's CV
 *   repo  — read in the project's public GitHub repository (README, source or build output)
 *   site  — read from the live site's own page metadata
 * Nothing here is estimated. If a fact could not be verified it is not in this file.
 */

export type Source = "cv" | "repo" | "site";

export type ProjectId = "shipyard" | "termedu" | "vrxed-meet" | "vrxnuro";
export type Layout = "split-right" | "split-left" | "wide" | "split-right-tall";
export type LinkCheck =
  /** The destination answered and identifies itself as this project. */
  | "reachable"
  /** Listed on the CV; the destination could not be fetched from the build environment. */
  | "cv-listed"
  /** Repository exists and contains the project. */
  | "repo-verified";

export interface Fact {
  text: string;
  source: Source;
}
export interface Tech {
  name: string;
  source: Source;
}
export interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}
export interface ProjectLink {
  url: string;
  label: string;
  check: LinkCheck;
}

export interface Project {
  id: ProjectId;
  n: string;
  title: string;
  category: string;
  /** The one-line description supplied for the portfolio. */
  description: string;
  /** Years as written on the CV. */
  when: string;
  role?: string;
  layout: Layout;
  /** Short name of the visual metaphor, shown as a caption under the drawing. */
  concept: string;
  /** What the drawing shows, for assistive technology (the drawing itself is decorative). */
  illustrationAlt: string;
  tech: Tech[];
  /** Facts that are verified; shown under “How it’s built”. */
  details: Array<{ heading: string; items: Fact[] }>;
  /** Real screenshots only. Empty means: show the labelled illustration instead. */
  screenshots: Shot[];
  /** Shown beneath a stand-in panel, which is an illustration and not the product. */
  schematicLabel: string;
  links: { live?: ProjectLink; repo?: ProjectLink };
  /** Open questions for the owner; never rendered. */
  todo?: string[];
}

export const PART3_INTRO = {
  kicker: "PART 03 / SELECTED PROJECTS",
  title: ["THE THINGS", "I’VE BUILT."],
  line: "Four projects. Different problems. One engineer who kept asking, “What if I built it myself?”",
} as const;

export const PROJECTS: Project[] = [
  {
    id: "shipyard",
    n: "01",
    title: "SHIPYARD",
    category: "Deployment Infrastructure / Developer Tools",
    description: "A self-hosted deployment platform for containerized applications.",
    when: "2026",
    layout: "split-right",
    concept: "The deployment factory",
    illustrationAlt:
      "A stickman beside a conveyor belt. An application box passes a build station, a health-check station that turns from checking to healthy, and a routing station that sends traffic to it. The box then opens onto the real dashboard.",
    tech: [
      { name: "Node.js", source: "cv" },
      { name: "Docker", source: "cv" },
      { name: "Traefik", source: "cv" },
      { name: "JavaScript", source: "cv" },
      { name: "TypeScript", source: "repo" },
      { name: "Next.js", source: "repo" },
      { name: "PostgreSQL", source: "repo" },
    ],
    details: [
      {
        heading: "What it does",
        items: [
          { text: "Self-hosted platform for containerized applications, with health checks and zero-downtime redeployment.", source: "cv" },
          { text: "Connect a GitHub repository and it detects the stack, builds it, runs it, health-checks it and serves it at a stable address.", source: "repo" },
        ],
      },
      {
        heading: "How a deployment moves",
        items: [
          { text: "A deployment passes through queued, cloning, detecting, building, starting, health-checking, healthy, routing and running. A failure records the stage it failed in, plus a plain-language diagnosis.", source: "repo" },
          { text: "Traefik switches traffic to the new version only after it answers its health check; the old version keeps serving until then.", source: "repo" },
          { text: "One-click rollback to an earlier deployment.", source: "repo" },
        ],
      },
      {
        heading: "Engineering decisions",
        items: [
          { text: "The deploy queue lives in PostgreSQL: workers claim jobs with FOR UPDATE SKIP LOCKED and hold renewable leases, so a lost worker’s job can be recovered.", source: "repo" },
          { text: "Repository contents are treated as untrusted input. Secrets are encrypted at rest and never baked into images.", source: "repo" },
          { text: "A 27-model PostgreSQL schema across 28 migrations, with unit and integration test suites.", source: "repo" },
        ],
      },
    ],
    screenshots: [
      {
        src: "/projects/shipyard/dashboard.webp",
        width: 1600,
        height: 1000,
        alt: "The Shipyard dashboard: a projects overview with a pipeline of clone, detect, build, health check and live, fleet counts, and a list of projects with their status and address. Sample data.",
        caption: "The Shipyard dashboard (sample data, from the project’s README).",
      },
      {
        src: "/projects/shipyard/deployment-diagnosis.webp",
        width: 1600,
        height: 1000,
        alt: "A failed deployment in Shipyard with the stage it failed in and a plain-language diagnosis. Sample data.",
        caption: "A failed deployment, with its diagnosis (sample data).",
      },
      {
        src: "/projects/shipyard/project.webp",
        width: 1600,
        height: 1000,
        alt: "A single project page in Shipyard showing its deployments and status. Sample data.",
        caption: "A project page (sample data).",
      },
    ],
    schematicLabel: "Illustration — not the Shipyard interface",
    links: {
      repo: { url: "https://github.com/milansingla/shipyard", label: "Source on GitHub", check: "repo-verified" },
    },
  },
  {
    id: "termedu",
    n: "02",
    title: "TERMEDU",
    category: "Education Technology / Learning Management System",
    description: "A full-stack learning management system for course access, progress tracking, and assignment submission.",
    when: "2026",
    role: "Tech Lead",
    layout: "split-left",
    concept: "Building a classroom",
    illustrationAlt:
      "A stickman carries in a blackboard, then draws a classroom around it: student desks, course shelves, an assignment tray and a progress chart. The drawing gives way to an interface panel.",
    tech: [
      { name: "Java", source: "cv" },
      { name: "Android Studio", source: "cv" },
      { name: "Firebase", source: "cv" },
      { name: "MySQL", source: "cv" },
      { name: "React", source: "repo" },
      { name: "Node.js", source: "repo" },
      { name: "Express", source: "repo" },
      { name: "Supabase", source: "repo" },
    ],
    details: [
      {
        heading: "What it does",
        items: [
          { text: "Full-stack learning management system for course access, progress tracking and assignment submission.", source: "cv" },
          { text: "User authentication, a course catalog, real-time notifications and an analytics dashboard.", source: "cv" },
          { text: "Milan served as Tech Lead.", source: "cv" },
        ],
      },
      {
        heading: "The web platform",
        items: [
          { text: "The Termedu-LMS repository holds the web platform: a React 19 single-page client and a Node.js / Express API, backed by Supabase (PostgreSQL).", source: "repo" },
          { text: "Course catalogue and video player with progress tracking, assignments and project submissions, and role-based access for students, lecturers and administrators.", source: "repo" },
          { text: "Live classes through Daily.co, an AI-assisted entrance exam using Google Gemini, and push notifications through Firebase Cloud Messaging.", source: "repo" },
        ],
      },
      {
        heading: "The Android app",
        items: [
          { text: "A companion Android app lives in a separate repository (package in.termedu.app). It is written in Java and presents the Termedu web platform as a native app.", source: "repo" },
          { text: "Push notifications through Firebase Cloud Messaging, with UnifiedPush as an alternative.", source: "repo" },
          { text: "Deep links into the platform, file upload and download for course material and assignments, and lock-screen media controls.", source: "repo" },
        ],
      },
    ],
    screenshots: [
      {
        src: "/projects/termedu/interface.webp",
        width: 1600,
        height: 869,
        alt: "The Termedu student portal on its Live page: a sidebar with Home, Courses, Live, Projects, Materials, TEET, Plans, Profile and Notifications, a Free Workshops and Live Classes switch, and a Join with Meeting Link box. A demo student account is signed in.",
        caption: "The Termedu student portal (demo account).",
      },
    ],
    schematicLabel: "Illustration — not the Termedu interface",
    links: {
      repo: {
        url: "https://github.com/milansingla/Termedu-LMS",
        label: "Source on GitHub",
        check: "repo-verified",
      },
    },
    todo: ["The CV lists app.termedu.in, but it is reported not to work, so it is deliberately not linked"],
  },
  {
    id: "vrxed-meet",
    n: "03",
    title: "VRxED MEET",
    category: "Real-Time Communication / Virtual Education",
    description: "A real-time communication platform designed for virtual education environments.",
    when: "2025 – 2026",
    role: "Tech Lead",
    layout: "wide",
    concept: "Two people, one connection",
    illustrationAlt:
      "Two stickmen on either side of the page. A pencil line from one reaches the other, then carries three small icons for video, screen sharing and chat, and finally opens into a meeting window.",
    tech: [
      { name: "WebRTC", source: "cv" },
      { name: "Node.js", source: "cv" },
      { name: "JavaScript", source: "cv" },
      { name: "Socket.io", source: "cv" },
      { name: "Daily.co", source: "cv" },
    ],
    details: [
      {
        heading: "What it does",
        items: [
          { text: "Video conferencing platform for virtual education environments, with real-time audio and video, screen sharing, chat and recording.", source: "cv" },
          { text: "Runs in the browser with nothing to install.", source: "repo" },
          { text: "Live translation during meetings, as described in the repository README.", source: "repo" },
        ],
      },
      {
        heading: "In the public repository",
        items: [
          { text: "The repository holds the production build of the front end (React), not its source. That build calls Daily.co and Supabase and contains the chat, screen-share, recording and translation interface code.", source: "repo" },
          { text: "Milan served as Tech Lead.", source: "cv" },
        ],
      },
    ],
    screenshots: [
      {
        src: "/projects/vrxed-meet/interface.webp",
        width: 1600,
        height: 880,
        alt: "The VRxED Meet home page: the headline “Powering the Future of Medical Education”, a Join with Code box with a meeting-code field, and Explore Solutions and Request Demo buttons.",
        caption: "The VRxED Meet home page.",
      },
    ],
    schematicLabel: "Illustration — not the VRxED Meet interface",
    links: {
      live: { url: "https://meet.vrxed.com", label: "meet.vrxed.com", check: "reachable" },
      repo: { url: "https://github.com/milansingla/VRxED-Meet", label: "Build on GitHub", check: "repo-verified" },
    },
    todo: ["Confirm the Node.js / Socket.io services (not in the public repository)"],
  },
  {
    id: "vrxnuro",
    n: "04",
    title: "VRxNURO",
    category: "Artificial Intelligence / Analytics",
    description: "An AI-powered analytics platform for neural computing and predictive data analysis.",
    when: "2025 – 2026",
    layout: "split-right-tall",
    concept: "The idea becomes a network",
    illustrationAlt:
      "A single point on the page. A stickman touches it with a pencil and it branches into a network of connected nodes, which settles into a hand-drawn chart and then an interface panel.",
    tech: [
      { name: "Python", source: "cv" },
      { name: "TensorFlow", source: "cv" },
      { name: "Machine learning", source: "cv" },
      { name: "Flask", source: "cv" },
      { name: "BioMistral", source: "cv" },
    ],
    details: [
      {
        heading: "What it does",
        items: [
          { text: "Intelligent platform for neural computing and predictive data analysis.", source: "cv" },
          { text: "Integrates machine-learning models for predictive analytics and decision support.", source: "cv" },
        ],
      },
      {
        heading: "In the public repository",
        items: [
          { text: "The repository holds the production build of the front end, a single-page app for static hosting, not its source.", source: "repo" },
          { text: "Its README describes VRxNuro as an AI assistant for questions, creative tasks and coding, built on the BioMistral model.", source: "repo" },
        ],
      },
      {
        heading: "What is not claimed here",
        items: [
          { text: "No accuracy, dataset-size, speed, user-count or validation figures are given: none have been verified.", source: "cv" },
        ],
      },
    ],
    screenshots: [
      {
        src: "/projects/vrxnuro/interface.webp",
        width: 1600,
        height: 986,
        alt: "The VRxNuro welcome screen: “Welcome to VRxNuro”, three starter prompts (have a conversation, get creative ideas, write some code) and a message box at the bottom.",
        caption: "The VRxNuro chat interface.",
      },
    ],
    schematicLabel: "Illustration — not the VRxNuro interface",
    links: {
      live: { url: "https://ai.vrxed.com", label: "ai.vrxed.com", check: "reachable" },
      repo: { url: "https://github.com/milansingla/VRxNuro-", label: "Build on GitHub", check: "repo-verified" },
    },
    todo: [
      "The live page titles itself “Your Intelligent AI Assistant”: confirm the analytics-platform wording",
    ],
  },
];

export const PART4_TEASER = "Part 04 — The playground and the final act";
