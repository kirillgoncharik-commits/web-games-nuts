# Mira / M05A production art

The Figma desktop board is saved in reference/desktop-ui.png. Source: https://www.figma.com/design/s9RlVwcz5nEhwcCC2T1Wjn/ (desktop frame 1:5011, responsive frame 1:6781). Editable text, mint headings, oil panels and the three-column workshop are implemented with the existing Panels components and ui.css; the plain rectangle/vector UI references do not require bitmap runtime exports. The prototype's old Mira illustration is replaced with the updated production rig as requested. Reference URLs are not runtime dependencies.

The edited six-part source sheet is ../m03/source/generated/hero-m05a.png. Exact prompt/provenance: generation-prompts.json. The layered source remains ../m03/source/mira.psd. Only Mira was reimported; enemies keep their established sources. source-layout.json retains part canvases and anchors; the helmet uses 18×12 pixels inside its original 20×14 transparent canvas, aligned to the original chin baseline.

Regenerate with `node scripts/m03-assets.mjs --import --hero-only`, then `npm run art:export`. Never reimport all enemy PSDs from this edited cutter sheet. Runtime contact samples are produced by scripts/m05a-art-previews.mjs with the same t=0 angles, shoulder, leg and muzzle anchors as rig.ts. There are no new animation frames or interpolation. previews/ contains standing, crouching and firing at 1×/2× on both backgrounds, plus a larger review sheet. The separate 48×64 portrait assembles these same parts.

`npm run art:check` dispatches to the M05A contract against main 5ed5bed: complete module hashes for player, AI, geometry, projectiles, research, events and rig; scoped combat/clock blocks; all 34 previous atlas anchors. Semantic sound calls and renderer paint changes are the permitted exceptions.
