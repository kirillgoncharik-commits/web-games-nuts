# Nuts Games — Cinder Shift 64

M04 is a playable vertical session over the existing Airlock A–B–C mission and separate training range. Start a shift with one research point, inspect and confirm W1 (three-shot splitter), M1 (ground dash) or D1 (8 HP), read the seeded briefing, complete the mission and spend the first-victory reward. Replays test another build without farming research points. The result identifies the end of this preview; further missions remain M05.

The optional closed upper passage and repair cache are prepared in B from the campaign seed. Retry restores the same entry loadout and event plan, full allowed HP and zero score. Campaign stages and settings are stored separately in IndexedDB. Continue during combat explicitly restarts the mission entry. Storage failures leave the shift playable in memory with a warning. Damaged or incompatible progress requires explicit replacement.

All menus, HUD, prompts, settings, errors and preboot text support offline English/Russian. Saved language takes priority over the browser language; switching preserves the shift and focus. Keyboard, touch and standard gamepad mappings are supported. Physical-device acceptance remains open.

## Run and verify

Node.js 22.12+ and npm are required. Dependencies remain pinned.

    npm ci --ignore-scripts
    npm run dev
    npm run build
    npm run preview
    npm run check
    npm run art:check
    npm test
    CROSS_BROWSER=1 npm test

Production preview: http://127.0.0.1:4175/games/cinder-shift/. Move with A/D or arrows, jump Space, crouch S/down, fire J/X, interact E, use M1 K/C and pause Esc. M1 is available after purchase or in training. Menus support Tab/arrows, Enter/Space and Esc; gamepad A confirms, B returns and Menu pauses. Touch dock and sides remain selectable.

check validates EN/RU keys/parameters and TypeScript. Tests exercise real playthroughs, four plans × four builds, three post-win pairs, saves and failures, reload stages, input, layouts and M02/M03 regressions. Firefox/WebKit add full-route and focus checks; install with npx playwright install firefox webkit. macOS uses installed Google Chrome unless CHROME_PATH is set. CINDER_BASE_URL selects an existing preview; pass Playwright options after npm test --. Videos, measurements and screenshots are written into its output folder.

Simulation stays fixed at 60 Hz. ?fps=30 limits rendering; ?seed=<uint32> gives a repeatable new-campaign seed. Training awards no progress. Automated route durations are measured separately from screen-reading and whole-session time; these are not a human playtest or the future campaign's 20–30 minute target.

## Artifact and existing hosting

dist/cinder-shift/ is a relocatable static artifact. build-manifest.json records r01, build ID, actual source SHA, clean state and SHA-256/size of every file. Build from a final clean commit.

    npm run integrate -- /absolute/path/to/nutsbid-checkout

Integration verifies hashes and copies only the game into public/games/cinder-shift/. The previous artifact is backed up in .cinder-shift-previous/; prior hashed assets remain for already open tabs. A source push does not deploy nuts.bid. Published M03 is 0.3.0-m03.1. Current M04 delivery/publication status and hashes are in the release report. Preserve site CSP, consent, forms, locale pages and game-only no-transform HTML headers.

No external resources, translation service, SDK or mandatory server are required. Analytics stays disabled by default; the existing consent adapter never queues earlier events or loads an SDK. Diagnostics are inside Settings.

## References

- [M04 implementation](docs/cinder-shift/m04-status.ru.md)
- [Requirements](docs/cinder-shift/m04-requirements.ru.md)
- [Device and UX report](docs/cinder-shift/m04-device-report.ru.md)
- [Localization guide](docs/cinder-shift/localization.md)
- [Save compatibility and migration](docs/cinder-shift/save-format.md)
- [Current roadmap](docs/cinder-shift/roadmap-current.ru.md)
- [Series decisions](docs/series/decisions.ru.md)
- [M04 art, prompts and PSD export](art/m04/README.md)
- [Original GDD](docs/cinder-shift/GDD.ru.md)
- [Preview publishing](docs/preview-publishing.ru.md)

Brand is Cinder Shift 64 in both languages. IDs, save keys, URLs and historical filenames remain stable. Other concepts are Iron Frontiers 64, Riverline Zero 64, Forge Below 64 and Silent Relay 64; M04 does not implement them.
