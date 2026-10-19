# Background music

**File in the site:** `public/audio/ambient-portfolio.mp3` (served at `/audio/ambient-portfolio.mp3`)

| | |
| --- | --- |
| Supplied by | Milan Singla (chosen and downloaded by him) |
| Original file name | `ikoliks_aj-background-music-320427.mp3` |
| Creator (from the file name) | ikoliks_aj |
| Source | Pixabay (the `-320427` in the file name is the Pixabay track number) |
| Format | MP3, 44.1 kHz stereo, about 256 kbps, 143.4 s, 4.4 MB |
| Loudness | about -9.5 LUFS integrated, true peak +0.4 dBFS (mastered loud) |

## Licence: not verified here

Pixabay tracks are normally offered under the **Pixabay Content License**, which as far as I know allows free use
including commercial use, with no attribution required. **I could not open Pixabay from the environment this was built in,
so I did not read the licence for this specific track and cannot confirm it.** Before publishing, please:

1. Open the track's own page on Pixabay (search for track number 320427) and read the licence shown there.
2. Keep that page, or a screenshot of it, with your records.
3. If it asks for attribution, add the credit to the site footer (or here) as it requires.

## How the site plays it

- Off by default. The browser does not request the file until the visitor switches music on (it is not preloaded).
- Fades in over about 1.8 s and out over 0.7 s. One player at a time; navigating between sections does not restart it.
- Looping is done in code so each pass fades in (the file ends with a fade-out and starts abruptly).
- The slider scales the level: its maximum is 0.35 of full volume, because the track is mastered loud.
- Pauses while the tab is hidden and resumes when it returns.
- If the file is missing or cannot be decoded, a quiet generated pad plays instead, so the control still works.
- Sound effects are separate (synthesised in the browser) and are not affected by the music switch.
