# Localization

src/i18n/en.json is the complete canonical catalog; ru.json must have identical nonempty keys and named parameters. Values are complete phrases. IDs, save fields and telemetry event names never depend on translated text. I18n formats numbers/dates with Intl and falls back to English; an unknown key shows a generic error rather than its ID and warns in development.

Saved language (cinder-shift-language-v1, with separately stored IndexedDB settings) takes priority; otherwise ru/ru-* selects Russian, everything else English. The mirror lets preboot use the language before Phaser/IndexedDB finishes. Denied storage still permits changing language in memory. html.lang, title, description and accessible labels change with the UI. Campaign, attempt, panel and focus survive switching.

To add a language, add its full catalog, extend Locale/catalogs and I18n/SaveService validation, both selectors and preboot selection, then extend scripts/check-i18n.mjs to include it. Define browser matching explicitly. Update settings validation without changing game IDs. Run npm run i18n:export, npm run check and locale/layout/error checks. Never edit the generated boot guard manually. The check compares keys/parameters and static HTML/TypeScript references. Dynamic key families also require complete entries and behavior coverage.

For each new phrase, add the semantic key and same parameters in every catalog and pass values to t. Avoid concatenating translated fragments. The Cinder Shift 64 brand is identical in EN/RU. Check menus, purchase/event confirmations, briefing, pause, death/victory, continuation, settings, save errors and missing-bundle errors. Check portrait/narrow landscape, text expansion, focus and language after reload.
