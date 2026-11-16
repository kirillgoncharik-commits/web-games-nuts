# Финальный этап Cinder Shift — checkpoint 16.11.2026

**INCOMPLETE / NOT RC / NOT ACCEPTED.** Вход M-RW4 выявил незавершённый M-RW3. Выполнена следующая производственная итерация M-RW3; сравнительный M-COMPARE не запускался.

## Активная alpha.3 после проверенного среза

Source `0117a79a53e114e9246ad6114d2c603a436f8ae7`, tree `4666be1cbf90021864624cda913c174b0f674adc`, локальный эквивалент `eb77d1c`. SW02-A теперь содержит настоящие нажимаемые клавиши с физическим снижением соседней опоры и безопасным возвратом. Build/typecheck/i18n и 64 локальные модели PASS. На [CI 43901074700](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43901074700) прошли 86 runtime/input checks (включая клавиатуру и два touch-контакта Chromium) и полный C02; C03 ещё выполняется. После синхронизации source среда стала unavailable; новые screenshot/JSON evidence не просмотрены. [Подробный checkpoint](rw3-environment-production.ru.md).

Проверенный alpha.2 artifact ниже сохраняется как отдельный baseline. Alpha.3 не считается RC/принятой/опубликованной; полный производственный объём остаётся открытым.

## Точное состояние предыдущего проверенного среза

