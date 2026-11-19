# Art + Motion 01

10 authored pixel-art environment rigs, 44 editable parts, used by all 40 new-world rooms.
Source: `games/cinder-shift/src/art/motion-atlas.ts`. Phaser renderer: `world-motion.ts`.

| Mission | Art | Motion |
| --- | --- | --- |
| SW01 | Copper kettle | Two steam layers, warm stove light |
| SW02 | Desk fan | Rotating blades, two dust planes |
| SW03 | Laundry | Independent cloth motion, air ribbons |
| SW04 | Terracotta plant | Wind through leaves, pollen |
| SW05 | Bookshelf lighthouse | Beacon light, dust |
| YU01 | Relay cabinet | Signal meter, relay slider, indicator |
| YU02 | Moored boat and dock lamp | Tide, pennant, two water planes, light reflection |
| YU03 | Railway signal | Catenary current, signal light |
| YU04 | Factory flywheel | Rotor, belt markers |
| YU05 | Rooftop antenna | Two signal planes, pennant |

`preview.html` is a self-contained animated source gallery with Pause and Reduced motion.
`motion-preview.gif` and `contact-sheet.png` are source-art previews, not game screenshots.
`svg/` contains the exact editable resting-pose export of each rig.
`manifest.json` records geometry, palette, keyframes and the source hash.

`npm run art:motion` reproduces every export. `npm run art:check` verifies source/export parity.
Movement is sampled from simulation milliseconds at 80 ms intervals. Reduced effects retain static art.
The renderer is decorative: no collision, hazard, progression, music or rewards are changed.
Contact/circuit confirmations use four local flecks for 480 ms; reduced feedback uses one static outline.

## Figma status

Destination: https://www.figma.com/design/M2XBW1Q0YPhOPQqNaRVQVW

The file was created on 2026-11-19. Import was blocked immediately afterward by the connected
Starter plan's MCP call limit. **The destination contains no imported art; native timelines are not verified.**

`figma-import.js` is a prepared script for the connected Figma editor runtime, not a standalone Node script.
It imports native SVG vectors, places editable parts and builds 80 ms HOLD keyframes from the same source.
Rotor frames are centered on the actual source pivots. Run only after the required Figma guidance and
library discovery are available. Inspect the resulting vectors and timelines before changing the status.

## Runtime verification follow-up

Source `d4c72ec` adds native Phaser pixel checks for all ten rigs, pause, and the actual reduced-motion checkbox.
`runtime-contact-sheet.png` contains ten real game frames from Chromium artifact `14508387240`;
it is separate from the SVG source preview. Both complete world routes and 210 selected runtime checks pass.
See `docs/cinder-shift/alpha11-verification.json` for the current broader CI status and the preserved initial quay failures.
