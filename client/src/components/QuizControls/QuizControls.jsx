import React from 'react';
import styles from './QuizControls.module.css';

function QuizControls({
  currentQuestion,
  totalQuestions,
  onNext,
  onPrev,
  onFinish,
}) {
  return (
    <div className={styles.controls}>
      <button
        onClick={onPrev}
        disabled={currentQuestion === 0}
        className={`${styles.button} ${styles.prevButton}`}
      >
        ⬅ Назад
      </button>

      {currentQuestion < totalQuestions - 1 ? (
        <button onClick={onNext} className={`${styles.button} ${styles.nextButton}`}>
          ➡ Вперёд
        </button>
      ) : (
        <button onClick={onFinish} className={`${styles.button} ${styles.finishButton}`}>
          ✅ Завершить тест
        </button>
      )}
    </div>
  );
}

export default QuizControls;