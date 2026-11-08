# Cinder Shift 64 — M06 audio

The game has eight original score themes generated from compact note/event data in `synth.mjs`. They use square, triangle and filtered-noise voices through the existing single Web Audio context. The runtime does not download full music WAVs; it schedules notes after the player enables audio. Menu/map themes switch with the screen, sector themes follow the campaign mission, and the Regulator room uses the boss theme.

## Themes

| Theme | Use |
| --- | --- |
| `menu` | Main menu and research screens |
| `map` | Campaign map |
| `airlock` | Airlock sector and training |
| `freight` | Cargo sector |
| `foundry` | Foundry sector |
| `archive` | Archive sector |
| `reactor` | Reactor rooms outside the boss encounter |
| `boss` | Regulator encounter |

The six specified stingers are `mission_start`, `module_purchase`, `mission_win`, `mission_death`, `boss_intro` and `campaign_clear`; `mission_retry` is an extra short cue. The 25 runtime effects, cues included, are indexed by `games/cinder-shift/src/audio/assets.generated.json`.

## Files and generation

- `synth.mjs` and `synth.d.mts` are the score source and TypeScript declarations.
- `registry.json` records score metadata, runtime effect bytes and hashes.
- `wav/` contains mono PCM16/44.1 kHz theme masters for audition and review. These are not copied into the game package.
- `npm run audio:export` regenerates the hashed runtime effects and all eight master WAVs.

The score and effects are deterministic local synthesis; no external recordings or transcribed melodies are used. The cited interview discusses Hiroyuki Iwatsuki's work on other games; Nippon Columbia credits KAZZ TOYAMA on the official Jetman music collection. Listening comparison remains open. LUFS and true-peak fields are left null until measured. Human listening, loudness balance and loop-transition acceptance remain open; Playgama still needs tool-produced or recorded OGG/MP3 masters.

## Reference

- [Game Developer interview with Hiroyuki Iwatsuki](https://www.gamedeveloper.com/audio/interview-8-bit-to-i-omega-five-i-with-hiroyuki-iwatsuki)
- [Nippon Columbia's official Jetman music collection page](https://columbia.jp/prod-info/COCC-72233/)
