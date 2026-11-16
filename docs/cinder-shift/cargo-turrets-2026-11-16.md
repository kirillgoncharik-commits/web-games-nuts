# Sector 2 / Cargo E and F — report and verification

Reported by Kirill on 2026-11-16: turrets in E/F are visible, do not fire, and cannot be destroyed. The user confirmed sector 2. The report was made while testing the live game; the recorded production baseline is alpha.1, but the loaded browser/save state was not available. This task has not updated production.

## Findings

- E (`e-turret`) is always powered, independently of E01. Its armor opens during recovery after the burst. The reported inactive state has not been reproduced. Two complete Cargo keyboard routes passed on the pre-fix PR10 tree, including destruction of E and passage through F. CI run 43884086233, job 133357384997. The checkout merge e92866d063ceb1a47d1c8f76b61e3dd75a6a8050 has no file differences from head 894f10f2186149152b1441092c03a6c6988c4e3e.
- F (`f-event-turret`) is deliberately off until an E01 entrance console is used. With no E01, or Relay POWER support, it stays off and does not count toward the room blockade. The lower cell route remains available. The disabled state was misleading because it still displayed enemy HP pips.
- E's old hint said that the armor was open after the first recovery even when it had closed again. The text depended on a persistent tutorial flag rather than the current damage window.

## Candidate changes

Runtime source 52e56d58b76822359954ddff1d29f073a525f19a, tree 2c52dc34c016e30c8903cba9fa7d3fd462db2bd6, PR10. Local equivalent 201aaca, same tree.

- Disabled turrets are dimmed, carry a static disconnected-power symbol, and have no live enemy HP pips. Powered turrets retain their ordinary states and health display.
- F explains its power state and the optional console/lower route. The nearby console and cell prompts retain priority.
- E's armor hint follows `turretPresentation().damageable` on each frame. The open message no longer remains after the window closes.
- HP, shot timing, activation thresholds, power rules, recovery length and damage rules were not changed. This is a confirmed presentation/hint correction, not a claimed fix for an unreproduced E AI freeze.

## Verification

- Local typecheck/i18n PASS: 885 matching EN/RU keys.
- Local production build PASS.
- Local 58 model tests PASS, including four authored E/F firing-and-destruction cases, with and without suspension/re-entry.
- Browser regression added: E with/without E01, F restoration and destruction, F without E01/cell route, Airlock staged turret. Each uses one initial encounter fixture, then ordinary keyboard input. Real enemy projectiles and destruction are required.
- Source 52e56d5: all five turret checks PASS in Chromium, Firefox and WebKit; all 54 encounter/UI/combat checks PASS per browser (162 total), run 43886261363. The artifact preflight also passed all five turret checks, 29 prior checks and 49 targeted world checks. Full world routes remain failed and separate from this report. Browser tests cannot run locally: the HTTP bind is denied (EPERM) and the isolated Chrome process aborts. The user's existing live tab is claimed by another session and was not modified.
- Browser screenshots and state attachments are test evidence, not human acceptance. The E report stays open until the reported failure is reproduced or checked in the user's specific save/browser state.

This report does not close M-RW3/M-RW4, declare an RC, or authorize a production-ready claim.

Evidence ZIP: artifact 14234952822 in run 43886261363, 21,508,685 bytes, SHA256 `33bd7d7aaf6e36600a49e99813ebe9e85745967080ee3588277066050a0d2ec7`. Reviewed screenshots show F with the disconnected-power symbol and no live HP pips, and E as a destroyed wreck. Later runtime `9017044` also corrects an unrelated SW02-D spawn/grounding overlap and improves full-world input paths. C02 subsequently passed all 20 rooms, five missions, final facts and persisted-result reload at b782ee2; C03 remains open. This is separate from the still-unreproduced E freeze report.

Final selected runtime gate on `90170441` succeeded: 5 turret + 29 prior + 50 world checks, both 20-room/five-mission ordinary-input routes, finals/facts and persisted-result reload. Immutable alpha.2 artifact 14237839242 (build cinder-v1.b18.a1) is checksum-verified and not deployed. This does not change the E report status: NOT REPRODUCED.
