# Cinder Shift M03 — production art

Original artwork generated with built-in imagegen, then prepared as a pixel rig and layered PSD sources. Exact prompts: `generation-prompts.json`. Generated originals and SHA256 provenance: `source/generated/` and `source/generated-files.json`. The document's visual target is reference material only. Exolon images are not shipped.

## Edit and export

Edit named layers in `source/mira.psd`, `enemies.psd`, `props.psd`, `environment.psd`, and `room-A/B/C.psd`. Keep each layer's canvas size and name; transparent margins are part of the anchor contract. Room PSDs contain independently editable landscape and architecture layers. The crouched torso is a hidden alternate layer in the Mira PSD; the head is shared.

- `npm run art:export` reads the PSDs and recreates transparent per-part PNGs, padded PNG/JSON atlases, room layers, previews and the application manifest.
- `npm run art:check` checks M02 core hashes, simulation methods, mechanics, atlas bounds, binary alpha, transparent edges and graphics budget.
- `npm run art:import` deliberately recreates the PSDs from generated originals and `source-layout.json`. Use this only to repeat the initial import; it replaces artist edits in those PSDs.

No network or canvas dependency is required for export. Node >=22.12 and locked `sharp` / `ag-psd` dependencies are used. Production files live in `games/cinder-shift/public/assets/m03/`; filenames contain content hashes for immutable site caching. Atlas rotation and trimming are disabled; each frame has at least 2 px padding. Nearest sampling, integer draw coordinates and hard alpha prevent filtering halos. Source-layer positions are PSD editing coordinates, distinct from runtime pivots.

## Existing animation slots

| M02 state | M03 raster binding |
| --- | --- |
| Idle, walk, jump/fall | Shared head + standing torso + two leg and boot parts; exact existing sine phase and rounding |
| Crouch | Same head; crouched torso; same procedural legs and boots |
| Fire | Same pose; cutter muzzle at player ±19, feet −28 / −15; no extra flash or recoil frame |
| Hurt | Same existing 80 ms tint toggle and 700 ms immunity; no pose sequence |
| Death | Same static tint and 350 ms delay |
| Walker patrol / warning / attack / recovery | One body frame; existing triangle and line appear only during warning; wreck after HP reaches zero |
| Drone route / warning / attack / recovery | One body frame; existing aim reticle and line; wreck after HP reaches zero |
| Target | Whole at 3 HP, damaged at 1–2 HP, hidden at 0 |
| Terminal | Off / available / powered static frame; existing 600 ms progress bar in C |
| Gate | Closed / open immediate texture change; existing 180 ms room transition |
| Projectiles | One raster per team, existing size and lifetime; no impact animation existed |

`animation-contract.json` captures M02 implementation eeee3de and artifact 826f27a before artwork changes. Collider and interaction code is unchanged. Debug rectangles require the explicit settings checkbox and are off by default.

## Anchor adaptations

Mira's editing canvas is 48×64, foot (24,60); the runtime body stays 22×44, crouched 22×26. The cutter layer has muzzle (21,4). Future static weapon / backpack / shoulder anchors are recorded in the manifest; no modules are playable in M03.

The walker canvas is 48×40, foot (24,38), muzzle (41,6), matching M02's emitter 32 px above the floor. Its side view shows the paired repair supports; the raised cutter is baked into the same static body frame. The drone canvas is 56×32 to retain M02's wide silhouette; sensor and muzzle share pivot (28,16). These canvas adaptations do not enlarge colliders.

The requested B concept mentions a terminal, but real M02 room B has none. The actual B review frame therefore contains the hero, both robots, cover, upper platform, windows/turbine and HUD. Playable terminals remain in A and C. The nine 16×16 tiles are placed from the real RoomDefinition solids; partial cells crop at exact collider boundaries. Decorative background beams never gain collision.

## Review

Previews in `previews/` include each room and enlarged atlases. The delivery directory contains actual 640×360 game frames, grayscale / thumbnail checks, phone screenshots and a playthrough. UI text remains live HTML, with Cyrillic sans-serif, 14 px helpers/HUD and 16 px menu text. All UI changes are instantaneous. Phone layout defaults to the same dock as M02; side controls remain an option.
