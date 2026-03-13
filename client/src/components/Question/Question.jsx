import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addCorrect,
  addWrong,
  removeWrong,
  setUserAnswer,
} from '../../store/slices/quizSlice';
import styles from './Question.module.css';

function Question({ question, questionIndex }) {
  const dispatch = useDispatch();
  const { mode, wrongQuestions } = useSelector((state) => state.quiz);
  const [selected, setSelected] = useState([]);
  const [matching, setMatching] = useState({});
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState(null);

  const isSingleAnswer = question.correct.length === 1;
  const isMatching = question.type === 'matching';

  const handleOptionChange = (index) => {
    if (isSingleAnswer) {
      setSelected([index]);
    } else {
      setSelected((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    }
  };

  const handleMatchingChange = (rightIndex, leftIndex) => {
    setMatching((prev) => ({
      ...prev,
      [rightIndex]: parseInt(leftIndex),
    }));
  };

  const checkAnswer = () => {
    let isCorrect = false;

    if (isMatching) {
      const allFilled = question.right.every(
        (_, idx) => matching[idx] !== undefined
      );
      if (!allFilled) {
        setResult({ success: false, message: '❌ Заполните все поля.' });
        return;
      }
      isCorrect = question.right.every(
        (_, rightIdx) => matching[rightIdx] === question.correct[rightIdx]
      );
    } else {
      const selectedSet = new Set(selected.sort());
      const correctSet = new Set(question.correct.sort());
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
  };

  const resetQuestion = () => {
    setSelected([]);
    setMatching({});
    setChecked(false);
    setResult(null);
  };

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
          {question.right.map((item, rightIdx) => (
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
                {question.left.map((desc, leftIdx) => (
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
          {question.options.map((option, index) => (
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
                  checked && question.correct.includes(index)
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