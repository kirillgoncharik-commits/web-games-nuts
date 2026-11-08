# Build target profiles

`targets.json` is the build-time target matrix. Use `npm run build:target -- <id>`; omitting the id selects `web`. The build manifest records the selected target and its integration status. The target is compiled into the bundle and is not selected by a URL parameter.

The shared `PlatformAdapter` shape lives in `src/platform.ts`. Its ad method returns `unsupported` immediately, so no ad request or callback can hold campaign progress. Current web behavior uses the existing IndexedDB save path and consent-gated host analytics. Itch has no ad or external analytics SDK in this candidate.

The other six entries are not native integrations. Their SDKs, profile/Bridge storage, locale, pause/audio lifecycle and allowed ad flows remain unimplemented. Each requires its own official API review and access before preview. No SDK is included in any current bundle.
