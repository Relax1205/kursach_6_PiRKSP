import React from 'react';
import styles from './Score.module.css';

export function formatRemainingTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function Score({ current, total, mode, remainingSeconds, timeLimitSeconds }) {
  const hasTimer = Number.isFinite(remainingSeconds) && Number.isFinite(timeLimitSeconds);
  const isTimerWarning = hasTimer && remainingSeconds <= 60;

  return (
    <div className={styles.scoreContainer}>
      <div className={styles.scoreHeader}>
        <div className={styles.scoreText}>
          {mode === 'wrong'
            ? `Ошибка ${current} из ${total}`
            : `Пройдено вопросов: ${current} / ${total}`}
        </div>
        {hasTimer && (
          <div className={`${styles.timer} ${isTimerWarning ? styles.timerWarning : ''}`}>
            Осталось: {formatRemainingTime(remainingSeconds)}
          </div>
        )}
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