Ветка `codex/cinder-shift-final`, draft [PR10](https://github.com/kirillgoncharik-commits/web-games-nuts/pull/10), база — `codex/cinder-shift-m-rework` / PR9. Исходный remote `487b6757e60f1b7152e566503139d9cd425f57eb` перед началом сверён через compare: identical.

Последний полностью проверенный runtime source: `90170441b9742ce6a2f0dee5cf6a71e689b46935`. Точный отчёт — [sprint-4-verification.json](sprint-4-verification.json); каталог новых комнат — [new-world-runtime-registry.json](new-world-runtime-registry.json).

Первая поставка remote `1fba2c9f1452c457f0a4d5833b526215049b586f` совпадала с локальным `0d3f38a6772320c867482706bb3edf5c1f307722` по tree `6f7d31b5895c3eb1bc7314805e27359cfda23775`. Затем локальная среда отключилась. Последующие исправления сохранены через GitHub и проверялись своим CI. Среда исходников восстановлена: свежая локальная копия `cinder-shift-final-continue`, commit `37a2df9`, совпадает с remote runtime по tree `3f5572e3eb0f7b1d09274539237bcb25768e6b81`. Старая копия `cinder-shift-final` и её незакоммиченные документы сохранены; продолжать её без сверки нельзя.

## Продолжение и сообщение о турелях

Пользователь подтвердил сектор 2, E/F. Исправлены показ отключённой турели (знак отсутствия питания, без HP) и зависевшая от старого tutorial-флага подсказка E. На source `52e56d5` прошли пять проверок турелей и полный набор 54 encounter/UI/combat checks в каждом из Chromium/Firefox/WebKit — 162 PASS. В F выключенное состояние предусмотрено E01/Relay; E всегда получает питание. Неподвижная E пока не воспроизведена и остаётся открытой. [Точный отчёт](cargo-turrets-2026-11-16.md).

Новая проверка геометрии нашла SW02-D: турель пересекала укрытие и не стояла на полу. Размещение исправлено; модель сначала упала, после исправления все 44 action/placement/spawn models PASS. Ещё 58 legacy/turret models PASS; typecheck/i18n — 885 ключей.

Исторически полные маршруты на `52e56d5` были красными: C02 — смерть при небезопасном обходе к SW02-B; C03 дошёл до YU05-C (19-я комната), где driver прыгал под низким потолком вместо подъёма на полку. Последующие input-прогоны выявили неточности подхода к консолям и предметам; сохранены все failure-state. На source `b782ee2`, run `43891987840`, C02 впервые прошёл все 20 комнат/5 миссий, финал, факты и reload результата. C03 остался красным: player стоял на краю укрытия возле консоли x568. Current source `9017044` использует ближайшие консоли, проверенные позиции взаимодействия, запас времени для броска и боковой подход к предмету. На exact source `9017044`, [run 43893609588](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43893609588), оба полных маршрута теперь PASS: 20+20 комнат, по пять миссий, три SW-фрагмента/пять YU-передач, финалы и reload сохранённого результата. Пакеты 5 turret + 29 previous + 50 targeted PASS. Все четыре job выбранного gate завершились успешно; это не общий PASS всех workflow и не production acceptance.

Сохранён [immutable alpha.2 artifact](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43893609588/artifacts/14237839242), build `cinder-v1.b18.a1`, source `9017044`, clean. ZIP SHA256 `4cde336401862e73033695864f7ac23edc3bbb0de4100be9fc49c1b727ed9f76`; game tar SHA256 `695bffb81faad7268de94f0fb6a18eb68c5103c9d3cd141ee6145c67ab570f66`. Скачивание и checksum проверены. Это alpha-кандидат, не RC и не live deploy. Успешные body-only route attachments не сохранялись list reporter; proof — CI PASS и assertions. Добавлена явная запись JSON для будущих прогонов; этот export-only delta прошёл typecheck, игровые файлы не изменены.

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

Исторический exact-source [CI 43873344613](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43873344613):
- build/typecheck PASS;
- прежний RW3 pack: 29 PASS;
- новый targeted pack: 49 PASS, включая action models, placement checks, selector/notes/механику, обычные входы и recovery world save;
- полные C02/C03 input routes: **0 PASS / 2 FAIL**.

C02 останавливается в SW01-C: контакт выполнен, но driver пробует ремонт вне радиуса. C03 — в YU01-C: driver стреляет с верхней платформы в нижний уровень дрона. Эти факты не доказывают игровой softlock; полный пользовательский маршрут остаётся непроверенным. Нельзя закрывать его по моделям, удалить проверку ради зелёного CI или объявить обе кампании сданными.

Начальный unlock в новых тестах — явно обозначенная legacy C01 completion fixture. Все действия внутри новых миров идут обычным клавиатурным вводом, без инъекции прогресса/HP/целей. Это не доказательство fresh C01 → earned unlock. История всех завершённых неудачных прогонов сохранена в verification.

Загружен только [test-evidence ZIP](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/43873344613/artifacts/14228767961), SHA256 `2930101cdd20efcf74b9a7b47fc2033a0669cee0b3b2c59d57ded2cd7fce2665`. Финальный game artifact не выпущен, потому что input gate красный. Остальная регрессия на момент записи ещё имела queued/in-progress jobs; общего PASS нет.

## Следующий конкретный шаг

Сквозной keyboard gate на `9017044` закрыт. Продолжить production brief M-RW3: подробные комнатные механизмы, затем touch/Retry/build-варианты и earned fresh C01 unlock. Локальный HTTP/browser по-прежнему запрещён; человеческие и физические device-проверки остаются NOT RUN. Случай E не закрывать как исправленный без воспроизведения.

После этого продолжить production по brief: нажимаемые клавиши, бумажная/воздушная среда, пространственные фазы и encounters; весь 128-position art/animation/VFX manifest; stems/intensities, восемь stinger, SFX среды, editable masters/экспорты и listening evidence. Текущий процедурный draft/14 themes этот объём не закрывают.

M-RW4 после выхода RW3: пять испытаний с принятым контентом; полный утверждённый набор 50 локалей/RTL (сейчас готовы EN/RU); storage/update/rollback matrix; performance/совокупные вспышки/аудио; реальные устройства/каналы; один immutable RC preview.

Все шесть исходных M-RW3 ID — PARTIAL. 80 canonical IDs, 54 aliases и три RW3-ADD сохранены. Субъективная приёмка, human timing и физические телефоны — NOT RUN. Недостающие переводы не заменены копиями EN.

Production в этой задаче не менялся: справочная alpha.1 / `ffa3df5...`, build `cinder-v1.b1.a1`, site `f9f31a615ed05fc206a93eef24cb78d2fc67bb4c`. Публикация и одобрение RC не заявлены.
