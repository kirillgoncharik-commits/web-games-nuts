# Original M05A audio

score.mjs is the complete deterministic source: harmonic pulse, triangle and seeded filtered noise, with short envelopes. No third-party recordings, music or samples. `npm run audio:export` writes 20 PCM16 mono 44,100 Hz cues, 8/16-bar menu/combat loops at 106 BPM, content-addressed runtime copies, registry.json and previews/all-sfx.wav. Original WAVs are in wav/. The registry includes each semantic ID, bus, priority, duration, size and SHA-256.

`npm run audio:check` inspects the actual PCM headers/samples, all hashes, 20–280 ms short cues, 0.5–1 s results, exact bar lengths, zero first/last music samples, non-silent RMS and peak limits. The conservative bound at all bus controls = 100% is (8×0.25 + 0.30 + 0.18) × master 0.32 = 0.7936, below clipping. This is a numerical headroom bound, not a speaker/headphone listening result.

AudioService uses one context unlocked by a trusted pointer/key action. Master mute, music/SFX/UI buses, no pending cue queue; max eight short cues plus one result and one loop. Warning/hurt priorities evict shots first. Stop envelopes last 4 ms and replacement starts after 5 ms; no music crossfade. Scene shutdown clears combat voices. Background hard-stops/disconnects all current/retiring nodes and suspends; foreground alone never resumes. Denied/decode/asset errors leave play available and expose an Enable audio control or notice in Settings.

Manual audition still required on Android, iPhone/Safari, speaker and headphones: compare warnings against held fire, check loop joins, switch menu/combat, mute each bus, pause/30-second background/resume, repeat retry ten times. Record device/browser/output, uncomfortable pitches, cue masking, clicks or accumulating sound. Automated checks do not certify perceived quality.
