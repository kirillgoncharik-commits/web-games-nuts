# Cinder Shift 64 — M04 art

M03 layered production sources remain in art/m03/source/; this avoids changing existing paths/anchors. M04 edits standing/crouched torso, helmet and boot cream planes inside their existing silhouettes. Legs, cutter and shadow use the original M03 input to preserve proportions. A distinct squat repair cache is added as a 32×32 logical frame. A quieter lower wall strip, dimmer decorative door and visible functional exit are code placements of existing environment frames.

Exact built-in imagegen prompts: generation-prompts.json. Original M04 PNGs: ../m03/source/generated/hero-m04.png and repair-cache-m04.png. Provenance hashes: generated-files.json. These are edits/new original game assets; no reference-game imagery is shipped.

Edit named layers in ../m03/source/mira.psd and props.psd. Export with npm run art:export; validate with npm run art:check. npm run art:import deliberately reconstructs PSDs from generated sheets/source-layout and can overwrite artist edits. Background/enemy PSDs remain M03. Runtime assets still use assets/m03/ and content-hashed filenames.

M04 has 34 atlas frames and 97,820 bytes of raster production assets. All prior frame canvases, foot/pivot/muzzle/module anchors and layer bindings are checked unchanged. Base AI, damage, geometry, transitions, projectiles, rig and sampled leg phase are protected by mechanics-contract.json and behavioral tests; new effects are explicitly permitted. No new animation states, tween or blending are introduced.
