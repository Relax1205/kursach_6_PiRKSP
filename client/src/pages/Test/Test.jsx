import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Test.module.css';

function Test() {
  // Временные тестовые данные (будут загружаться с сервера)
  const tests = [
    {
      id: 1,
      title: 'Основы РБД',
      description: 'Базовые понятия реляционных баз данных',
      questions: 150,
    },
    {
      id: 2,
      title: 'SQL Запросы',
      description: 'Работа с операторами SQL',
      questions: 50,
    },
    {
      id: 3,
      title: 'Оконные функции',
      description: 'Продвинутые возможности SQL',
      questions: 30,
    },
  ];

  return (
    <div className={styles.tests}>
      <h1>Доступные тесты</h1>
      <div className={styles.testList}>
        {tests.map((test) => (
          <div key={test.id} className={styles.testCard}>
            <h3>{test.title}</h3>
            <p>{test.description}</p>
            <p className={styles.questions}>{test.questions} вопросов</p>
            <Link to={`/test/${test.id}`} className={styles.startButton}>
              Начать тест
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Test;