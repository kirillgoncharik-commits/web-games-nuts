# M-RW2 · контрольная точка A1

Начат 15 ноября 2026 по прямому запросу Кирилла, на базе задания редакции 2. **IN_PROGRESS; A1 — часть спринта, не отдельный завершённый спринт.**

База B6: 38468184f63637f53b14d369c5b656e9ac36ed04. Все 80 требований, 31 владельца M-RW2 и 54 source aliases сохранены. Полный UX C01 принадлежит M-RW2; M-RW3 получает C02/C03. Инженерная история M-RW1 не обнуляется.

Runtime ba4cefd6eef70a3512de592d2e8c2e533fc6b52d; тестовый merge 4900fa73a2719c895794fa14129b01b086602f89; версия 0.7.0-rw2.a1. Что подключено и что осталось: sprint-2-release-notes.ru.md. Точные результаты/измерения: sprint-2-verification.json. Реестры: sprint-2-asset-inventory.json и sprint-2-effects-matrix.json. Частичная реализация 31 требований показана в rework-coverage.json и request-coverage.csv; финальная верификация требований остаётся OPEN.

Build/types/720 ключей/art/registry/105 моделей PASS. Presentation и визуальный просмотр пяти секторов + UI PASS в объёме A1. Полная регрессия 320/320 PASS, все 12 частей; шесть workflow / 43 jobs SUCCESS. Новый профиль, обе Foundry-ветки, альтернативные сборки, touch/save прошли на точном source. A1 ENGINEERING CHECKPOINT VERIFIED; это не закрытие всех 31 требований M-RW2. Не использовать старый зелёный B6 как доказательство этого кандидата.

Отдельное превью: draft nutsbid PR15; production B6 / main 46ee58b не меняется. Артефакт закреплённого runtime: qa/cinder-rw2-build-43718799326 / c60b7f46e789d0538e953f905951616bda867616; JS Git blob f5e5fdc3dc19708082f11cffa7ecf8f5e1bd046a сверен перед интеграцией. Предыдущие hashed assets сохранены.

Рабочая среда отключилась при открытии браузера. Локальный checkout cinder-shift-sprint-2 был синхронизирован с 254b542, последующие исправления сохранены через GitHub. При возвращении среды сначала fetch/сверка с PR9; не перезаписывать локальные различия и старые грязные checkout cinder-shift-release/rework. Откат: B6 / 38468184. Не переносить ранний A1 из локального checkout поверх нового remote HEAD.

Следующий конкретный шаг: продолжить блоки B/C/D текущего спринта — полный art/state/animation pass всех 44 комнат и финала, оставшийся UX, слышимые runtime-клипы, audio mixer lifecycle и финальная проверка всех 31 требований. Отдельного разрешения на внутренние контрольные точки не требуется. Human acceptance исключена из текущего gate; формальный общий M-REWORK ACCEPTED не объявлять.

Актуальное опубликованное превью: https://ab2511d6.nuts-games.pages.dev/games/cinder-shift/; site commit 06a0d29e91174f495ac19bc4ceb44a1e2eb0fecb. Cloudflare Pages и site CI SUCCESS.
