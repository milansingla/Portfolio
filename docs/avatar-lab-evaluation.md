# Bible Strong Avatar Lab — evaluation for The Little Engineer

**Decision: not integrated (Option C).** The canonical hand-drawn SVG stickman stays; its pose and expression system is reused for every Part 03 chapter.

## What was checked
- Repository README (smontlouis/bible-strong-avatar-lab), read on 2026-10-17.
- It is a browser studio for procedural 2D avatars. Output is a single `.avatar.json` rendered with `@bible-strong/avatar-react` (React) or `@bible-strong/avatar-web` (DOM), on top of `@bible-strong/avatar-core`. Photo Mode exports SVG/PNG snapshots.
- The README describes the look as “3D-inspired geometry with SVG rendering”.
- License: GNU Affero General Public License v3.0.

## Why it was rejected
1. **Style.** The portfolio's character is a flat, single-weight ink stickman. The studio's output is geometric and 3D-inspired; matching our figure would mean fighting its renderer, and a mismatch would make Part 03 look like a different site.
2. **Licence.** AGPL-3.0 is a network-copyleft licence. Bundling its runtime (or code derived from it) into a site served to the public would put the combined work under AGPL: the portfolio's source would have to be offered to every visitor. That is an obligation this project has not chosen to take on, and it was not assumed to be acceptable.
3. **Value.** The figure already has the needed states (idle, drawing, pointing, waving, falling, walk cycle, moods, gaze). Part 03 only needed more *roles*, which are choreography, not new art.

## What was done instead
- No code, package, asset or generated avatar from the repository is in this project.
- Roles (deployment engineer, teacher, communicator, experimenter) are built from the existing `Rig` and poses plus movement and props in each chapter.

This is an engineering assessment, not legal advice; if the decision is ever revisited, have the actual integration and deployment reviewed against the `LICENSE` file.
