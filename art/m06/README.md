# M06 visual UI and vector art

Scope revision 1.2 adds the screen chrome, station map and module symbols as editable code-native SVG/CSS sources. The published M06 master promo images remain the existing art; this pass does not regenerate them.

## Sources

- `games/cinder-shift/src/ui-art.css` — clipped station frames and the normal, hover, focus, pressed, disabled and busy states for live controls.
- `games/cinder-shift/src/ui/caldera-complex.svg` — architectural layers `sector-airlock`, `sector-cargo`, `sector-foundry`, `sector-archive` and `sector-reactor`; no labels are baked into the map.
- `games/cinder-shift/src/ui/world-map.ts` — campaign-driven route, mission pins, selection and status labels over the static architecture.
- `games/cinder-shift/src/ui/research-icons.ts` — one editable vector glyph per node ID W1–W4, M1–M4 and D1–D4, plus distinct selection-state marks.
- `art/m06/quality-runtime-art-contract.json` — asset IDs, runtime links, states and node-to-icon mapping.

## Previews

Run `npm run art:m06:icons` to export the 12-symbol contact sheet at 1× and 2× and map previews at 360, 720 and 1200 pixels. The icon sheet samples 24, 32 and 48 CSS-pixel sizes and shows the six state marks on W1.

Generated review files are in `art/m06/previews/`. They are not copied into the game runtime. Runtime localization, campaign progress and mission accessibility remain data-driven.

Human visual approval, same-screen desktop/mobile captures and physical-device review are still required before this art can be marked accepted or deployed.
