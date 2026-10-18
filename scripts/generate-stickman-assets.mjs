// Generates standalone SVG files for each stickman pose from the same data
// the live component uses, so proportions and line weight can never drift.
// Run: npm run assets
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "src/lib/stickman/poses.json"), "utf8"));
const outDir = join(root, "public/assets/stickman");
mkdirSync(outDir, { recursive: true });

const { ink, paper, accent } = data.colors;
const colour = (k) => ({ ink, paper, accent, none: "none" })[k] ?? k;
const line = `fill="none" stroke="${ink}" stroke-width="${data.stroke}" stroke-linecap="round" stroke-linejoin="round"`;
const thin = (w) => `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

const pencil = (x, y, rot) => {
  const p = data.pencil;
  const parts = p.parts
    .map(
      (s) =>
        `<path d="${s.d}" fill="${colour(s.fill)}" stroke="${colour(s.stroke)}" stroke-width="${p.stroke}" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    .join("");
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${p.scale})">${parts}</g>`;
};

const face = (moodName) => {
  const h = data.head;
  const m = data.moods[moodName];
  const eyes = h.eyes
    .map(
      (e) =>
        `<circle cx="${e.x}" cy="${e.y}" r="${h.eyeR}" fill="${paper}" stroke="${ink}" stroke-width="${h.eyeStroke}"/>` +
        `<circle cx="${e.x}" cy="${e.y}" r="${h.pupilR}" fill="${ink}"/>`,
    )
    .join("");
  const brows = m.brows.filter(Boolean).map((d) => `<path d="${d}" ${thin(2.6)}/>`).join("");
  return `<path d="${h.path}" ${line}/>${eyes}${brows}<path d="${m.mouth}" ${thin(2.6)}/>`;
};

for (const [name, pose] of Object.entries(data.poses)) {
  const limbs = Object.values(pose.parts)
    .map((d) => `<path d="${d}" ${line}/>`)
    .join("");
  const extras = pose.extras.map((d) => `<path d="${d}" ${thin(3)}/>`).join("");
  const held = name === "drawing" ? pencil(data.pencil.hold.x, data.pencil.hold.y, data.pencil.hold.rot) : "";
  const { x, y, rot } = pose.head;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.viewBox.join(" ")}" width="${data.viewBox[2]}" height="${data.viewBox[3]}" role="img" aria-label="Hand-drawn stickman, ${name} pose">` +
    `<title>Stickman — ${name}</title>` +
    `<path d="${data.shadow}" fill="none" stroke="${ink}" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>` +
    limbs +
    `<g transform="translate(${x} ${y}) rotate(${rot})">${face(pose.mood)}</g>` +
    extras +
    held +
    `</svg>\n`;
  writeFileSync(join(outDir, `${name}.svg`), svg);
  console.log("wrote", `public/assets/stickman/${name}.svg`);
}
