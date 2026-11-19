# Alpha.8 - нулевая громкость и мобильные кнопки

18.11.2026. Source `753f3443c47cacb5224b28cb1a213410ada74d4e`, build `cinder-v1.b37.a2`, [доказательства](alpha8-verification.json), [PR10](https://github.com/kirillgoncharik-commits/web-games-nuts/pull/10). Это проверенная QA-итерация основной разработки. Общий M-RW3/RW4 и RC остаются незавершёнными. Alpha.8 не опубликована; production alpha.5 сохраняется.

## Исправления

Нулевая громкость теперь немедленно сбрасывает фактический GainNode даже при остановленном аудиовремени. Ненулевые уровни сохраняют короткое сглаживание. Предупреждение больше не должно возвращать старый уровень после отключения музыки.

На прежней реализации тест настоящей AudioService при остановленном AudioContext фиксировал настройку musicVolume=0, но реальный gain=1 и падал на прежнем пороге <0.00001. После исправления gain=0 до и после resume. Тест реального слайдера проверяет отключение, pause/resume, следующее предупреждение и возврат положительного уровня. Прежний warning-restore regression сохранён. Такой механизм объясняет класс расхождения старого Linux CI; конкретная причина остановки его clock не доказана.

Обоснование API: [W3C Web Audio, AudioParam.value](https://www.w3.org/TR/webaudio-1.0/#dom-audioparam-value). Setter обновляет current value и ставит событие на текущее аудиовремя; setTargetAtTime требует продвижения времени рендера.

Два compact-menu media rules и действия карты кампании сохраняют min-height=48px. Робот и статическое свечение остаются в своей области. Параметры движения, бой, геометрия, награды и формат сохранений не менялись.

## Проверки

Общая регрессия: 478 PASS / 0 FAIL, все 12 частей. Все восемь workflow / 50 latest jobs SUCCESS после отдельного C03 повтора. Первый C03 failure сохранён.

- Build/typecheck, 901 EN/RU ключей и art/source/animation contracts PASS.
- Выбранный CI gate: 178 PASS / 0 FAIL - 22 input, 3 audio, 33 layout, 35 environment models, 6 menu-art, 29 previous-RW3 и 50 world/UI checks. Пороги 48px, громкости и проверки пересечений сохранены.
- Cross-browser: 144 models; Chromium 80 PASS, Firefox/WebKit по 79 PASS и одному прежнему CDP-touch SKIP. Все три audio cases PASS в каждом браузере. Merge source `0c37b537` имеет files=[] относительно runtime.
- Полные C02/C03: по 20 комнат и пять миссий, финальные факты и reload результата PASS. У C03 первый CI-проход остановился в YU05-B у target552; персонаж был жив с HP5. Локальный полный повтор и targeted CI repeat прошли без изменения исходников или assertions. Первое падение и его artifact сохранены; стабильность автопрохождения остаётся открытой.
- Сверены GitHub ZIP, tar SHA256, manifest и все 71 файлов архива. CI screenshots относятся к тому же runtime source; просмотрены RU 390x844 и 667x300. Gain в CI: 0 при остановленном clock и после resume, 0 после слайдера вниз, 0.999679 после слайдера вверх. Это техническая проверка, не человеческое прослушивание.

Локальные ранние 3 audio + 33 layout + 6 ART-01 выполнены до коммита. После него чистая локальная сборка с тем же tree прошла полный C03. Временные серверы закрыты. Подробный снимок всех workflow и ограничения общего QA находятся в ведомости.

## Остаток

Все шесть исходных RW3 IDs остаются PARTIAL. Далее - оставшиеся подробные ситуации C03 (YU01/YU02/YU04/YU05), полный production art/animation/VFX/audio, затем RW4. Physical devices, human timing, dedicated fresh earned-unlock и Cargo E inactivity сохраняют прежний открытый статус. Routes используют явно обозначенный legacy C01 unlock fixture.

Отдельный C01 / Space Huggers эксперимент по ТЗ от 18.11.2026 остаётся самостоятельной веткой и preview. Эта итерация его не реализует и не переносит экспериментальную физику в основную игру.
