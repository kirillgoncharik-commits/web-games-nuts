# Cinder Shift 64 art refresh v1

This package contains the 21 selected image families for build \`0.6.1-art.2\`.
The 96 runtime frames are in \`games/cinder-shift/public/assets/art-refresh-v1/\`.

## Rebuild

From the game repository root:

\`\`\`sh
npm run art:refresh
npm run art:check
\`\`\`

\`art:refresh\` splits each documented source grid, writes one editable OpenRaster
file per family with one layer per frame, cleans transparent pixels, fits each
sprite into a 96×96 nearest-neighbour frame, and recreates the padded PNG atlas,
frame map, manifests and contact sheets. \`art:check\` checks source and runtime
hashes, frame count, alpha, padding, editable source packages, coverage records,
map positions and touch sizing.

## Sources and limits

- \`source/generated/\` holds the original selected generator masters.
- \`source/editable/ART-01.ora\` … \`ART-21.ora\` holds source-canvas layers for
  individual generated states. The generator returned flattened raster sheets;
  these layers separate states, not the internal armor/core/background parts.
- \`generation-prompts.json\` records all prompt descriptions. For ART-01–14 and
  ART-16–21, the saved text is a reconstruction because exact historical prompt
  text was not present in the supplied files or retained output. ART-15's
  corrective prompt is verbatim.
- \`provenance.json\` records generation call IDs, source/reference hashes,
  processing and rejected variants. \`coverage.json\` keeps every state and
  V01–V10 flag distinct. Visual and publication flags stay open until evidence
  exists.

The selected ART-15 replacement is effect-only with a transparent center. The
previous variant with Mira in every cell was rejected. A separate turret sheet
with a dark gradient/halo was also rejected; neither rejected variant ships.

## Runtime budget

The refresh atlas is 535,684 bytes (523.1 KiB), 96 frames at 96×96, in an
802×1202 RGBA PNG. It uses 2-pixel atlas padding, with rotation and trimming
disabled. The first local production build reported 2,939,635 gzip bytes for
the complete game artifact; the clean-commit release build is recorded in its
build manifest.

## Review status

The 1× and 2× contact sheets have been inspected. Browser room, mobile viewport,
physical-device, monochrome/reduced-flash, and final production review must be
recorded in \`coverage.json\` before those flags are marked accepted.
