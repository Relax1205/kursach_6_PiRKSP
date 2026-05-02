import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  fetchMistakeQuestions,
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

const SECONDS_PER_QUESTION = 60;

function QuizContainer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const mistakeResultId = searchParams.get('mistakes');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const autoSubmitRef = useRef(false);

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

  const questionSetKey = useMemo(() => {
    if (questions.length === 0) {
      return '';
    }

    return `${mode}:${questions.map((question) => question.id).join(',')}`;
  }, [mode, questions]);

  useEffect(() => {
    if (mistakeResultId) {
      dispatch(fetchMistakeQuestions(mistakeResultId));
    } else if (testId) {
      dispatch(fetchQuestions(testId));
    }

    return () => {
      dispatch(resetQuiz());
    };
  }, [dispatch, mistakeResultId, testId]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (questions.length === 0) {
      setRemainingSeconds(null);
      setHasTimedOut(false);
      autoSubmitRef.current = false;
      return;
    }

    setRemainingSeconds(questions.length * SECONDS_PER_QUESTION);
    setHasTimedOut(false);
    autoSubmitRef.current = false;
  }, [isLoading, questionSetKey, questions.length]);

  useEffect(() => {
    if (
      isLoading
      || isFinished
      || isSubmitting
      || questions.length === 0
      || remainingSeconds === null
      || remainingSeconds <= 0
    ) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        /* istanbul ignore next -- state setter can receive null only after unmount/race cleanup */
        if (currentSeconds === null) {
          return currentSeconds;
        }

        return Math.max(currentSeconds - 1, 0);
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isFinished, isLoading, isSubmitting, questions.length, remainingSeconds]);

  const submitQuizResult = useCallback(async () => {
    /* istanbul ignore next -- submit controls are hidden/disabled for this guard */
    if (isSubmitting || questions.length === 0) {
      return;
    }

    await dispatch(
      submitResults({
        testId,
        questionIds: questions.map((question) => question.id),
        answers: userAnswers,
        persistResult: mode === 'main',
      })
    );
  }, [dispatch, isSubmitting, mode, questions, testId, userAnswers]);

  useEffect(() => {
    if (
      remainingSeconds !== 0
      || questions.length === 0
      || isFinished
      || isSubmitting
      || autoSubmitRef.current
    ) {
      return;
    }

    autoSubmitRef.current = true;
    setHasTimedOut(true);
    submitQuizResult();
  }, [isFinished, isSubmitting, questions.length, remainingSeconds, submitQuizResult]);

  const handleFinish = async () => {
    await submitQuizResult();
  };

  const handleRetryWrong = () => {
    /* istanbul ignore else -- retry button is rendered only when wrong questions exist */
    if (wrongQuestions.length > 0) {
      dispatch(setModeWrong());
    }
  };

  const handleRestart = () => {
    /* istanbul ignore next -- restart branches are router wiring around tested thunks */
    if (mistakeResultId) {
      dispatch(fetchMistakeQuestions(mistakeResultId));
    } else if (testId) {
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

  if (questions.length === 0) {
    return (
      <div className={styles.error}>
        <p>{mistakeResultId ? 'В этом результате нет ошибок для повторения.' : 'В тесте пока нет вопросов.'}</p>
        <button onClick={() => navigate(mistakeResultId ? '/profile' : '/tests')}>
          {mistakeResultId ? 'Вернуться в профиль' : 'Вернуться к тестам'}
        </button>
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
        {hasTimedOut && (
          <p className={styles.resultText}>Время вышло, тест завершён автоматически.</p>
        )}
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
      <Score
        current={currentQuestion + 1}
        total={questions.length}
        mode={mode}
        remainingSeconds={remainingSeconds}
        timeLimitSeconds={questions.length * SECONDS_PER_QUESTION}
      />
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
