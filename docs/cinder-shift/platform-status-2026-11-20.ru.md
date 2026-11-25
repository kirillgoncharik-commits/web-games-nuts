# Cinder Shift 64 — статус релиза, 20 ноября 2026

Актуализация CrazyGames: 25.11.2026. Остальные данные и QA ниже — исторический снимок от 20.11.2026, не подтверждение нового source.

**В каталоге опубликована itch.io; Playgama опубликована в Sandbox и доступна по ссылке. Яндекс остаётся черновиком. Текущая заявка CrazyGames отклонена 25.11.2026; исторические статусы GamePix и Y8 — не поданы.**

| Канал | Подтверждено | Осталось |
|---|---|---|
| itch.io | alpha.12/source003ffa9. Гостевой Edge без входа: запуск, Splitter, 0 RP и модуль после reload, движение, пауза | Полное hosted-campaign/device QA и независимый человеческий полный плейтест |
| Playgama | [Sandbox опубликован](https://playgama.ai/play/megbga2qhvomjq). Basic Certification 100%; реальный QA-показ interstitial на Retry после поражения в Cargo, закрытие и перезапуск с 6/6 HP. По опубликованной ссылке проверены запуск, Splitter после reload, движение и P-пауза | Первичная проверка контента платформой; затем цели Sandbox за 30 дней: 100 qualifying plays, среднее время 5:00, 0.30 ad shows/play. Выход в каталог автоматический после выполнения целей; сейчас каталог не подтверждён |
| Яндекс / Playhop | Профиль approved. Черновик 655191, прежний ZIP da52cf9, EN/RU и медиа сохранены. SDK signed-in host smoke PASS | На странице регистрации: «Your profile is ready, but you can’t publish games yet» и «We’re not accepting applications from new partners right now». Договорная регистрация закрыта; ULM и монетизация Not connected. Submit disabled. Дополнительно остаётся native ad/guest/device QA |
| CrazyGames Basic | [Письмо 25.11.2026](https://mail.google.com/mail/u/0/#all/1a21303c6a479e40): текущая заявка отклонена по общему качеству игры. [Существующая карточка](https://developer.crazygames.com/games/0a5368c7-38ae-4fdd-a814-22d4bc485339). Конкретные дефекты и дедлайн не названы; submitted source/build/ZIP не установлены, прежний пакет в реестре — исторический инвентарь | Повторная подача не разрешена и не запрошена этим письмом. Сохранены gates: существенно улучшенная проверенная сборка и независимый человеческий полный плейтест; фактического плейтеста не подтверждено |
| GamePix | Последняя проверка кабинета 20 ноября 14:53 UTC требовала входа | Вход, SDK v3 и Player/storage QA |
| Y8 | Последняя проверка кабинета 20 ноября 14:53 UTC требовала входа | Вход, студия/App/Game IDs и SDK |

## Закрытые технические блокеры

- C02/SW03-B: контроллер маршрута учитывает 11 px половины тела, 7 px допуска остановки и 1 px зазора. Строгая проверка высоты <2 px сохранена; runtime геометрии и баланса не изменён.
- [Полный CI 44774926194](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44774926194) на source2e924ac завершился SUCCESS: runtime-checks, обе полные кампании C02/C03 (по 20 комнат / 5 миссий), web-артефакт. Повтор C03 job136445256317 PASS, 4.4 минуты. Прежняя отмена из-за холодной установки зависимостей закрыта успешным повтором.
- [Целевой CI 44774913080](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44774913080): 14 контрактных + 6 Playgama application + 3 Yandex + 21 itch = 44 PASS.
- Playgama использует OGG/MP3 с закреплённым происхождением и MIT notices; процедурные осцилляторы в этом профиле исключены. P управляет паузой, Escape остаётся браузеру.
- Host QA: Bridge save/reload, Splitter и 0 RP сохранены; Airlock пройден обычным вводом, все 6 комнат, 338.8 с, HP4/6. В Cargo обычным вводом получено поражение и выполнен Retry; QA Tool показал interstitial, после закрытия вернулись управление и полная целостность. Host mute покрыт CI; независимая запись звука не выполнялась. Rewarded Ads отсутствуют и в QA отмечены как отсутствующие.

## Точный опубликованный пакет Playgama

- Source: 2e924ac0dca6efb4404009f07fbb5eaa5af912d7.
- Build: verify.44774913080.a1.
- ZIP: Cinder-Shift-64-0.8.0-alpha.12-playgama.zip, 4 837 614 байт.
- SHA-256: 8d3bdd140fff29c5d23c85b55f31bd2d976baff7fe9dd815832cae9e46597514.
- [CI-артефакт](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44774913080/artifacts/14650291978).
- [Сохранённый ZIP](https://chatgpt.com/library?file_id=libfile_fde3_f-e334cc86eb548191817ae401d4d5ffae_ae3406e10eec8191933768799a79d180&account_id=personal).
- Карточка cmwnp7n8q0glam30hzpaccq90; build cmwp87dev0aefjx0i3a1xhpyc; public slug megbga2qhvomjq.
- Публикация подтверждена экраном Sandbox и запуском по Open game. Это отдельный этап от попадания в каталог.
- Партнёрская дистрибуция была выключена с исключениями до публикации; нового согласия на партнёрскую раздачу не выдавалось. Платные кампании и финансовые операции не запускались.

## Зависимость Яндекса

[Официальная документация](https://yandex.com/dev/games/doc/en/console/manage-account) разделяет профиль и договор: профиль позволяет создать черновик, договор открывает модерацию и выплаты. На текущем аккаунте договор не подключён, а экран Cooperation type прямо сообщает о приостановке новых заявок. Повторная загрузка архива этот блокер не снимает. Требуется возобновление приёма платформой; затем выбор контрагента и договорное оформление владельцем.

Ролик ранее воспроизводился (readyState4, error null, currentTime растёт). При последнем открытии черновика плеер снова показал Unable to play media; стабильность preview не подтверждена. Архив и ролик не заменялись. Сохраняется предупреждение о сбоях первичных публикаций.

## Релизные материалы

Общий Release Pack дополнен четвёртым target ZIP Playgama без пересборки игровых байтов, актуальным реестром, результатами QA и манифестом пакета. В кабинеты загружать только target ZIP. Сохранение модуля и управление по ссылке не подменяют независимый человеческий полный плейтест для CrazyGames.

## AG-19 — источник решения CrazyGames

Composite key: `gmail:1a21303c6a479e40:nuts:cinder-shift-crazygames-release-rejection`. Canonical Knowledge ID: `k-gmail-1a21303c6a479e40-nuts-cinder-shift-crazygames-release-rejection`, track_id=nuts (родитель Nuts Games; отдельного Cinder Shift project_id не найдено). Проверены Knowledge и первоисточник: получено 25.11.2026 15:02 CET. Реестр обновлён в существующей строке CrazyGames, без дубля, новой задачи, ответа или подачи. Это изменение факта платформы, не выпуск и не подтверждение host QA. История пакетов и возможность отката сохранены.
