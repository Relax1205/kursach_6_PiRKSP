import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { resultsAPI } from '../../services/api';
import styles from './Profile.module.css';

function Profile() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      if (isAuthenticated) {
        try {
          const response = await resultsAPI.getMy();
          setResults(response.data);
        } catch (error) {
          console.error('Failed to load results:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadResults();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <p>Пожалуйста, войдите в систему для просмотра профиля.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <h1>Профиль пользователя</h1>
        
        <div className={styles.userInfo}>
          <div className={styles.infoItem}>
            <strong>Имя:</strong> {user?.name}
          </div>
          <div className={styles.infoItem}>
            <strong>Email:</strong> {user?.email}
          </div>
          <div className={styles.infoItem}>
            <strong>Роль:</strong> 
            <span className={`${styles.role} ${styles[user?.role]}`}>
              {user?.role === 'admin' && 'Администратор'}
              {user?.role === 'teacher' && 'Преподаватель'}
              {user?.role === 'student' && 'Студент'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <strong>Дата регистрации:</strong> {new Date(user?.createdAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>

      <div className={styles.resultsSection}>
        <h2>Мои результаты тестов</h2>
        
        {loading ? (
          <p>Загрузка результатов...</p>
        ) : results.length === 0 ? (
          <p className={styles.empty}>Вы пока не проходили тесты</p>
        ) : (
          <div className={styles.resultsList}>
            {results.map((result) => {
              const percent = Math.round((result.score / result.totalQuestions) * 100);
              let grade = '';
              let gradeClass = '';
              
              if (percent >= 90) {
                grade = 'Отлично';
                gradeClass = styles.excellent;
              } else if (percent >= 70) {
                grade = 'Хорошо';
                gradeClass = styles.good;
              } else if (percent >= 50) {
                grade = 'Удовл.';
                gradeClass = styles.satisfactory;
              } else {
                grade = 'Неудовл.';
                gradeClass = styles.poor;
              }

              return (
                <div key={result.id} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <h3>{result.test?.title || `Тест #${result.testId}`}</h3>
                    <span className={`${styles.grade} ${gradeClass}`}>{grade}</span>
                  </div>
                  <div className={styles.resultBody}>
                    <div className={styles.score}>
                      Правильных ответов: <strong>{result.score} из {result.totalQuestions}</strong>
                    </div>
                    <div className={styles.percent}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span>{percent}%</span>
                    </div>
                    <div className={styles.date}>
                      {new Date(result.completedAt).toLocaleString('ru-RU')}
                    </div>
                    {result.score < result.totalQuestions && result.test?.id && (
                      <Link
                        to={`/test/${result.test.id}?mistakes=${result.id}`}
                        className={styles.retryLink}
                      >
                        Повторить ошибки
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
