# Архитектура системы

Документ описывает фактическую реализацию из `client/`, `server/`, nginx- и
Docker Compose-конфигураций.

## Архитектурный стиль и границы

Проект является контейнеризированным модульным монолитом. Вся серверная
бизнес-логика выполняется одним Express-приложением и использует одну
PostgreSQL. Контейнеры являются единицами сборки и запуска, но не превращают
модули приложения в микросервисы.

| Компонент | Реализация | Ответственность | Состояние |
| --- | --- | --- | --- |
| Браузерный клиент | React, Router, Redux Toolkit, Axios | UI, маршрутизация, API-вызовы | JWT в `localStorage` |
| Frontend | nginx + статическая React-сборка | Раздача SPA и проксирование `/api/` при прямом доступе | Stateless |
| Edge proxy | nginx | `/` → frontend, `/api/` → backend | Stateless |
| Backend runtime | Node.js/Express | REST API, JWT/RBAC, оценивание, CRUD, аналитика | Stateless, работает с PostgreSQL |
| Release process | тот же backend image, `npm run release` | Создание/синхронизация схемы и начальных настроек | Одноразовый административный процесс |
| Database | PostgreSQL 15 | Постоянные данные | Named volume `postgres_data` |

## Топология runtime

```text
Browser
  |
  | HTTP :80
  v
edge nginx
  |-- /          ---> frontend:80 (nginx + React build)
  `-- /api/*     ---> backend:5000 (Express)
                              |
                              v
                         postgres:5432
```

Перед запуском runtime выполняется отдельная release-фаза:

```text
backend image -- npm run release --> PostgreSQL schema/settings --> exit 0
backend image -- npm start --------------------------------------> listen :5000
```

Release и runtime запускаются из одного backend image. В production наружу
публикуется только edge nginx. TLS в репозитории не настроен: HTTPS должен
завершаться внешним proxy/load balancer либо требует отдельной конфигурации.

## Маршрутизация запроса

1. Браузер получает React-сборку через nginx.
2. Axios отправляет относительные запросы `/api/...` на тот же origin.
3. Axios добавляет JWT из `localStorage` в `Authorization: Bearer ...`.
4. nginx передаёт запрос процессу Express без изменения `/api/`.
5. Express применяет validation/auth/role middleware и вызывает controller.
6. Controller использует services/models и возвращает JSON.

Frontend artifact не содержит адрес окружения и одинаков для development,
staging и production. Для запуска React dev server в `client/package.json`
задан локальный proxy на `http://localhost:5000`.

## Внутреннее устройство backend

```text
routes -> middleware -> controllers -> services/utils/models -> PostgreSQL
```

| Слой | Фактическая роль |
| --- | --- |
| `routes/` | URL, HTTP-методы, validation, auth/RBAC composition |
| `middleware/` | JWT, роли и обработка результатов validation |
| `controllers/` | Auth, tests/questions, results/analytics, admin |
| `services/` | Системные настройки |
| `utils/grading.js` | Нормализация и проверка ответов |
| `models/` | Sequelize-модели и связи |
| `config/swagger.js` | OpenAPI, `/api/docs`, `/api/docs.json` |

API сгруппирован под `/api/auth`, `/api/tests`, `/api/results` и `/api/admin`.
Отдельных runtime-процессов для auth, grading, admin или analytics нет.

`src/app.js` только собирает Express application. `src/server.js` проверяет
доступность PostgreSQL, начинает слушать `PORT` и обрабатывает `SIGTERM` и
`SIGINT`. Он не синхронизирует и не изменяет схему, не создаёт настройки и не
заполняет данные.

## Release-фаза

`src/release.js` является обязательным одноразовым административным процессом:

1. проверяет подключение к PostgreSQL;
2. выполняет `sequelize.sync()` для создания отсутствующих таблиц;
3. идемпотентно добавляет `test_results.durationSeconds`, если колонки нет;
4. идемпотентно создаёт отсутствующие системные настройки;
5. завершается с кодом `0` и закрывает соединение с БД.

Compose допускает запуск `backend` только после успешного завершения `release`.
Seeder также является одноразовой admin-командой и больше не выполняет schema
sync. Он запускается только после release-фазы.

## Модель данных

```text
users 1 --- * tests
users 1 --- * test_results
tests 1 --- * questions
tests 1 --- * test_results

system_settings (самостоятельная key/value-таблица)
```

Основные таблицы: `users`, `tests`, `questions`, `test_results` и
`system_settings`. Постоянные данные существуют только в PostgreSQL; backend и
nginx не используют локальную файловую систему как хранилище состояния.

## Конфигурация

| Переменная | Когда применяется | Компонент |
| --- | --- | --- |
| `DATABASE_URL` | runtime/release, составляется Compose | backend |
| `JWT_SECRET`, `JWT_EXPIRE` | runtime | backend |
| `NODE_ENV`, `PORT` | runtime | backend |
| `POSTGRES_*` | initialization/runtime | PostgreSQL |
| `APP_VERSION` | build/release identification, необязательно | Compose image tag |

Конфигурация frontend не вшивается в bundle: API доступен по относительному
same-origin пути. Секреты передаются через env-файл и не входят в image.

## Отличия Compose-конфигураций

| Свойство | `docker-compose.yml` | `docker-compose.ubuntu.yml` |
| --- | --- | --- |
| Назначение | локальная разработка и smoke test | ручной VPS deployment |
| PostgreSQL | опубликован `5432` | наружу не опубликован |
| Backend | опубликован `5000` | только внутренний `5000` |
| Frontend | опубликован `3001` | только внутренний `80` |
| Edge nginx | опубликован `80` | опубликован `80` |
| Restart policy | стандартная Compose | `unless-stopped` для runtime |
| Release | одноразовый процесс того же backend image | то же поведение |

Имена контейнеров не закреплены через `container_name`, поэтому экземпляры
runtime-процессов могут создаваться оркестратором независимо.

## CI/CD и эксплуатационная граница

GitHub Actions выполняет тесты, coverage-guided fuzzing, Compose smoke test и
публикует backend/frontend images в Docker Hub. Workflow не подключается к VPS.
Production Compose содержит `build:`, поэтому поддерживаемый deployment —
ручная сборка конкретной Git-ревизии на сервере.

В проекте отсутствуют автоматический VPS deploy, TLS/certificate management,
очереди, централизованный сбор логов и автоматический backup. Они не являются
скрытыми компонентами архитектуры.

См. также:

- [Соответствие методологии Twelve-Factor App](TWELVE_FACTOR.md);
- [Deployment на Ubuntu/VPS](DEPLOYMENT.md).
