import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './Home.module.css';

function Home() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  return (
    <div className={styles.home}>
      <h1>Добро пожаловать в Конструктор Тестов!</h1>
      <p>Система для создания и прохождения образовательных тестов по РБД</p>
      
      <div className={styles.buttons}>
        <Link to="/tests" className={styles.button}>
          📚 Пройти тест
        </Link>
        
        {isAuthenticated && user?.role === 'teacher' && (
          <Link to="/constructor" className={styles.button}>
            ✏️ Создать тест
          </Link>
        )}
        
        {!isAuthenticated && (
          <Link to="/login" className={styles.button}>
            🔐 Войти
          </Link>
        )}
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <h3>📝 150+ вопросов</h3>
          <p>База вопросов по реляционным базам данных</p>
        </div>
        <div className={styles.feature}>
          <h3>🔄 Повторение ошибок</h3>
          <p>Автоматический режим работы над ошибками</p>
        </div>
        <div className={styles.feature}>
          <h3>📊 Статистика</h3>
          <p>Отслеживание прогресса обучения</p>
        </div>
      </div>
    </div>
  );
}

export default Home;