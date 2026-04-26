import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchQuestions,
  nextQuestion,
  prevQuestion,
  resetQuiz,
  setModeWrong,
  submitResults,
} from '../../store/slices/quizSlice';
import Question from '../Question/Question';
import Score from '../Score/Score';
import QuizControls from '../QuizControls/QuizControls';
import styles from './QuizContainer.module.css';

function QuizContainer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { testId } = useParams();

  const {
    questions,
    currentQuestion,
    mode,
    isFinished,
    isLoading,
    isSubmitting,
    error,
    wrongQuestions,
    userAnswers,
    finalResult,
  } = useSelector((state) => state.quiz);

  useEffect(() => {
    if (testId) {
      dispatch(fetchQuestions(testId));
    }

    return () => {
      dispatch(resetQuiz());
    };
  }, [dispatch, testId]);

  const handleFinish = async () => {
    await dispatch(
      submitResults({
        testId,
        questionIds: questions.map((question) => question.id),
        answers: userAnswers,
        persistResult: mode === 'main',
      })
    );
  };

  const handleRetryWrong = () => {
    if (wrongQuestions.length > 0) {
      dispatch(setModeWrong());
    }
  };

  const handleRestart = () => {
    if (testId) {
      dispatch(fetchQuestions(testId));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка вопросов...</p>
      </div>
    );
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.error;

    return (
      <div className={styles.error}>
        <p>Ошибка: {errorMessage}</p>
        <button onClick={() => navigate('/tests')}>Вернуться к тестам</button>
      </div>
    );
  }

  if (isFinished && finalResult) {
    const percent = finalResult.totalQuestions > 0
      ? Math.round((finalResult.score / finalResult.totalQuestions) * 100)
      : 0;

    let resultText = '';
    if (percent >= 90) {
      resultText = 'Отлично! Вы отлично знаете материал.';
    } else if (percent >= 70) {
      resultText = 'Хорошо! Знания на высоте.';
    } else if (percent >= 50) {
      resultText = 'Удовлетворительно. Есть над чем поработать.';
    } else {
      resultText = 'Нужно ещё потренироваться. Попробуйте ещё раз.';
    }

    return (
      <div className={styles.finished}>
        <h2>Тест завершён</h2>
        <p className={styles.score}>
          Правильных ответов: <strong>{finalResult.score} из {finalResult.totalQuestions}</strong>
        </p>
        <p className={styles.percent}>({percent}% правильных ответов)</p>
        <p className={styles.resultText}>{resultText}</p>
        {!finalResult.saved && (
          <p className={styles.resultText}>{finalResult.message}</p>
        )}

        <div className={styles.buttons}>
          {wrongQuestions.length > 0 && (
            <button onClick={handleRetryWrong} className={styles.retryButton}>
              Повторить ошибки
            </button>
          )}
          <button onClick={handleRestart} className={styles.restartButton}>
            Пройти заново
          </button>
          <button onClick={() => navigate('/tests')} className={styles.backButton}>
            К списку тестов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Score current={currentQuestion + 1} total={questions.length} mode={mode} />
      <Question question={questions[currentQuestion]} />
      <QuizControls
        currentQuestion={currentQuestion}
        totalQuestions={questions.length}
        isSubmitting={isSubmitting}
        onNext={() => dispatch(nextQuestion())}
        onPrev={() => dispatch(prevQuestion())}
        onFinish={handleFinish}
      />
    </div>
  );
}

export default QuizContainer;
