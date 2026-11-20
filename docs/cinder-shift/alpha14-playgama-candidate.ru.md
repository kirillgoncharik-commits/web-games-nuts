# Alpha.14 — кандидат переноса в Playgama Bridge

20 ноября 2026. Base Playgama 3b29bd43fdd38b9f0d7d0f82789819d1b7396632, продукт 82c49240ae5080c334928afe63e0074ca23d33f0, Yandex-кандидат ca3f480ef9d1f1f2ad4e52c553f638345c7d660a.

Сохранены Bridge bootstrap/язык, SDK audio/pause, interstitial границы и active-world в SDK envelope. Новый продуктовый UI, радио, счётчики и backup/quarantine используют BridgeRecordStorage.updateMany. Прямой localStorage и IndexedDB не являются запасным вариантом при ошибке SDK.

В семь проверок actual app входят прежние четыре Bridge lifecycle случая и новые три: выстрелы/backup/reload, остановка обоих часов на host pause, quota/retry без native fallback. Управляемый SDK mock запрещает все прямые вызовы Storage.getItem/setItem и indexedDB.open и сохраняет список нарушений. Добавлен второй job в alpha14 SDK workflow; Yandex-набор остаётся отдельным. На момент подготовки результаты CI нового source ещё ожидаются.

Релизные ветки, существующие кабинеты и опубликованные пакеты не заменяются. Настоящий Bridge preview/host QA, облачная синхронизация разных устройств, upgrade/rollback опубликованных runtime, телефоны и полный RC остаются открытыми. Web Locks согласует вкладки только одного origin.
