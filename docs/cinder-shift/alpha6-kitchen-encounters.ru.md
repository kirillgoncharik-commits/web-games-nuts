# Alpha.6 - кухня, док и маяк

18.11.2026. Продолжение M-RW3 по комнатной постановке 10_All_Rooms_Deep_Design_RU.txt. База remote `f0d28e33b7b0d73c23427f40a642c0a6670d6dfd`; alpha.5 опубликована и сохраняется точкой отката. Общий статус INCOMPLETE / NOT RC.

## Реализовано

- SW01-A: исходный contact ID открывает физическую заслонку ящика. Закрытая заслонка имеет collider; после открытия геометрия и изображение согласованы. Новая попытка возвращает исходное состояние. Дополнительной награды и новой кнопки нет.
- SW01-B: предупреждение и высокий паровой выброс. Нижний отмеченный карман защищает присевшую Миру; укрывать нужно часть тела внутри струи. Стоящий герой и верхняя линия требуют чтения цикла. Первый вход находится вне зоны поражения.
- SW01-D: три исходных контакта дока. Каждый требует своего warning/scan/open цикла и имеет своё физическое укрытие. Перед закрытием панели окно броска заканчивается с запасом полного полёта. Завершение контакта меняет ситуацию и не добавляет HP бытовому прибору.
- SW05-D: три фазы финального маяка, смена направления второго скана и положения укрытий. Используются прежние перенос/бросок и terminal confirm. Три canonical contact IDs и ledger сохранены.
- Новое укрытие не появляется внутри тела; старое не удаляется из-под стоящего героя. До безопасной смены геометрии скан не запускается. Пауза использует simulation clock, Retry сбрасывает временное состояние. Предупреждение, луч, панель и физическое укрытие используют одну фазу; статические сигналы сохраняются при reduced motion.
- EN/RU подсказки, фазы HUD, причины поражения и release notes обновлены. Save schema, фрагменты, currencies и награды не менялись. Полный production art/audio pack не заявлен.

## Локальные проверки

Build/typecheck, 895 EN/RU ключей, art/source/animation contracts PASS. 152 регрессионные модели PASS. Целевой набор room registry/action/encounter models - 50 PASS; это перекрывающийся набор, повторные тесты не суммируются.

Обычный ввод: сценарии заслонки, парового кармана и обоих трёхфазных финалов с паузой, сканом за укрытием, бросками и открытием выхода прошли Chromium gate на exact source alpha.6. Полный route driver не изменён.

## Проверенная сборка

Source `20b908046e1266fc12a1ebb03ce206608dc96980`, tree `c9ecca1a1d400f7ae7964d79678d7b7245d61099`, build `cinder-v1.b31.a1`, source_dirty=false. [PR10](https://github.com/kirillgoncharik-commits/web-games-nuts/pull/10), [точная ведомость](alpha6-verification.json).

[Selected CI 44288900099](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44288900099): все четыре job SUCCESS. 128 проверок PASS: 16 cargo/environment input, 27 environment models, 6 menu RU/EN, 29 прежних RW3 и 50 world models/UI. Оба полных C02/C03 маршрута прошли по 20 комнат/5 миссий, финальные факты и reload результата. Они стартуют с явно обозначенного legacy C01 unlock fixture; отдельное доказательство свежего earned unlock остаётся открытым.

[Cross-browser CI 44288899858](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44288899858): models 136 PASS, Chromium 71 PASS, Firefox и WebKit по 70 PASS + 1 SKIP. Пропуск относится к прежнему Chromium CDP touch-сценарию и не заменяет физические телефоны. Merge source `913dbc5` сравнён с runtime: files=[]. Это регрессия существующих encounters/equipment/UI; четыре новых environment input случая проверены selected Chromium gate.

[Immutable artifact 14421726063](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44288900099/artifacts/14421726063) скачан. ZIP SHA-256 `a4e8d1b39453e4afaa780a087e465c0027112fa86dc9752293545d8bd41ed6d0`, tar `0ceeba0f003bab1accbedbb6e3d19d82575a18375a492708b013da1df6b1410e`. Сверены manifest, source/build и все 71 файл. Runtime evidence ZIP также проверен по SHA-256. Просмотрены шесть кадров заслонки, пара, обоих сканов дока, обратного скана маяка и его открытой панели; это статический просмотр, не формальная art/audio/timing приёмка.

Presentation, runtime media, combat flow, reachable build curve и full routes/saves workflow также SUCCESS. Общий regression workflow ещё выполнялся при снимке статусов; job 134748829204 уже подтвердил восемь прежних ошибок mobile button height 44 вместо 48 px. Общий PASS всех workflow не заявлен, проверки не ослаблялись.

## Проверка первого source и последующее исправление

Source d4fe1c8: selected runtime gate 127 PASS; полный C02 20 комнат/5 миссий, финал и reload PASS. C03 дошёл до YU03-C и остановился: нажатие у рубильника x556.57 попало в радиус ремонта x584 и починило героя вместо смены контура. Исправлен выбор ближайшего доступного repair/switch; добавлена модель для YU02-C/YU03-C. Оба полных маршрута прошли после исправления. Route driver и assertions не изменены.

Повтор source 4afbae6: оба полных C02/C03 PASS. Новая проверка пара выявила урон на входной границе кармана: вся фигура ещё не внутри shelter, хотя её часть в plume уже укрыта. Исправлен расчёт пересечения hazard/body; сухая часть тела вне струи не требует shelter. Добавлены проверки обоих краёв и выступающей над укрытием головы. Assertions реального ввода сохранены; текущий source прошёл весь selected gate и оба маршрута.

## Остаток

Все шесть исходных M-RW3 IDs остаются PARTIAL. Далее - подробные ситуации остальных комнат, особенно C03, затем production art/animation/VFX/audio и M-RW4. Fresh C01 earned unlock, физические телефоны и human timing остаются отдельными проверками. Cargo E inactivity unreproduced/open; мобильные кнопки 44/48 px - открытый UI gate. M-COMPARE остаётся после RW4.

Alpha.6 не опубликована. Последний production - alpha.5 / cinder-v1.b28.a1.
