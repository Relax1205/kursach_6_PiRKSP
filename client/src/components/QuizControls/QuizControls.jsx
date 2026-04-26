import React from 'react';
import styles from './QuizControls.module.css';

function QuizControls({
  currentQuestion,
  totalQuestions,
  isSubmitting,
  onNext,
  onPrev,
  onFinish,
}) {
  return (
    <div className={styles.controls}>
      <button
        onClick={onPrev}
        disabled={currentQuestion === 0 || isSubmitting}
        className={`${styles.button} ${styles.prevButton}`}
      >
        Назад
      </button>

      {currentQuestion < totalQuestions - 1 ? (
        <button
          onClick={onNext}
          disabled={isSubmitting}
          className={`${styles.button} ${styles.nextButton}`}
        >
          Вперёд
        </button>
      ) : (
        <button
          onClick={onFinish}
          disabled={isSubmitting}
          className={`${styles.button} ${styles.finishButton}`}
        >
          {isSubmitting ? 'Отправка...' : 'Завершить тест'}
        </button>
      )}
    </div>
  );
}

export default QuizControls;
