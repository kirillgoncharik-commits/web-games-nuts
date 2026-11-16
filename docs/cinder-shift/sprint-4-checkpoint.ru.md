# Финальный этап Cinder Shift — checkpoint 16.11.2026

**INCOMPLETE / NOT RC / NOT ACCEPTED.** Вход M-RW4 выявил незавершённый M-RW3. Выполнена следующая производственная итерация M-RW3; сравнительный M-COMPARE не запускался.

## Точное состояние

Ветка `codex/cinder-shift-final`, draft [PR10](https://github.com/kirillgoncharik-commits/web-games-nuts/pull/10), база — `codex/cinder-shift-m-rework` / PR9. Исходный remote `487b6757e60f1b7152e566503139d9cd425f57eb` перед началом сверён через compare: identical.

Текущий runtime source: `40ef862630f80948c2c2375700a6e39aee036fc6`. Точный отчёт — [sprint-4-verification.json](sprint-4-verification.json); каталог новых комнат — [new-world-runtime-registry.json](new-world-runtime-registry.json).

Первая поставка remote `1fba2c9f1452c457f0a4d5833b526215049b586f` совпадала с локальным `0d3f38a6772320c867482706bb3edf5c1f307722` по tree `6f7d31b5895c3eb1bc7314805e27359cfda23775`. Затем локальная среда отключилась. Последующие исправления сохранены через GitHub и проверялись своим CI. Старую локальную копию `7a69ad8` нельзя продолжать без fetch/сверки нового HEAD.

## Реальная поставка alpha.2

- 40 утверждённых SW/YU room IDs, десять миссий A–D, общая сцена/физика/бой/Мира/мастерская и переходы. C01 сохраняет 44 комнаты и обе Foundry-ветки.
- Carry/pickup/throw/drop на interact, запрет огня/заряда с занятыми руками, одноразовая защита крышкой, возврат обязательного предмета, последовательные контакты и ledger.
- A/B меняет реальные коллайдеры. Замыкание внутри тела отклоняется; цели показывают один/два индикатора. Исправлены размещение контактов крыши/состава и высота визуального маркера; модели учитывают fixed и активные circuit solids.
- Устойчивое открытие после полного C01, selector и отдельные progress/purchases/entry/result миров. Future/corrupt records защищены. Исправлено восстановление world save после write failure, с проверкой сохранности C01.
- Canonical fragments SW01/SW03/SW04 проверяются перед SW05; YU записывает передачи. Повтор callback не даёт награду.
- Карты, процедурный секторный art draft, 14 оригинальных scheduler themes, 131 новая EN/RU строка, notes alpha.2. Итоговые сводки миров отделены от C01 history; подтверждение записи связано с фактическим save result.
- Готовый terminal exit имеет приоритет над повторным подбором уже использованного carry item.

Это подключённый **runtime draft**, а не выполненный production pack.

## Проверки

Локально на первой поставке: build/typecheck/i18n (882 EN/RU ключа), прежние art/anchor/rig contracts, reproducible C01 registry и 164 модельных теста PASS. Локальный HTTP server был запрещён (listen EPERM), затем среда стала unavailable.

Текущий exact-source [CI 43873344613](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43873344613):
- build/typecheck PASS;
- прежний RW3 pack: 29 PASS;
- новый targeted pack: 49 PASS, включая action models, placement checks, selector/notes/механику, обычные входы и recovery world save;
- полные C02/C03 input routes: **0 PASS / 2 FAIL**.

C02 останавливается в SW01-C: контакт выполнен, но driver пробует ремонт вне радиуса. C03 — в YU01-C: driver стреляет с верхней платформы в нижний уровень дрона. Эти факты не доказывают игровой softlock; полный пользовательский маршрут остаётся непроверенным. Нельзя закрывать его по моделям, удалить проверку ради зелёного CI или объявить обе кампании сданными.

Начальный unlock в новых тестах — явно обозначенная legacy C01 completion fixture. Все действия внутри новых миров идут обычным клавиатурным вводом, без инъекции прогресса/HP/целей. Это не доказательство fresh C01 → earned unlock. История всех завершённых неудачных прогонов сохранена в verification.

Загружен только [test-evidence ZIP](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43873344613/artifacts/14228767961), SHA256 `2930101cdd20efcf74b9a7b47fc2033a0669cee0b3b2c59d57ded2cd7fce2665`. Финальный game artifact не выпущен, потому что input gate красный. Остальная регрессия на момент записи ещё имела queued/in-progress jobs; общего PASS нет.

## Следующий конкретный шаг

Восстановить рабочую среду, получить свежий HEAD PR10 и открыть играбельный/debug runtime. Исправить точность input-driver и проверить реальное поведение: безопасный подход к ремонту SW01-C, спуск/позицию стрельбы YU01-C, затем весь путь 20+20 комнат, финалы, Retry/reload и сохраняемый результат. Не выдавать driver failure за доказанный дефект игры и не подменять реальный ввод debug unlock.

После этого продолжить production по brief: нажимаемые клавиши, бумажная/воздушная среда, пространственные фазы и encounters; весь 128-position art/animation/VFX manifest; stems/intensities, восемь stinger, SFX среды, editable masters/экспорты и listening evidence. Текущий процедурный draft/14 themes этот объём не закрывают.

M-RW4 после выхода RW3: пять испытаний с принятым контентом; полный утверждённый набор 50 локалей/RTL (сейчас готовы EN/RU); storage/update/rollback matrix; performance/совокупные вспышки/аудио; реальные устройства/каналы; один immutable RC preview.

Все шесть исходных M-RW3 ID — PARTIAL. 80 canonical IDs, 54 aliases и три RW3-ADD сохранены. Субъективная приёмка, human timing и физические телефоны — NOT RUN. Недостающие переводы не заменены копиями EN.

Production в этой задаче не менялся: справочная alpha.1 / `ffa3df5...`, build `cinder-v1.b1.a1`, site `f9f31a615ed05fc206a93eef24cb78d2fc67bb4c`. Публикация и одобрение RC не заявлены.
