# Соответствие Twelve-Factor App

Проект реализует все двенадцать факторов на уровне приложения и поддерживаемого
Docker Compose deployment.

| Фактор | Реализация в проекте |
| --- | --- |
| I. Codebase | Один Git-репозиторий; окружения являются deployment одной кодовой базы. |
| II. Dependencies | Зависимости явно объявлены в `package.json` и lock-файлах; images собираются через `npm ci`. |
| III. Config | Параметры и секреты поступают через environment. Frontend использует same-origin `/api/` и не содержит адрес окружения в bundle. |
| IV. Backing services | PostgreSQL подключается по `DATABASE_URL` и рассматривается как заменяемый внешний ресурс. |
| V. Build, release, run | Docker build не обращается к БД; `npm run release` изменяет схему/настройки; `npm start` только запускает API. Release и run используют один backend image. |
| VI. Processes | Backend stateless: сессии не хранятся в памяти, JWT передаётся клиентом, постоянные данные находятся в PostgreSQL. |
| VII. Port binding | Express слушает `PORT`; nginx и Compose маршрутизируют трафик к опубликованному порту. |
| VIII. Concurrency | Process model не использует фиксированные `container_name`; production backend не привязан к host port и допускает независимые replicas. |
| IX. Disposability | Backend быстро запускается после проверки backing service и корректно закрывает HTTP server и DB pool по `SIGTERM`/`SIGINT`. |
| X. Dev/prod parity | В обоих окружениях используются те же Dockerfiles, PostgreSQL 15, release-команда и runtime-команда; отличаются только env и публикация служебных портов. |
| XI. Logs | Приложение пишет события в stdout/stderr; контейнеры не используют локальные файлы как журнал. |
| XII. Admin processes | Release и seeder запускаются как одноразовые команды из того же backend image и с теми же dependencies/config. |

## Проверяемое разделение фаз

| Фаза | Команда | Разрешённые действия |
| --- | --- | --- |
| Build | `docker compose build` | Установка зависимостей, React build, создание images; без доступа к БД |
| Release | `docker compose run --rm --no-deps release` | Schema sync, точечное изменение схемы, начальные системные настройки |
| Run | `docker compose up -d --no-deps backend frontend nginx` | Обслуживание запросов; без административных действий при старте |

Compose также кодирует зависимость `backend -> release` с условием
`service_completed_successfully`, поэтому обычный запуск всего стека не может
запустить API раньше успешной release-фазы.

## Регрессионные гарантии

- `server/src/app.js` только создаёт Express application;
- `server/src/server.js` содержит runtime lifecycle и graceful shutdown;
- `server/src/release.js` — единственное место startup/release schema sync;
- `server/src/seeders/seedQuestions.js` не синхронизирует схему;
- `server/tests/release.test.js` проверяет идемпотентное изменение схемы и
  порядок release-операций;
- оба Compose-файла используют один backend image для `release` и `backend`.

Порядок production deployment и восстановления описан в
[DEPLOYMENT.md](DEPLOYMENT.md), фактическая топология — в
[ARCHITECTURE.md](ARCHITECTURE.md).
