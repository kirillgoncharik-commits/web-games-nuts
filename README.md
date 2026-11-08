# Nuts Games — Cinder Shift 64

M05A adds Mira selection, a character workshop with current/preview parameters, a separate cost confirmation and original audio to the existing Airlock A–B–C vertical session. Start with one research point and choose W1 (three-shot splitter), M1 (ground dash) or D1 (8 HP). Purchases refresh the actual profile and next mission entry. Two future operator slots remain disabled. The first victory grants one point; replays do not farm rewards. The full five-mission campaign remains M05B.

The optional closed upper passage and repair cache are prepared in B from the campaign seed. Retry restores the same entry loadout and event plan, full allowed HP and zero score. Campaign stages and settings are stored separately in IndexedDB. Continue during combat explicitly restarts the mission entry. Storage failures leave the shift playable in memory with a warning. Damaged or incompatible progress requires explicit replacement.

All menus, HUD, prompts, settings, errors and preboot text support offline English/Russian. Saved language takes priority over the browser language; switching preserves the shift and focus. Keyboard, touch and standard gamepad mappings are supported. Physical-device acceptance remains open. M04 campaign records default to Mira without resetting progress. Three independent music/SFX/UI volumes persist; one AudioContext starts after a user gesture. Pause stops world audio and music while UI remains available, background suspends everything, and foreground requires explicit resume. Phaser audio is disabled to avoid an unused second context.

M05A.1 added a compact purchase summary, expandable technical stats, a separate workshop menu and clearer EN/RU labels. M05B.1 was previously published as the `0.6.0-m05b1.3` development preview from source `4c7b965`. The current `0.6.0-m06.0` preview, built from clean source commit `22da406857d2b690f136880d0fd642dce196e071`, is now published at [nuts.bid](https://nuts.bid/games/cinder-shift/?build=0.6.0-m06.0). It includes M05B.2–M05B.3, all 12 research nodes, accessibility settings, loading/menu art, eight original procedural music themes, six cues, eight build-time target profiles and the consent-gated web event contract. Music master WAVs are stored separately from runtime effects. Static game/site builds pass; GameAnalytics is not connected, and gameplay, device, human listening and platform acceptance remain open at 0/39 scenarios. See the [implementation status and release register](docs/cinder-shift/implementation-status.json), [quality-gate QA record](docs/cinder-shift/quality-gate-qa.ru.md), [unified beta gap list](docs/cinder-shift/unified-beta-gap-list.ru.md), [M05B.1 history](docs/cinder-shift/m05b1-status.ru.md) and earlier [development plan 0.2](docs/cinder-shift/development-plan.ru.md).

## Run and verify

Node.js 22.12+ and npm are required. Dependencies remain pinned.

    npm ci --ignore-scripts
    npm run dev
    npm run build
    npm run build:target -- web
    npm run build:target -- itch
    npm run preview
    npm run check
    npm run art:check
    npm test
    CROSS_BROWSER=1 npm test

`games/cinder-shift/platforms/targets.json` defines eight compile-time targets. `CINDER_TARGET` is not read from the URL. The web candidate is built by default; `npm run build:target -- <target>` rejects unknown names. Native target entries remain profile records until their official SDK, storage, locale and ad integrations are added. No target currently sends ad requests.

Production preview: http://127.0.0.1:4175/games/cinder-shift/. Move with A/D or arrows, jump Space, crouch S/down, fire J/X, interact E, use M1 K/C and pause Esc. M1 is available after purchase or in training. Menus support Tab/arrows, Enter/Space and Esc; gamepad A confirms, B returns and Menu pauses. Touch dock and sides remain selectable.

check validates EN/RU keys/parameters and TypeScript. Tests exercise real playthroughs, four plans × four builds, three post-win pairs, saves and failures, reload stages, input, layouts and M02/M03 regressions. Firefox/WebKit add full-route and focus checks; install with npx playwright install firefox webkit. macOS uses installed Google Chrome unless CHROME_PATH is set. CINDER_BASE_URL selects an existing preview; pass Playwright options after npm test --. Videos, measurements and screenshots are written into its output folder.

Simulation stays fixed at 60 Hz. ?fps=30 limits rendering; ?seed=<uint32> gives a repeatable new-campaign seed. Training awards no progress. Automated route durations are measured separately from screen-reading and whole-session time; these are not a human playtest or the future campaign's 20–30 minute target.

## Artifact and existing hosting

dist/cinder-shift/ is a relocatable static artifact. build-manifest.json records r01, build ID, actual source SHA, clean state and SHA-256/size of every file. Build from a final clean commit.

    npm run integrate -- /absolute/path/to/nutsbid-checkout

Integration verifies hashes and copies only the game into public/games/cinder-shift/. The previous artifact is backed up in .cinder-shift-previous/; prior hashed assets remain for already open tabs. A source push does not deploy nuts.bid. Published builds include 0.5.0-m05a.1 (artifact b450c6e), 0.5.1-m05a.1 (artifact 6f1a0cc), 0.6.0-m05b1.3 (source 4c7b965) and the current 0.6.0-m06.0 preview (source 22da406). Keep M05B.1 identified as an intermediate preview, not the complete Beta. Preserve site CSP, consent, forms, locale pages and game-only no-transform HTML headers.

The standalone web preview needs no translation endpoint or game backend. Web analytics loads only after the visitor grants consent; the consent adapter does not queue earlier events or load an SDK without consent. The unified beta work package defines separate SDK integrations for later platform-target builds.

## References

- [M05A implementation and manual acceptance](docs/cinder-shift/m05a-status.ru.md)
- [M05A art and exact generation prompt](art/m05a/README.md)
- [Original M05A audio sources and WAV registry](audio/m05a/README.md)
- [M06 music themes, cue list and WAV masters](audio/m06/README.md)
- [Platform target profiles and current limits](games/cinder-shift/platforms/README.md)

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

Brand is Cinder Shift 64 in both languages. IDs, save keys, URLs and historical filenames remain stable. Other concepts are Iron Frontiers 64, Riverline Zero 64, Forge Below 64 and Silent Relay 64; They are outside this delivery.
