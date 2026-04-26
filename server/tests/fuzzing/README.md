# Fuzzing Tests

В папке лежит кастомный Node.js-скрипт для базовой фаззинг-проверки API.

## Что покрывает скрипт

- SQL injection payloads
- XSS payloads
- Проверку защищённых маршрутов без валидного токена
- RBAC для ролей `admin`, `teacher`, `student`
- Path traversal payloads
- Command injection payloads
- Большие входные данные
- Null byte payloads

## Запуск

Перед запуском fuzzing должен быть доступен backend на `http://localhost:5000`.
Для Docker-сценария:

```bash
docker compose --env-file .env.example up -d --build backend
docker compose --env-file .env.example exec -T backend npm run seed
```

```bash
cd server/tests/fuzzing
npm install
npm test
```

По умолчанию цель тестирования: `http://localhost:5000`.

Можно переопределить:

```bash
BASE_URL=http://localhost:5000 npm test
```

## Отчёт

JSON-отчёт сохраняется в `results/fuzzing-report-*.json`.
