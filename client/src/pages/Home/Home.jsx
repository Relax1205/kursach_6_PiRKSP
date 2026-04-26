import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './Home.module.css';

function Home() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const canUseConstructor = isAuthenticated && (user?.role === 'teacher' || user?.role === 'admin');

  return (
    <div className={styles.home}>
      <h1>Добро пожаловать в Конструктор Тестов!</h1>
      <p>Система для создания и прохождения образовательных тестов</p>

      <div className={styles.buttons}>
        <Link to="/tests" className={styles.button}>
          Пройти тест
        </Link>

        {canUseConstructor && (
          <Link to="/constructor" className={styles.button}>
            Открыть конструктор
          </Link>
        )}

        {!isAuthenticated && (
          <Link to="/login" className={styles.button}>
            Войти для создания тестов
          </Link>
        )}
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <h3>Конструктор тестов</h3>
          <p>Преподаватель или администратор может создавать тесты, добавлять вопросы и сохранять их в базе данных.</p>
        </div>
        <div className={styles.feature}>
          <h3>Проверка ответов</h3>
          <p>Ответ можно проверить сразу: система покажет выбранный вариант и правильное решение.</p>
        </div>
        <div className={styles.feature}>
          <h3>Статистика</h3>
          <p>Профиль хранит историю результатов и прогресс пользователя.</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
