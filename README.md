# Интерактивный конструктор образовательных тестов

[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

Дипломный fullstack-проект: веб-система для создания, публикации, прохождения и анализа образовательных тестов. Приложение поддерживает ролевую модель, конструктор вопросов, автоматическую проверку ответов, сохранение результатов, аналитику преподавателя, экспорт отчётов и Swagger-документацию API.

## Назначение проекта

Система решает задачу организации тестирования в учебной среде:

- студент проходит опубликованные тесты и видит историю своих попыток;
- преподаватель создаёт тесты, управляет вопросами, просматривает аналитику по своим тестам и экспортирует отчёты;
- администратор управляет пользователями, ролями, публикацией тестов и системными настройками.

## Основные возможности

- Регистрация и вход по JWT.
- Хеширование паролей через `bcryptjs`.
- Ролевая модель `student` / `teacher` / `admin`.
- Публичная регистрация создаёт только роль `student`.
- CRUD тестов для преподавателей и администраторов.
- CRUD вопросов внутри тестов.
- Типы вопросов:
  - один правильный ответ;
  - несколько правильных ответов;
  - сопоставление пар.
- Перемешивание вариантов на клиенте с нормализацией ответов перед отправкой.
- Таймер прохождения теста.
- Серверная проверка ответов без доверия к клиенту.
- Сохранение результата, процента выполнения и времени прохождения.
- Повтор ошибок по результату попытки.
- Профиль пользователя с историей прохождений.
- Краткая статистика результатов в разделе управления вопросами.
- Раздел аналитики преподавателя `/analytics`:
  - сводка по прохождениям, тестам и группам;
  - группировка результатов по студентам и по тестам;
  - количество правильных и неправильных ответов;
  - среднее время прохождения;
  - раскрываемые детали ответов по каждой попытке.
- Экспорт аналитики преподавателя:
  - PDF-отчёт с кириллицей, автоматическими переносами и пагинацией;
  - Excel-книга с компактным листом `Успеваемость` и отдельным листом `Ответы`.
- Админ-панель:
  - управление пользователями и ролями;
  - удаление пользователей;
  - модерация/публикация тестов;
  - системные настройки.
- Swagger UI и OpenAPI JSON для REST API.
- CI через GitHub Actions: тесты, fuzzing, smoke test контейнеров и публикация
  образов в Docker Hub; автоматического deployment на VPS нет.

## Стек технологий

### Frontend

- React 18
- Redux Toolkit
- React Router v6
- Axios
- CSS Modules
- pdfmake для PDF-отчётов с кириллицей
- SheetJS `xlsx` для Excel-экспорта
- Jest / React Testing Library
- Nginx для production-сборки SPA

### Backend

- Node.js 18
- Express
- Sequelize ORM
- PostgreSQL 15
- JWT
- bcryptjs
- express-validator
- swagger-ui-express
- Jest

### DevOps

- Docker
- Docker Compose
- Nginx reverse proxy
- GitHub Actions
- Docker Hub publishing

## Архитектура

Проект реализован как **контейнеризированный модульный монолит**, а не как
набор микросервисов: вся серверная бизнес-логика работает в одном процессе
Express и использует одну PostgreSQL.

```text
Browser
  |
  | HTTP :80
  v
edge nginx
  |-- /       -> frontend nginx :80 -> React SPA
  `-- /api/*  -> backend Express :5000 -> PostgreSQL :5432
```

В production наружу опубликован только edge nginx. TLS в текущей конфигурации
не настроен. Административные операции с БД выполняются отдельным одноразовым
`release`-процессом; runtime backend при старте схему и настройки не изменяет.

Полное описание компонентов, слоёв, потоков запросов, модели данных, startup-
последовательности и фактической границы CI/CD:

- [Архитектура системы](docs/ARCHITECTURE.md);
- [Deployment на Ubuntu/VPS](docs/DEPLOYMENT.md);
- [Соответствие Twelve-Factor App](docs/TWELVE_FACTOR.md).

В локальном Compose дополнительно доступны прямые порты:

- `http://localhost` - приложение через общий nginx reverse proxy;
- `http://localhost:3001` - frontend-контейнер напрямую;
- `http://localhost:5000` - backend напрямую;
- `localhost:5432` - PostgreSQL в dev compose.

## Структура проекта

```text
.
|-- .github/workflows/ci-cd.yml       # CI, Docker smoke test и публикация images
|-- docs/
|   |-- ARCHITECTURE.md               # Фактические компоненты, связи и runtime
|   |-- DEPLOYMENT.md                 # Build/release/run, backup и rollback
|   `-- TWELVE_FACTOR.md              # Проверяемое соответствие 12 факторам
|-- client/                           # React SPA
|   |-- Dockerfile                    # Production-сборка frontend через nginx
|   |-- nginx.conf                    # SPA fallback для React Router
|   |-- package.json
|   `-- src/
|-- server/                           # Express API
|   |-- Dockerfile
|   |-- init.sql
|   |-- package.json
|   |-- src/
|   |   |-- app.js                    # Express application без запуска/миграций
|   |   |-- server.js                 # Runtime lifecycle и graceful shutdown
|   |   |-- release.js                # Одноразовые schema/settings operations
|   |   |-- config/                   # database, swagger
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- seeders/
|   |   |-- services/
|   |   `-- utils/
|   `-- tests/
|-- nginx/nginx.conf                  # Reverse proxy config
|-- docker-compose.yml                # Dev Docker stack
|-- docker-compose.ubuntu.yml         # Production/VPS compose
|-- .env.example                      # Dev compose env example
|-- .env.ubuntu.example               # Production env example
|-- package.json                      # Общие команды тестов
`-- README.md
```

## Переменные окружения

### `.env.example`

Используется для локального Docker Compose.

```env
POSTGRES_DB=testdb
POSTGRES_USER=user
POSTGRES_PASSWORD=password
JWT_SECRET=change-me-in-production
NODE_ENV=development
```

### `server/.env.example`

Используется при локальном запуске backend без Docker.

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/testdb
JWT_SECRET=change-me-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

### `.env.ubuntu.example`

Используется для deployment/VPS.

```env
POSTGRES_DB=testdb
POSTGRES_USER=test_constructor
POSTGRES_PASSWORD=change-me-strong-postgres-password
JWT_SECRET=change-me-long-random-jwt-secret
JWT_EXPIRE=7d
NODE_ENV=production
```

Frontend обращается к относительному `/api/`, поэтому его image не зависит от
публичного адреса окружения.

## Быстрый запуск через Docker

1. Собрать и запустить весь стек:

```bash
docker compose up -d --build
```

Compose сначала запускает одноразовый `release` и создаёт backend только после
его успешного завершения. `docker compose ps -a` показывает результат release.

2. Создать демо-пользователей и демо-тесты:

```bash
docker compose exec -T backend npm run seed
```

3. Проверить состояние контейнеров:

```bash
docker compose ps
```

4. Проверить backend healthcheck:

```bash
curl http://localhost:5000/api/health
curl http://localhost/api/health
```

5. Открыть приложение:

```text
http://localhost
```

## Полезные Docker-команды

Пересобрать и поднять все сервисы:

```bash
docker compose up -d --build
```

Перезапустить только backend:

```bash
docker compose up -d --build backend
```

Перезапустить frontend и nginx:

```bash
docker compose up -d --build frontend nginx
```

Посмотреть логи backend:

```bash
docker compose logs backend --tail=120
```

Посмотреть логи frontend:

```bash
docker compose logs frontend --tail=120
```

Посмотреть логи nginx:

```bash
docker compose logs nginx --tail=120
```

Остановить контейнеры без удаления volume:

```bash
docker compose down
```

Остановить контейнеры и удалить volume с БД:

```bash
docker compose down -v
```

Проверить итоговую compose-конфигурацию:

```bash
docker compose config
```

## Локальный запуск без Docker

Нужен установленный PostgreSQL и база, указанная в `server/.env`.

1. Установить зависимости backend:

```bash
cd server
npm ci
```

2. Выполнить обязательную release-фазу:

```bash
npm run release
```

3. Запустить backend:

```bash
npm run dev
```

или production-режимом:

```bash
npm start
```

4. В отдельном терминале установить зависимости frontend:

```bash
cd client
npm ci
```

5. Запустить frontend:

```bash
npm start
```

6. При необходимости заполнить базу демо-данными:

```bash
cd server
npm run seed
```

## Тестовые учётные записи

После выполнения `npm run seed` создаются или обновляются:

| Роль | Email | Пароль |
| --- | --- | --- |
| Admin | `admin@test.ru` | `admin123` |
| Teacher | `teacher@test.ru` | `teacher123` |
| Student | `student@test.ru` | `student123` |

## Роли и права доступа

| Роль | Возможности |
| --- | --- |
| `student` | Проходит опубликованные тесты, сохраняет результаты, смотрит профиль и историю попыток, повторяет ошибки. |
| `teacher` | Всё, что доступно студенту, плюс создание и редактирование своих тестов, управление вопросами, просмотр статистики, аналитика прохождений и экспорт отчётов. |
| `admin` | Полный доступ к администрированию: управление пользователями, ролями, всеми тестами, модерацией и системными настройками. |

В админ-панели у администратора есть GUI для изменения роли пользователей. Самому себе администратор роль через интерфейс не меняет, чтобы случайно не потерять доступ.

## Swagger / OpenAPI

Swagger UI доступен после запуска backend:

```text
http://localhost:5000/api/docs
```

Через nginx proxy:

```text
http://localhost/api/docs
```

OpenAPI JSON:

```text
http://localhost:5000/api/docs.json
http://localhost/api/docs.json
```

В Swagger описаны основные группы API:

- `Health` - проверка доступности API;
- `Auth` - регистрация, вход, профиль;
- `Tests` - список, создание, обновление, удаление и прохождение тестов;
- `Questions` - управление вопросами;
- `Results` - результаты, ошибки, статистика;
- `Admin` - пользователи, роли, модерация тестов, настройки.

Для защищённых endpoint'ов используется JWT Bearer token. В Swagger UI можно нажать `Authorize` и вставить сам JWT-токен без префикса `Bearer`.

В обычных HTTP-запросах заголовок должен иметь формат `Authorization: Bearer <token>`.

## Основные API endpoint'ы

### Auth

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

### Tests

```text
GET    /api/tests
GET    /api/tests/manage
GET    /api/tests/:id
GET    /api/tests/:id/questions
GET    /api/tests/:id/questions/manage
POST   /api/tests
PUT    /api/tests/:id
DELETE /api/tests/:id
POST   /api/tests/:id/submit
```

### Questions

```text
POST   /api/tests/:id/questions
PUT    /api/tests/:id/questions/:questionId
DELETE /api/tests/:id/questions/:questionId
```

### Results

```text
POST /api/results
GET  /api/results/my
GET  /api/results/teacher/performance
GET  /api/results/:id/mistakes
GET  /api/results/test/:testId/stats
```

### Admin

```text
GET    /api/admin/users
PATCH  /api/admin/users/:id/role
DELETE /api/admin/users/:id
GET    /api/admin/tests
PATCH  /api/admin/tests/:id/moderation
GET    /api/admin/settings
PATCH  /api/admin/settings
```

## Статистика результатов

В разделе управления вопросами преподаватель и администратор видят краткую статистику по выбранному тесту:

- количество попыток;
- средний балл;
- список сохранённых результатов.

## Аналитика преподавателя

Раздел `/analytics` доступен пользователю с ролью `teacher`. Он собирает результаты только по тестам, созданным текущим преподавателем.

В интерфейсе доступны:

- общая сводка по количеству прохождений, тестов и групп;
- переключение группировки `По студентам` / `По тестам`;
- таблица попыток с датой, длительностью, количеством правильных и неправильных ответов и итоговым процентом;
- раскрываемые детали ответов студента, включая правильный ответ;
- экспорт отчёта в PDF и Excel.

PDF-экспорт формируется через `pdfmake` и использует шрифт Roboto из virtual file system, поэтому кириллица отображается корректно. Длинные ответы автоматически переносятся, страницы добавляются генератором PDF.

Excel-экспорт формируется через `xlsx` и содержит два листа:

| Лист | Содержимое |
| --- | --- |
| `Успеваемость` | Компактная аналитическая таблица: студент, email, тест, количество правильных/неправильных ответов, всего вопросов, процент, время и дата. |
| `Ответы` | Детализация по вопросам: вопрос, статус, ответ студента и верный ответ. |

Для ответов типа "сопоставление пар" в отчётах используется обычный текстовый разделитель `->`, чтобы PDF и Excel не зависели от поддержки специальных Unicode-символов в просмотрщиках.

## Команды проекта

### Корневые команды

Запустить все frontend и backend тесты:

```bash
npm test
```

Запустить только frontend тесты:

```bash
npm run test:client
```

Запустить только backend тесты:

```bash
npm run test:server
```

Собрать coverage по всему проекту:

```bash
npm run coverage
```

Coverage только frontend:

```bash
npm run coverage:client
```

Coverage только backend:

```bash
npm run coverage:server
```

Frontend-покрытие настроено с порогом 100% по statements, branches, functions и lines в `client/package.json`. Если добавляются новые компоненты, страницы или helper-функции, для них нужно добавлять тесты сразу с учётом этих порогов.

### Frontend команды

```bash
cd client
```

Установка зависимостей:

```bash
npm install
```

Детерминированная установка по lockfile:

```bash
npm ci
```

Dev server:

```bash
npm start
```

Тесты:

```bash
npm test -- --watchAll=false --runInBand
```

Coverage:

```bash
npm run coverage
```

Production build:

```bash
npm run build
```

### Backend команды

```bash
cd server
```

Установка зависимостей:

```bash
npm install
```

Детерминированная установка по lockfile:

```bash
npm ci
```

Dev server с `nodemon`:

```bash
npm run dev
```

Production server:

```bash
npm start
```

Seed демо-данных:

```bash
npm run seed
```

Тесты:

```bash
npm test
```

Coverage:

```bash
npm run coverage
```

## Тестирование

Проект покрыт двумя уровнями автоматических проверок:

- frontend unit/component tests через Jest и React Testing Library;
- backend unit tests для ролей, middleware, grading, системных настроек и Swagger-конфига.
- frontend coverage должен оставаться 100% по всем метрикам.

Полная проверка перед сдачей:

```bash
npm test
npm run coverage:client
npm run fuzz:ci
cd client
npm run build
cd ..
docker compose config
docker compose up -d --build
curl http://localhost/api/health
```

Ожидаемый результат:

- все Jest suites проходят;
- fuzzing выполняет 20 000 мутаций без crash/timeout;
- frontend production build компилируется;
- Docker Compose config валиден;
- одноразовый `release` завершается с кодом `0`;
- контейнеры `postgres`, `backend`, `frontend`, `nginx` находятся в состоянии `Up`;
- `/api/health` возвращает `status: OK`.

## Coverage-guided fuzzing

Для backend настроен Jazzer.js 4 — in-process coverage-guided fuzzer на базе
libFuzzer. Fuzz target инструментирует реальную логику оценивания в
`server/src/utils/grading.js`; движок мутирует входы с учётом достигнутого
покрытия и сохраняет полезные входы в `server/tests/fuzzing/corpus/grading/`.

```bash
npm ci --prefix server/tests/fuzzing
npm run fuzz          # локальный поиск в течение 60 секунд
npm run fuzz:ci       # воспроизводимые 20 000 итераций, как в CI
npm run fuzz:coverage # покрытие сохранённого corpus
```

При падении минимизированный вход сохраняется в
`server/tests/fuzzing/artifacts/`. Fuzz target проверяет границы оценки,
согласованность неправильных ответов, типы нормализованных значений,
сортировку, отсутствие дубликатов и идемпотентность нормализации. Подробное
описание corpus, инвариантов и воспроизведения ошибок находится в
`server/tests/fuzzing/README.md`.

Прежний перебор фиксированных SQLi/XSS/RBAC payload является набором негативных
security API checks, а не фаззингом. Он сохранён отдельной командой (требует
запущенный backend):

```bash
npm run security:api
```

## CI и публикация образов

Workflow находится в:

```text
.github/workflows/ci-cd.yml
```

Несмотря на имя файла, workflow не выполняет deployment на VPS. Его граница —
проверки и публикация images в Docker Hub; release на сервер выполняется
вручную по [deployment-инструкции](docs/DEPLOYMENT.md).

Запускается при:

- `push` в `main` или `master`;
- `pull_request` в `main` или `master`;
- ручном запуске через `workflow_dispatch`.

Pipeline состоит из четырёх job'ов:

1. `tests`
   - checkout репозитория;
   - setup Node.js 18;
   - `npm ci --prefix client`;
   - `npm ci --prefix server`;
   - `npm test`.

2. `fuzzing`
   - setup Node.js 22;
   - `npm ci --prefix server/tests/fuzzing`;
   - coverage-guided fuzzing: 20 000 мутаций с фиксированным seed;
   - публикация минимизированного crash input как CI artifact при ошибке.

3. `containers`
   - запускается только после успешных `tests` и `fuzzing`;
   - `docker compose up -d --build`;
   - проверка успешного одноразового `release`-процесса;
   - ожидание backend healthcheck;
   - ожидание frontend;
   - ожидание nginx proxy;
   - вывод `docker compose ps`;
   - вывод логов при ошибке;
   - `docker compose down -v`.

4. `dockerhub`
   - выполняется не для pull request;
   - логинится в Docker Hub;
   - собирает и публикует backend/frontend образы.

### Secrets для Docker Hub

В настройках GitHub repository нужно добавить secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

Публикуемые образы:

```text
DOCKERHUB_USERNAME/test-constructor-backend:latest
DOCKERHUB_USERNAME/test-constructor-backend:<commit-sha>
DOCKERHUB_USERNAME/test-constructor-frontend:latest
DOCKERHUB_USERNAME/test-constructor-frontend:<commit-sha>
```

## Production / Ubuntu Server

Поддерживаемый текущей конфигурацией сценарий — ручная сборка на VPS из
конкретной Git-ревизии:

```text
docker-compose.ubuntu.yml
.env.ubuntu
```

Краткий первичный запуск:

```bash
cp .env.ubuntu.example .env.ubuntu
# заменить шаблонные пароли и JWT secret
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml config -q
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml build --pull
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d postgres
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml run --rm --no-deps release
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d --no-deps backend frontend nginx
```

Проверка:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml ps
curl --fail http://your-domain-or-ip/api/health
```

Production Compose не использует опубликованные Docker Hub images и GitHub
Actions не выполняет автоматический deploy на VPS. Seeder создаёт учётные
записи с известными демо-паролями и не должен считаться обязательным production
шагом. Полная инструкция с readiness-проверками, backup, обновлением, rollback,
ограничениями TLS и bootstrap администратора находится в
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## База данных

Основные таблицы:

| Таблица | Назначение |
| --- | --- |
| `users` | Пользователи, email, hash пароля, роль. |
| `tests` | Тесты, описание, автор, статус публикации, лимит вопросов. |
| `questions` | Вопросы, тип, варианты, пары сопоставления, правильный ответ. |
| `test_results` | Результаты прохождений, score, ответы, время прохождения. |
| `system_settings` | Настройки платформы. |

Синхронизация моделей, проверка `durationSeconds` и начальные системные настройки
выполняются только командой `npm run release`. Обычный старт backend не изменяет
схему БД.

## Безопасность и валидация

- Пароли не хранятся в открытом виде.
- JWT передаётся через `Authorization: Bearer <token>`.
- Middleware `auth` проверяет пользователя по токену.
- Middleware `role` ограничивает доступ по ролям.
- `express-validator` проверяет входные параметры и тело запросов.
- Студент не может создавать или редактировать тесты.
- Преподаватель может управлять только своими тестами.
- Администратор имеет полный доступ.
- Последнего администратора нельзя лишить роли администратора через API.

## Проверка работоспособности

Healthcheck backend:

```bash
curl http://localhost:5000/api/health
```

Healthcheck через nginx:

```bash
curl http://localhost/api/health
```

Swagger JSON:

```bash
curl http://localhost:5000/api/docs.json
```

Проверка Docker-контейнеров:

```bash
docker compose ps
```
