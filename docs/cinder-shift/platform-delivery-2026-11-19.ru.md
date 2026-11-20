# Cinder Shift 64 — поставка на платформы

Актуальный статус от 2026-11-20T17:40:48.674Z. Игровая база alpha.12: 836a04fbc8dc1cdb0d8dbbcba1ec0fc5b64034a5.

Опубликованы [itch.io](https://nuts-bid.itch.io/cinder-shift-64) и [Playgama Sandbox](https://playgama.ai/play/megbga2qhvomjq). В публичном каталоге Playgama игра пока не подтверждена. Подробные ограничения, ID и следующие действия — в [актуальном статусе](platform-status-2026-11-20.ru.md) и [реестре](platform-release-register-2026-11-19.csv).

| Канал | Source / build | Состояние |
|---|---|---|
| itch.io | 003ffa91cec7f64b5b4c29c464c216bf5fd49865 / local.20261119T144350017Z | Карточка 5329386 опубликована; гостевой запуск, reload сохранения, движение и пауза PASS |
| CrazyGames Basic | 003ffa91cec7f64b5b4c29c464c216bf5fd49865 / local.20261119T144351772Z | ZIP и медиа готовы; необходим независимый start-to-finish плейтест |
| Яндекс / Playhop | da52cf96f25556162d5ee6ca1014bc54fd8d1a66 / verify.44679055806.a1 | Черновик 655191; договор не подключён, приём новых партнёров закрыт; подачи нет |
| Playgama | 2e924ac0dca6efb4404009f07fbb5eaa5af912d7 / verify.44774913080.a1 | Basic Certification 100%, реальный interstitial QA и опубликованный Sandbox PASS |
| GamePix | — | Требуются вход, SDK v3 и host QA |
| Y8 | — | Требуются вход, идентификаторы студии/игры, SDK и host QA |

## Проверенная сборка Playgama

В ZIP находятся Bridge SDK, записанные OGG/MP3 с полной лицензией, P-пауза и browser-owned Escape. SHA-256: 8d3bdd140fff29c5d23c85b55f31bd2d976baff7fe9dd815832cae9e46597514. Загруженные байты совпадают с целевым CI-артефактом; после QA игровой ZIP не пересобирался.

[Целевой CI](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44774913080) — 44 PASS. [Полный runtime/world-route CI](https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44774926194) — SUCCESS на том же source: обе дополнительные кампании пройдены обычным тестовым вводом, runtime-checks и artifact успешны.

На реальном QA-хосте подтверждены startup, Bridge save/reload, полный шестикомнатный Airlock и interstitial при Retry в Cargo. После рекламы попытка началась с 6/6 HP. На опубликованной Sandbox-ссылке подтверждены запуск, покупка Splitter, восстановление после reload, движение и P-пауза. Мьютирование через host API покрыто CI; независимой аудиозаписи не делали.

Кабинет показывает первые 24 часа проверки контента и цели на 30 дней: 100 qualifying plays, 5:00 среднего времени, 0.30 показа рекламы за игру. При достижении целей обещан автоматический переход в каталог. Партнёрская дистрибуция не включалась.

## Материалы и границы проверки

Master Release Pack содержит четыре отдельных ZIP, manifests/SHA256SUMS, EN/RU metadata, медиа и актуальные QA/status/register. Сам master ZIP не предназначен для игрового upload. Старые itch/CrazyGames/Yandex target ZIP сохранены без изменения байтов.

Медиа получены из alpha.12/source003ffa9: 11 скриншотов и 3 ролика, без page errors; capture-артефакт https://github.com/kirillgoncharik-commits/web-games-nuts/actions/runs/44563737969/artifacts/14551862388, SHA-256 126e6210ffb4246fb54c753fd878a1859ede6bf33e3d9409310ec94bf896fadb. Портретное видео — кроп десктопной записи, не мобильный тест. Медиа не выдаются за новую запись обновлённого аудио Playgama.

Волна остаётся development alpha: полная человеческая приёмка и физические устройства не подтверждены. Автотесты и AI-ввод не заменяют обязательный независимый плейтест CrazyGames. Основная разработка арта и следующих версий продолжается отдельно; экспериментальная C01-ветка в эту поставку не переносилась.
