import React from 'react';
import styles from './Score.module.css';

function Score({ current, total, mode }) {
  return (
    <div className={styles.scoreContainer}>
      <div className={styles.scoreText}>
        {mode === 'wrong'
          ? `Ошибка ${current} из ${total}`
          : `Пройдено вопросов: ${current} / ${total}`}
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${(current / total) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

export default Score;