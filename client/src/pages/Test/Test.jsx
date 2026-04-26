import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { testsAPI } from '../../services/api';
import styles from './Test.module.css';

function formatQuestionCount(count) {
  const normalizedCount = Number(count) || 0;
  const lastTwoDigits = normalizedCount % 100;
  const lastDigit = normalizedCount % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${normalizedCount} вопросов`;
  }

  if (lastDigit === 1) {
    return `${normalizedCount} вопрос`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${normalizedCount} вопроса`;
  }

  return `${normalizedCount} вопросов`;
}

function Test() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTests = async () => {
      try {
        const response = await testsAPI.getAll();
        setTests(response.data);
      } catch (error) {
        console.error('Failed to load tests:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTests();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Загрузка тестов...</p>
      </div>
    );
  }

  return (
    <div className={styles.tests}>
      <h1>Доступные тесты</h1>
      
      {tests.length === 0 ? (
        <div className={styles.empty}>
          <p>Тесты пока не созданы. Запустите сидер:</p>
          <code>cd server && node src/seeders/seedQuestions.js</code>
        </div>
      ) : (
        <div className={styles.testList}>
          {tests.map((test) => (
            <div key={test.id} className={styles.testCard}>
              <h3>{test.title}</h3>
              <p>{test.description}</p>
              <p className={styles.questionCount}>{formatQuestionCount(test.questionCount)}</p>
              <Link to={`/test/${test.id}`} className={styles.startButton}>
                Начать тест
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Test;
