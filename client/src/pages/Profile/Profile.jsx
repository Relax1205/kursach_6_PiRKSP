import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { resultsAPI } from '../../services/api';
import styles from './Profile.module.css';

const ROLE_LABELS = {
  admin: 'Администратор',
  teacher: 'Преподаватель',
  student: 'Студент',
};

export const getResultPercent = (result) => {
  if (!result?.totalQuestions) {
    return 0;
  }

  return Math.round((result.score / result.totalQuestions) * 100);
};

export const getGrade = (percent) => {
  if (percent >= 90) {
    return { label: 'Отлично', className: styles.excellent };
  }

  if (percent >= 70) {
    return { label: 'Хорошо', className: styles.good };
  }

  if (percent >= 50) {
    return { label: 'Удовл.', className: styles.satisfactory };
  }

  return { label: 'Неудовл.', className: styles.poor };
};

export const hasDuration = (seconds) => {
  return seconds !== null && seconds !== undefined && seconds !== '' && Number.isFinite(Number(seconds));
};

export const formatDuration = (seconds) => {
  if (!hasDuration(seconds)) {
    return 'нет данных';
  }

  const normalizedSeconds = Math.max(0, Number(seconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const restSeconds = normalizedSeconds % 60;

  if (minutes === 0) {
    return `${restSeconds} сек.`;
  }

  return `${minutes} мин. ${restSeconds.toString().padStart(2, '0')} сек.`;
};

function Profile() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await resultsAPI.getMy();
        setResults(response.data);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
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
              {ROLE_LABELS[user?.role]}
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
              const percent = getResultPercent(result);
              const grade = getGrade(percent);

              return (
                <div key={result.id} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <h3>{result.test?.title || `Тест #${result.testId}`}</h3>
                    <span className={`${styles.grade} ${grade.className}`}>{grade.label}</span>
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
                    {hasDuration(result.durationSeconds) && (
                      <div className={styles.date}>
                        Время прохождения: {formatDuration(result.durationSeconds)}
                      </div>
                    )}
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
