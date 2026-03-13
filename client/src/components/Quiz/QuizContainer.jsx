import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
    fetchQuestions,
    resetQuiz,
    setModeWrong,
    saveResults,
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
        correctCount,
        mode,
        isFinished,
        isLoading,
        error,
        wrongQuestions,
        userAnswers, // ✅ Добавлено: получаем userAnswers из store
    } = useSelector((state) => state.quiz);
    
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    useEffect(() => {
        if (testId) {
            dispatch(fetchQuestions(testId));
        }
        return () => {
            dispatch(resetQuiz());
        };
    }, [dispatch, testId]);

    const handleSaveResults = async () => {
        if (isAuthenticated && user) {
            await dispatch(
                saveResults({
                    testId,
                    score: correctCount,
                    total: questions.length,
                    answers: userAnswers, // ✅ Исправлено: передаём userAnswers вместо []
                })
            );
        }
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
        return (
            <div className={styles.error}>
                <p>❌ {error}</p>
                <button onClick={() => navigate('/tests')}>Вернуться к тестам</button>
            </div>
        );
    }

    if (isFinished) {
        const total = questions.length;
        const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        let resultText = '';
        if (percent >= 90) {
            resultText = 'Отлично! Вы отлично знаете материал.';
        } else if (percent >= 70) {
            resultText = 'Хорошо! Знания на высоте.';
        } else if (percent >= 50) {
            resultText = 'Удовлетворительно. Есть над чем поработать.';
        } else {
            resultText = 'Нужно больше учиться. Попробуйте ещё раз!';
        }
        return (
            <div className={styles.finished}>
                <h2>Тест завершён!</h2>
                <p className={styles.score}>
                    Вы ответили правильно на <strong>{correctCount} из {total}</strong> вопросов
                </p>
                <p className={styles.percent}>({percent}% правильных ответов)</p>
                <p className={styles.resultText}>{resultText}</p>
                <div className={styles.buttons}>
                    {wrongQuestions.length > 0 && (
                        <button onClick={handleRetryWrong} className={styles.retryButton}>
                            🔁 Повторить ошибки
                        </button>
                    )}
                    <button onClick={handleRestart} className={styles.restartButton}>
                        🔄 Пройти тест заново
                    </button>
                    <button onClick={() => navigate('/tests')} className={styles.backButton}>
                        📚 К списку тестов
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Score current={currentQuestion + 1} total={questions.length} mode={mode} />
            {/* 🔒 УСЛОВНЫЙ РЕНДЕРИНГ: только если вопрос существует */}
            {questions[currentQuestion] ? (
                <Question
                    question={questions[currentQuestion]}
                    questionIndex={currentQuestion}
                />
            ) : (
                <div className={styles.loading}>
                    <p>⏳ Подготовка вопроса...</p>
                </div>
            )}
            <QuizControls
                currentQuestion={currentQuestion}
                totalQuestions={questions.length}
                onNext={() => dispatch({ type: 'quiz/nextQuestion' })}
                onPrev={() => dispatch({ type: 'quiz/prevQuestion' })}
                onFinish={handleSaveResults}
            />
        </div>
    );
}

export default QuizContainer;