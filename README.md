# 📝 Интерактивный конструктор образовательных тестов

[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

## 📋 Описание

Веб-приложение для создания и прохождения образовательных тестов по реляционным базам данных. Разработано в рамках курсовой работы по дисциплине "Проектирование и разработка клиент-серверных приложений".

## 🚀 Технологии

### Frontend
- **React 18** - UI библиотека (ПР №1, №2)
- **Redux Toolkit** - Управление состоянием (ПР №5)
- **React Router v6** - Маршрутизация (ПР №3, №4)
- **CSS Modules** - Стилизация (ПР №2)
- **Axios** - HTTP клиент

### Backend
- **Node.js 18** - Платформа выполнения (ПР №7)
- **Express** - Web фреймворк (ПР №7)
- **Sequelize ORM** - Работа с БД (ПР №7)
- **PostgreSQL 15** - База данных (ПР №7)
- **JWT** - Аутентификация (ПР №6)
- **bcryptjs** - Хэширование паролей

### DevOps
- **Docker** - Контейнеризация
- **Docker Compose** - Оркестрация
- **Nginx** - Reverse proxy


## 🛠 Установка и запуск

### Локальная разработка

```bash
# Клонировать репозиторий
git clone https://github.com/username/test-constructor.git
cd test-constructor

# Backend
cd server
npm install
npm run seed          # Заполнить БД тестовыми данными
npm run dev

# Frontend (в другом терминале)
cd client
npm install
npm start
```

### Docker запуск
```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Полная очистка
docker-compose down -v
```

## 🧪 Тестирование
### Fuzzing тесты
```bash
cd server/tests/fuzzing
npm install
npm test
```

### Unit тесты
```bash
cd server
npm test

cd client
npm test
```

## 🔐 Тестовые учётные данные

| | | 
| Роль | Email | Пароль | 
| Admin | admin@test.ru | admin123 |
| Teacher | teacher@test.ru | teacher123 |
| Student | student@test.ru | student123 |