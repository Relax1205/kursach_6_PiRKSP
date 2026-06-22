# Deployment на Ubuntu/VPS

Поддерживаемый сценарий — ручная сборка конкретной Git-ревизии с
`docker-compose.ubuntu.yml`. Процесс разделён на build, release и run.

## Предварительные требования

- Ubuntu Server с Docker Engine и Compose plugin;
- доступ к Git-репозиторию;
- открытый TCP-порт `80` и административный доступ по SSH;
- место для PostgreSQL volume и резервных копий.

TLS в репозитории не настроен. Для публичной эксплуатации нужен внешний
TLS-terminating proxy либо отдельная HTTPS-конфигурация.

## Состав deployment

Постоянно работают четыре сервиса: `postgres`, `backend`, `frontend`, `nginx`.
`release` запускается из того же image, что и backend, изменяет схему и
инициализирует настройки, после чего завершается. Production наружу публикует
только edge nginx на порту `80`.

## Подготовка конфигурации

```bash
REPOSITORY_URL=https://git.example.com/owner/test-constructor.git
RELEASE=replace-with-commit-or-tag
git clone "$REPOSITORY_URL" test-constructor
cd test-constructor
git checkout "$RELEASE"
cp .env.ubuntu.example .env.ubuntu
chmod 600 .env.ubuntu
```

Замените шаблонные секреты:

```env
POSTGRES_DB=testdb
POSTGRES_USER=test_constructor
POSTGRES_PASSWORD=<long-random-database-password>
JWT_SECRET=<long-random-jwt-secret>
JWT_EXPIRE=7d
NODE_ENV=production
```

Frontend использует относительный `/api/`, поэтому публичный адрес не является
build-time переменной и один image подходит любому окружению.

Проверьте конфигурацию. Полный вывод `config` содержит подставленные секреты,
поэтому не публикуйте его:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml config -q
```

## Первичное развёртывание

### 1. Build

Build создаёт artifacts и не подключается к базе данных:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml build --pull
```

### 2. Release

Запустите PostgreSQL, дождитесь readiness и выполните одноразовые admin-задачи:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d postgres
until docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'; do sleep 2; done
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml run --rm --no-deps release
```

Release должен завершиться кодом `0`. Он создаёт отсутствующие таблицы,
добавляет требуемую колонку и начальные настройки. При ошибке runtime не следует
запускать. `server/init.sql` выполняется PostgreSQL только для пустого volume и
создаёт расширение `uuid-ossp`.

### 3. Run

После успешного release запустите долгоживущие процессы:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d --no-deps backend frontend nginx
until docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml exec -T backend wget -q --spider http://127.0.0.1:5000/api/health; do sleep 2; done
```

Runtime backend только проверяет подключение, открывает порт и обрабатывает
запросы. Он не выполняет schema sync и не инициализирует настройки.

### 4. Проверка

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml ps
APP_ORIGIN=http://your-domain-or-ip
curl --fail "$APP_ORIGIN/api/health"
curl --fail "$APP_ORIGIN/"
curl --fail "$APP_ORIGIN/api/docs.json"
```

Ожидаются четыре running-сервиса и HTTP 200 от всех трёх URL.

## Демо-данные

Seeder — отдельный одноразовый административный процесс. Сначала обязан быть
выполнен release:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml run --rm --no-deps backend npm run seed
```

Seeder создаёт известные demo-аккаунты и не должен запускаться на публичном
production без процедуры смены или удаления этих данных.

## Плановое обновление

1. Сохраните текущую ревизию и сделайте backup:

```bash
git rev-parse HEAD
mkdir -p backups
BACKUP="backups/pre-update-$(date +%Y%m%d-%H%M%S).dump"
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP"
test -s "$BACKUP"
```

2. Получите новую конкретную ревизию, проверьте config и выполните три фазы:

```bash
git fetch --all --tags
NEW_RELEASE=replace-with-new-commit-or-tag
git checkout "$NEW_RELEASE"
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml config -q
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml build --pull
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml run --rm --no-deps release
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d --no-deps backend frontend nginx
```

3. Повторите health/UI/API-проверки и просмотрите логи:

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml logs --tail=200 backend frontend nginx
```

## Rollback

Если схема совместима с предыдущей версией:

```bash
PREVIOUS_RELEASE=replace-with-previous-commit-or-tag
git checkout "$PREVIOUS_RELEASE"
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml build
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml up -d --no-deps backend frontend nginx
```

Если release изменил схему несовместимо, восстановите проверенный backup до
запуска предыдущей версии. Проект пока не предоставляет автоматические down-
migrations, поэтому backup перед release обязателен.

## Остановка и данные

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml down
```

`down -v` удаляет named volume и все данные БД; используйте его только для
осознанного сброса после проверенного backup.

## Диагностика

```bash
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml ps -a
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml logs --tail=200 postgres
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml logs --tail=200 release
docker compose --env-file .env.ubuntu -f docker-compose.ubuntu.yml logs --tail=200 backend frontend nginx
```

| Симптом | Что проверить |
| --- | --- |
| `release` завершился с ошибкой | PostgreSQL health, `DATABASE_URL`, права на изменение схемы |
| Backend не запускается | успешен ли release, PostgreSQL health, runtime env |
| UI открыт, API недоступен | edge/frontend nginx и backend logs |
| Данные исчезли | Compose project/volume и запускался ли `down -v` |
| `/api/health` OK, DB-запросы падают | health endpoint не проверяет БД после старта |

Все приложения пишут логи в stdout/stderr; файлы логов внутри контейнеров не
используются.

## Граница GitHub Actions

Workflow запускает тесты, coverage-guided fuzzing, Compose smoke test и
публикует images в Docker Hub. Он не подключается к VPS и не выполняет deploy.
Production Compose собирает checkout локально; переход на опубликованные images
требует immutable tag и отдельный авторизованный deployment job.
