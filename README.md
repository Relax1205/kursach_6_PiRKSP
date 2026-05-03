# Интерактивный конструктор образовательных тестов

[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

Дипломный fullstack-проект: веб-система для создания, публикации, прохождения и анализа образовательных тестов. Приложение поддерживает ролевую модель, конструктор вопросов, автоматическую проверку ответов, сохранение результатов и Swagger-документацию API.

## Назначение проекта

Система решает задачу организации тестирования в учебной среде:

- студент проходит опубликованные тесты и видит историю своих попыток;
- преподаватель создаёт тесты, управляет вопросами и просматривает результаты;
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
- Админ-панель:
  - управление пользователями и ролями;
  - удаление пользователей;
  - модерация/публикация тестов;
  - системные настройки.
- Swagger UI и OpenAPI JSON для REST API.
- CI/CD через GitHub Actions: тесты, сборка/запуск контейнеров, push образов в Docker Hub.

## Стек технологий

### Frontend

- React 18
- Redux Toolkit
- React Router v6
- Axios
- CSS Modules
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

```text
Browser
  |
  | HTTP
  v
Nginx reverse proxy :80
  |-- /       -> frontend nginx container :80
  `-- /api/*  -> backend Express container :5000
                 |
                 v
              PostgreSQL :5432
```

Локально также доступны прямые порты:

- `http://localhost` - приложение через общий nginx reverse proxy;
- `http://localhost:3001` - frontend-контейнер напрямую;
- `http://localhost:5000` - backend напрямую;
- `localhost:5432` - PostgreSQL в dev compose.

## Структура проекта

```text
.
|-- .github/workflows/ci-cd.yml       # CI/CD: тесты, Docker smoke test, Docker Hub push
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
REACT_APP_API_URL=http://localhost:5000
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
REACT_APP_API_URL=http://YOUR_SERVER_IP_OR_DOMAIN
```

## Быстрый запуск через Docker

1. Собрать и запустить весь стек:

```bash
docker compose -d --build
```

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
npm install
```

2. Запустить backend:

```bash
npm run dev
```

или production-режимом:

```bash
npm start
```

3. В отдельном терминале установить зависимости frontend:

```bash
cd client
npm install
```

4. Запустить frontend:

```bash
npm start
```

5. При необходимости заполнить базу демо-данными:

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
| `teacher` | Всё, что доступно студенту, плюс создание и редактирование своих тестов, управление вопросами, просмотр статистики и экспорт отчётов. |
| `admin` | Полный доступ: управление пользователями, ролями, всеми тестами, модерацией, настройками и аналитикой. |

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

Полная проверка перед сдачей:

```bash
npm test
cd client
npm run build
cd ..
docker compose  config
docker compose  up -d --build
curl http://localhost/api/health
```

Ожидаемый результат:

- все Jest suites проходят;
- frontend production build компилируется;
- Docker Compose config валиден;
- контейнеры `postgres`, `backend`, `frontend`, `nginx` находятся в состоянии `Up`;
- `/api/health` возвращает `status: OK`.

## Fuzzing API

В проекте есть отдельный fuzzing-набор для API.

```bash
cd server/tests/fuzzing
npm install
npm test
```

Fuzzing проверяет:

- SQL injection;
- XSS payloads;
- authentication bypass;
- RBAC;
- path traversal;
- command injection;
- большие payloads;
- null byte payloads.

JSON-отчёты сохраняются в:

```text
server/tests/fuzzing/results/
```

## CI/CD

Workflow находится в:

```text
.github/workflows/ci-cd.yml
```

Запускается при:

- `push` в `main` или `master`;
- `pull_request` в `main` или `master`;
- ручном запуске через `workflow_dispatch`.

Pipeline состоит из трёх job'ов:

1. `tests`
   - checkout репозитория;
   - setup Node.js 18;
   - `npm ci --prefix client`;
   - `npm ci --prefix server`;
   - `npm test`.

2. `containers`
   - `docker compose  up -d --build`;
   - ожидание backend healthcheck;
   - ожидание frontend;
   - ожидание nginx proxy;
   - вывод `docker compose ps`;
   - вывод логов при ошибке;
   - `docker compose down -v`.

3. `dockerhub`
   - выполняется не для pull request;
   - логинится в Docker Hub;
   - собирает и публикует backend/frontend образы.

### Secrets и variables для Docker Hub

В настройках GitHub repository нужно добавить secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

Опционально можно добавить repository variable:

```text
REACT_APP_API_URL
```

Если `REACT_APP_API_URL` не задан, frontend image в CI собирается со значением:

```text
http://localhost:5000
```

Публикуемые образы:

```text
DOCKERHUB_USERNAME/test-constructor-backend:latest
DOCKERHUB_USERNAME/test-constructor-backend:<commit-sha>
DOCKERHUB_USERNAME/test-constructor-frontend:latest
DOCKERHUB_USERNAME/test-constructor-frontend:<commit-sha>
```

## Production / Ubuntu Server

Для VPS используется:

```text
docker-compose.ubuntu.yml
.env.ubuntu
```

Особенности production compose:

- PostgreSQL не публикуется наружу;
- backend не публикуется наружу напрямую;
- наружу открыт только nginx на `80`;
- сервисы имеют `restart: unless-stopped`;
- `NODE_ENV=production`.

Запуск:

```bash
cp .env.ubuntu.example .env.ubuntu
```

Отредактировать `.env.ubuntu`:

```env
POSTGRES_PASSWORD=strong-password
JWT_SECRET=long-random-secret
REACT_APP_API_URL=http://your-domain-or-ip
```

Собрать и поднять:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d --build
```

Заполнить демо-данные:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml exec -T backend npm run seed
```

Проверить состояние:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml ps
```

Посмотреть логи backend:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml logs backend --tail=120
```

Остановить:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml down
```

## База данных

Основные таблицы:

| Таблица | Назначение |
| --- | --- |
| `users` | Пользователи, email, hash пароля, роль. |
| `tests` | Тесты, описание, автор, статус публикации, лимит вопросов. |
| `questions` | Вопросы, тип, варианты, пары сопоставления, правильный ответ. |
| `test_results` | Результаты прохождений, score, ответы, время прохождения. |
| `system_settings` | Настройки платформы. |

При старте backend выполняет синхронизацию моделей. Для поля `durationSeconds` в результатах добавлена безопасная проверка/добавление колонки, чтобы существующая база не ломалась при обновлениях схемы.

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
docker compose  ps
```

## Что показать на защите

1. Вход под преподавателем `teacher@test.ru / teacher123`.
2. Создание теста в конструкторе.
3. Добавление вопросов разных типов.
4. Прохождение теста под студентом.
5. Сохранение результата и повтор ошибок.
6. Профиль пользователя с историей результатов.
7. Вход под администратором `admin@test.ru / admin123`.
8. Управление ролями пользователей в администрировании.
9. Swagger UI на `/api/docs`.
10. CI/CD workflow в `.github/workflows/ci-cd.yml`.

## Типовые проблемы

### `npm.ps1` заблокирован в PowerShell

На Windows можно запускать npm через:

```powershell
npm.cmd test
npm.cmd run build
```

### Docker не видит переменные окружения

Убедитесь, что команда запускается с env-файлом:

```bash
docker compose  up -d --build
```

### Swagger UI не открывается

Проверьте backend:

```bash
curl http://localhost:5000/api/health
```

Если backend работает, откройте:

```text
http://localhost:5000/api/docs
```

или через nginx:

```text
http://localhost/api/docs
```
