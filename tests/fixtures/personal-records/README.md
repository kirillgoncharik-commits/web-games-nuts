# Published alpha.12 profiles

These fixtures were captured by ordinary keyboard/UI play in the retained published binaries before the workstation disconnected. Each contains a campaign with a purchased D1 module, a completed Time Attack personal best and its ghost trace. The original capture metadata remains in each JSON file. They contain test runs, not the player's personal saves.

| Fixture | Gameplay source | Build ID | Fixture SHA-256 |
| --- | --- | --- | --- |
| `alpha12-web.json` | `836a04fbc8dc1cdb0d8dbbcba1ec0fc5b64034a5` | `local.20261119T132107351Z` | `aeb51ee2cd110d142cfc0261878f33737b71d989fc4f5a03ace02bba7a136312` |
| `alpha12-itch.json` | `003ffa91cec7f64b5b4c29c464c216bf5fd49865` | `local.20261119T144350017Z` | `96c953527deb6e08df7624f27a79524d8a0318b60ee4de86a0b0af10181b294f` |

`personal-records-legacy-model.spec.ts` checks the current validators, campaign migration, preservation of the purchased entry and separation of new counters from old PB/ghost data. It runs without a browser.

`personal-records-legacy.spec.ts` installs the captured records before the first game boot in a fresh browser context, then uses ordinary input to Continue, fire, open Personal records and reload. The product workflow runs it in Chromium, Firefox and WebKit. Installing before boot prevents an active statistics checkpoint from racing with fixture setup.

These are save compatibility checks. They do not certify a live nuts.bid/itch.io update, iframe storage behavior or binary rollback; those checks remain open and require the pinned previous runtime and appropriate host.
