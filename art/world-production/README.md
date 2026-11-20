# Cinder Shift production art

Original generated masters, transparent-object crop maps, reproducible exports and editable SVG materials/hand layers. The untouched PNG masters and prompts are in `source/`. `manifest.json` records every source hash, exported frame, visible bounds and source rectangle.

Run `npm run art:production`, then `npm run art:check`. Export uses hard alpha, nearest-neighbour sampling and a shared 256-colour palette. Background textures are 320×140, displayed at 640×280 with nearest-neighbour filtering and loaded by sector. Original master pixels remain available for re-export.

The atlas contains 176 frames: 60 sector props, 60 mechanism states, 30 world-enemy states, 15 base-enemy states, 5 Regulator aperture states and 6 carry/action overlays. The runtime also uses 16 sector backgrounds and 10 material kits. Actual object positions come from gameplay geometry. The renderer never advances gameplay state.

`previews/contact-sheet.png` shows the actual exported frames. It is an asset preview, not a screenshot of the game. `playwright.art-production.config.ts` and the art-production workflow collect actual Phaser evidence in every room. Physical mobile/device validation and complete production acceptance remain open; see the alpha.15 report.

Original exports are retained as `reference-atlas.png` and `reference-manifest.json`. Runtime PNG/JSON, material SVG exports and the contact sheet are rebuilt automatically by npm check, build, dev, test and art checks. Derived runtime assets and previews are ignored by Git; source masters and SVGs remain versioned. The change to automatic export was prepared after the local environment disconnected and must pass CI on its own commit.
