# Nuts Games web games

Browser-first 2D games by Nuts Games. Cinder Shift now has the M02 Airlock mission: three rooms, walkers and drones, damage, a power objective, victory/death and retry. The original control room remains available as training. Phaser, TypeScript and Vite are pinned.

- First game: **Cinder Shift / Пепельная смена**, working creative direction for R01, inspired by Exolon.
- [Detailed GDD in Russian](docs/cinder-shift/GDD.ru.md)
- [Development plan and first implementation task](docs/cinder-shift/development-plan.ru.md)
- [Series decisions](docs/series/decisions.ru.md)
- [Preview publication under nuts.bid/games](docs/preview-publishing.ru.md)

## Run the prototype

Node.js 22.12+ and npm are required. Dependencies are pinned in `package-lock.json`.

```sh
npm ci --ignore-scripts
npm run dev
npm run build
npm run preview
```

Production-build preview: `http://127.0.0.1:4175/games/cinder-shift/`. Dev server prints its own URL.

`npm run check` checks TypeScript. `npm test` runs browser checks against the built artifact: actual keyboard completion and replay, focus pause, crouching and wall collisions, iframe/CSP/storage denial, touch cancellation and orientation, and emulated gamepad controls. On macOS tests use installed Google Chrome; override with `CHROME_PATH`. Elsewhere install Chromium with `npx playwright install chromium` first. CI installs its browser and uploads the artifact and screenshots.

Use Start mission → briefing → Enter airlock for the mission, or the separate training button for the original test room.

Movement: A/D or arrows; Space to jump; S/down to crouch; J/X to fire; E at the terminal; K/C for a test dash; Esc to pause. Touch and standard gamepad mappings are shown in the UI. The dash is available only in training. The mission uses the basic suit; campaign research and saves are not implemented.

The scene draws its own temporary graphics and synthesizes short sound effects. It downloads no external assets. External analytics is disabled in `game.config.json`; local diagnostics records `game_boot`, `game_ready`, errors and test lifecycle events. The optional adapter can call the host's existing `gtag` only after `nuts_analytics_consent_v1=granted`; it never loads an SDK or sends pending events later.

## Integrate with nuts.bid

`dist/cinder-shift/` is a relocatable static artifact with relative asset paths. `build-manifest.json` records the build version, source commit SHA, SHA-256 of each file, and size. Build from the final clean commit before integration.

```sh
npm run integrate -- /absolute/path/to/nutsbid-checkout
```

This verifies file hashes and copies only the game folder into `public/games/cinder-shift/`. The previous artifact, if present, is retained in `.cinder-shift-previous/` outside `public/`. Commit only the intended publication files. Verify the site's build and final URL separately; a push here does not deploy nuts.bid.

Preview destination: https://nuts.bid/games/. See [M02 verification status and open acceptance items](docs/cinder-shift/m02-status.ru.md) for completed checks and remaining acceptance work.

The first release route is the web. Paid editions, Steam and mobile stores are optional later decisions. Game identifiers remain stable when working titles change.

For the additional Firefox/WebKit full-route and focus checks, install `npx playwright install firefox webkit` and run `CROSS_BROWSER=1 npm test`. These engine checks do not replace physical Safari/iPhone testing. `?fps=30` is a diagnostic render limit; gameplay remains on a fixed 60 Hz simulation. Recorded playthrough measurements and videos are retained in test results.
