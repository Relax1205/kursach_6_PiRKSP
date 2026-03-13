import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    addCorrect,
    addWrong,
    removeWrong,
    setUserAnswer,
} from '../../store/slices/quizSlice';
import styles from './Question.module.css';

function Question({ question, questionIndex }) {
    // 🔒 ЗАЩИТА: если вопрос не загружен — показываем заглушку
    if (!question) {
        return (
            <div className={styles.questionBlock}>
                <p>⏳ Загрузка вопроса...</p>
            </div>
        );
    }
    
    const dispatch = useDispatch();
    const { mode, wrongQuestions, userAnswers } = useSelector((state) => state.quiz);
    
    const [selected, setSelected] = useState([]);
    const [matching, setMatching] = useState({});
    const [checked, setChecked] = useState(false);
    const [result, setResult] = useState(null);
    
    // Теперь безопасно: question гарантированно существует
    const isSingleAnswer = question.correct?.length === 1;
    const isMatching = question.type === 'matching';
    
    // ✅ ИСПРАВЛЕНИЕ 1: Сброс состояния при смене вопроса
    useEffect(() => {
        setSelected([]);
        setMatching({});
        setChecked(false);
        setResult(null);
    }, [questionIndex]);
    
    // ✅ ИСПРАВЛЕНИЕ 2: Загрузка сохранённого ответа из Redux store
    useEffect(() => {
        const savedAnswer = userAnswers?.find(
            a => a.questionIndex === questionIndex
        );
        if (savedAnswer && !checked) {
            if (isMatching) {
                setMatching(savedAnswer.answer);
            } else {
                setSelected(savedAnswer.answer);
            }
        }
    }, [questionIndex, userAnswers, isMatching, checked]);
    
    const handleOptionChange = useCallback((index) => {
        if (isSingleAnswer) {
            setSelected([index]);
        } else {
            setSelected((prev) =>
                prev.includes(index)
                    ? prev.filter((i) => i !== index)
                    : [...prev, index]
            );
        }
    }, [isSingleAnswer]);
    
    const handleMatchingChange = useCallback((rightIndex, leftIndex) => {
        setMatching((prev) => ({
            ...prev,
            [rightIndex]: parseInt(leftIndex),
        }));
    }, []);
    
    // ✅ ИСПРАВЛЕНИЕ 3: Копирование массивов перед сортировкой (не мутировать Redux state!)
    const checkAnswer = useCallback(() => {
        let isCorrect = false;
        
        if (isMatching) {
            const allFilled = question.right?.every(
                (_, idx) => matching[idx] !== undefined
            );
            if (!allFilled) {
                setResult({ success: false, message: '❌ Заполните все поля.' });
                return;
            }
            isCorrect = question.right?.every(
                (_, rightIdx) => matching[rightIdx] === question.correct?.[rightIdx]
            );
        } else {
            // ✅ Создаём копии массивов перед сортировкой, чтобы не мутировать immutable-данные из Redux
            const selectedSet = new Set([...selected].sort((a, b) => a - b));
            const correctSet = new Set([...(question.correct || [])].sort((a, b) => a - b));
            
            isCorrect =
                selectedSet.size === correctSet.size &&
                [...selectedSet].every((val) => correctSet.has(val));
        }
        
        if (isCorrect) {
            setResult({ success: true, message: '✅ Правильно!' });
            dispatch(addCorrect());
            if (mode === 'wrong') {
                dispatch(removeWrong({ question }));
            }
        } else {
            setResult({ success: false, message: '❌ Неправильно.' });
            if (mode === 'main') {
                dispatch(addWrong({ question }));
            }
        }
        
        dispatch(
            setUserAnswer({
                questionIndex,
                answer: isMatching ? matching : selected,
            })
        );
        setChecked(true);
    }, [isMatching, matching, selected, question, mode, dispatch, questionIndex]);
    
    const resetQuestion = useCallback(() => {
        setSelected([]);
        setMatching({});
        setChecked(false);
        setResult(null);
    }, []);
    
    return (
        <div className={styles.questionBlock}>
            {mode === 'wrong' && (
                <div className={styles.errorInfo}>
                    Ошибка {questionIndex + 1} из {wrongQuestions.length}
                </div>
            )}
            <h3 className={styles.questionText}>{question.question}</h3>
            {isMatching ? (
                <div className={styles.matchingContainer}>
                    <p className={styles.matchingInstruction}>
                        <strong>Сопоставьте:</strong>
                    </p>
                    {question.right?.map((item, rightIdx) => (
                        <div key={rightIdx} className={styles.matchingRow}>
                            <span className={styles.matchingRight}>{item}</span>
                            <select
                                className={styles.matchingSelect}
                                value={matching[rightIdx] ?? ''}
                                onChange={(e) =>
                                    handleMatchingChange(rightIdx, e.target.value)
                                }
                                disabled={checked}
                            >
                                <option value="">--</option>
                                {question.left?.map((desc, leftIdx) => (
                                    <option key={leftIdx} value={leftIdx}>
                                        {desc}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.options}>
                    {question.options?.map((option, index) => (
                        <label key={index} className={styles.optionLabel}>
                            <input
                                type={isSingleAnswer ? 'radio' : 'checkbox'}
                                name="answer"
                                checked={selected.includes(index)}
                                onChange={() => handleOptionChange(index)}
                                disabled={checked}
                                className={styles.optionInput}
                            />
                            <span
                                className={`${styles.optionText} ${
                                    checked && question.correct?.includes(index)
                                        ? styles.correctOption
                                        : checked && selected.includes(index)
                                        ? styles.wrongOption
                                        : ''
                                }`}
                            >
                                {option}
                            </span>
                        </label>
                    ))}
                </div>
            )}
            <div className={styles.actions}>
                {!checked ? (
                    <button onClick={checkAnswer} className={styles.checkButton}>
                        Проверить
                    </button>
                ) : (
                    <button onClick={resetQuestion} className={styles.resetButton}>
                        Сбросить
                    </button>
                )}
            </div>
            {result && (
                <div
                    className={`${styles.result} ${
                        result.success ? styles.resultSuccess : styles.resultError
                    }`}
                >
                    {result.message}
                </div>
            )}
        </div>
    );
}

export default Question;