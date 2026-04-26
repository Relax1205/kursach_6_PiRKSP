# Интерактивный конструктор образовательных тестов

[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

Курсовой fullstack-проект по теме «Интерактивный конструктор образовательных тестов». Приложение позволяет регистрироваться, входить в систему, проходить тесты, сохранять результаты, а преподавателям и администраторам - создавать тесты и управлять вопросами.

## Стек

### Frontend

- React 18
- Redux Toolkit
- React Router v6
- Axios
- CSS Modules
- Nginx для production-сборки

### Backend

- Node.js 18
- Express
- Sequelize ORM
- PostgreSQL 15
- JWT
- bcryptjs
- express-validator

### DevOps и тестирование

- Docker
- Docker Compose
- Nginx reverse proxy
- Jest / React Testing Library
- Кастомный fuzzing-скрипт для API

## Структура проекта

```text
.
|-- client/                  # React SPA, Redux, страницы и компоненты
|   |-- Dockerfile           # Production-сборка клиента через nginx
|   |-- nginx.conf           # Конфиг nginx для SPA fallback
|   `-- src/
|-- server/                  # Express API, Sequelize-модели, seed, fuzzing
|   |-- Dockerfile
|   |-- init.sql
|   |-- src/
|   `-- tests/fuzzing/
|-- nginx/                   # Reverse proxy для Docker Compose
|-- docker-compose.yml       # PostgreSQL + backend + frontend + nginx
|-- .env.example             # Переменные окружения для Docker Compose
|-- server/.env.example      # Переменные окружения для локального backend
`-- РКСП-объеденённый.pdf     # Нормативный/учебный материал для сверки
```

## Быстрый запуск через Docker

```bash
docker compose --env-file .env.example up -d --build
docker compose --env-file .env.example exec -T backend npm run seed
```

После запуска:

- `http://localhost` - приложение через общий nginx reverse proxy
- `http://localhost:3001` - frontend-контейнер напрямую
- `http://localhost:5000/api/health` - backend healthcheck
- `http://localhost:5432` - PostgreSQL

Порт `3001` используется для прямого доступа к frontend, чтобы не конфликтовать с частым dev-портом `3000`.

## Локальный запуск без Docker

Нужен локальный PostgreSQL и переменные из `server/.env.example`.

```bash
cd server
npm install
npm run seed
npm run dev
```

Во втором терминале:

```bash
cd client
npm install
npm start
```

## Тестовые учётные записи

После `npm run seed` создаются или обновляются:

| Роль | Email | Пароль |
| --- | --- | --- |
| Admin | admin@test.ru | admin123 |
| Teacher | teacher@test.ru | teacher123 |
| Student | student@test.ru | student123 |

### Как войти под админом или преподавателем

1. Запустите приложение и откройте `http://localhost:3001` или `http://localhost`.
2. Нажмите кнопку `Войти` в правом верхнем углу.
3. Для входа под администратором введите:
   - Email: `admin@test.ru`
   - Пароль: `admin123`
4. Для входа под преподавателем введите:
   - Email: `teacher@test.ru`
   - Пароль: `teacher123`
5. После входа в шапке появится пункт `Конструктор`. Через него можно создавать тесты, добавлять вопросы, редактировать их и сохранять изменения в базе данных.

Администратор и преподаватель имеют доступ к конструктору тестов. Обычный студент может проходить тесты и смотреть свои результаты, но не может создавать или редактировать тесты.

Публичная регистрация всегда создаёт пользователя только с ролью `student`; попытка передать другую роль отклоняется валидатором.

## Основные возможности

- Регистрация и аутентификация с JWT.
- Хеширование паролей через bcryptjs.
- Ролевая модель `student` / `teacher` / `admin`.
- CRUD тестов и вопросов для `teacher` и `admin`.
- Поддержка вопросов с одним ответом, несколькими ответами и сопоставлением.
- Прохождение теста без передачи правильных ответов на клиент.
- Серверная проверка ответов и сохранение результатов.
- Профиль пользователя с историей попыток.
- API-валидация входных данных и проверка некорректных ролей.

## Тестирование

Frontend:

```bash
cd client
npm test -- --watchAll=false --runInBand
npm run build
```

Fuzzing API:

```bash
cd server/tests/fuzzing
npm install
npm test
```

Fuzzing проверяет SQL injection, XSS payloads, authentication bypass, RBAC, path traversal, command injection, большие payloads и null byte payloads. JSON-отчёты сохраняются в `server/tests/fuzzing/results/`.
