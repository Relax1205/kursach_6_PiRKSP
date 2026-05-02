import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUserAnswer } from '../../store/slices/quizSlice';
import styles from './Question.module.css';

function normalizeOptionAnswer(selectedIndices, question) {
  return selectedIndices
    .map((displayedIndex) => question.optionIndexMap[displayedIndex])
    .filter((value) => Number.isInteger(value))
    .sort((left, right) => left - right);
}

function normalizeMatchingAnswer(matchingPairs, question) {
  return Object.entries(matchingPairs).reduce((accumulator, [rightIndex, displayedLeftIndex]) => {
    const originalLeftIndex = question.leftIndexMap[displayedLeftIndex];

    /* istanbul ignore else -- select controls only emit known displayed indices */
    if (Number.isInteger(originalLeftIndex)) {
      accumulator[rightIndex] = originalLeftIndex;
    }

    return accumulator;
  }, {});
}

function denormalizeOptionAnswer(answer, question) {
  if (!Array.isArray(answer)) {
    return [];
  }

  const normalizedAnswer = new Set(answer.map(Number));

  return question.optionIndexMap.reduce((accumulator, originalIndex, displayedIndex) => {
    if (normalizedAnswer.has(originalIndex)) {
      accumulator.push(displayedIndex);
    }

    return accumulator;
  }, []);
}

function denormalizeMatchingAnswer(answer, question) {
  if (!answer || Array.isArray(answer) || typeof answer !== 'object') {
    return {};
  }

  return Object.entries(answer).reduce((accumulator, [rightIndex, originalLeftIndex]) => {
    const displayedLeftIndex = question.leftIndexMap.findIndex(
      (leftIndex) => leftIndex === Number(originalLeftIndex)
    );

    /* istanbul ignore else -- saved answers are normalized by the quiz/result API */
    if (displayedLeftIndex >= 0) {
      accumulator[rightIndex] = displayedLeftIndex;
    }

    return accumulator;
  }, {});
}

function getCorrectOptionIndices(question) {
  if (!Array.isArray(question.correct)) {
    return [];
  }

  return [...new Set(
    question.correct
      .map(Number)
      .filter((value) => Number.isInteger(value))
  )].sort((left, right) => left - right);
}

function areArraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function getMatchingTextByOriginalIndex(question, originalIndex) {
  const displayedIndex = question.leftIndexMap.findIndex((value) => value === originalIndex);
  return displayedIndex >= 0 ? question.left[displayedIndex] : '';
}

function getCorrectMatchingIndex(question, rightIndex) {
  if (!Array.isArray(question.correct)) {
    return null;
  }

  const correctIndex = Number(question.correct[rightIndex]);
  /* istanbul ignore next -- malformed matching keys are normalized by admin validation */
  return Number.isInteger(correctIndex) ? correctIndex : null;
}

function Question({ question }) {
  const dispatch = useDispatch();
  const { mode, wrongQuestions, userAnswers } = useSelector((state) => state.quiz);
  const [selected, setSelected] = useState([]);
  const [matching, setMatching] = useState({});
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const savedAnswer = userAnswers.find((answerEntry) => answerEntry.questionId === question?.id);

    if (!question || !savedAnswer) {
      setSelected([]);
      setMatching({});
      setIsChecked(false);
      return;
    }

    if (question.type === 'matching') {
      setMatching(denormalizeMatchingAnswer(savedAnswer.answer, question));
      setSelected([]);
      setIsChecked(false);
      return;
    }

    setSelected(denormalizeOptionAnswer(savedAnswer.answer, question));
    setMatching({});
    setIsChecked(false);
  }, [question, userAnswers]);

  if (!question) {
    return (
      <div className={styles.questionBlock}>
        <p>Подготовка вопроса...</p>
      </div>
    );
  }

  const isSingleAnswer = question.type === 'single';
  const isMatching = question.type === 'matching';
  const correctOptionIndices = getCorrectOptionIndices(question);
  const normalizedSelected = isMatching ? [] : normalizeOptionAnswer(selected, question);
  const normalizedMatching = isMatching ? normalizeMatchingAnswer(matching, question) : {};
  const hasAnswer = isMatching ? Object.keys(matching).length > 0 : selected.length > 0;
  const isOptionAnswerCorrect = !isMatching && areArraysEqual(normalizedSelected, correctOptionIndices);
  const isMatchingAnswerCorrect = isMatching && Array.isArray(question.correct)
    && question.correct.length === question.right.length
    && Object.keys(normalizedMatching).length === question.right.length
    && question.correct.every((expectedIndex, rightIndex) => {
      return normalizedMatching[rightIndex] === Number(expectedIndex);
    });
  const isAnswerCorrect = isMatching ? isMatchingAnswerCorrect : isOptionAnswerCorrect;

  const optionFeedbackRows = isMatching
    ? []
    : question.options.map((option, index) => {
        const originalIndex = question.optionIndexMap[index];
        const isSelectedOption = selected.includes(index);
        const isCorrectOption = correctOptionIndices.includes(originalIndex);

        return {
          key: index,
          item: option,
          userAnswer: isSelectedOption ? 'Выбрано' : '-',
          correctAnswer: isCorrectOption ? 'Правильный ответ' : '-',
          isSelectedOption,
          isCorrectOption,
          isWrongAnswer: isSelectedOption && !isCorrectOption
        };
      });

  const matchingFeedbackRows = isMatching
    ? question.right.map((item, rightIndex) => {
        const displayedLeftIndex = matching[rightIndex];
        const correctIndex = getCorrectMatchingIndex(question, rightIndex);
        const userAnswer = Number.isInteger(displayedLeftIndex)
          ? question.left[displayedLeftIndex]
          : 'не выбрано';
        const correctAnswer = getMatchingTextByOriginalIndex(question, correctIndex);

        return {
          key: rightIndex,
          item,
          userAnswer,
          correctAnswer,
          isSelectedOption: normalizedMatching[rightIndex] === correctIndex,
          isCorrectOption: true,
          isWrongAnswer: normalizedMatching[rightIndex] !== correctIndex
        };
      })
    : [];

  const handleOptionChange = (index) => {
    const nextSelected = isSingleAnswer
      ? [index]
      : selected.includes(index)
        ? selected.filter((selectedIndex) => selectedIndex !== index)
        : [...selected, index];

    setSelected(nextSelected);
    setIsChecked(false);
    dispatch(setUserAnswer({
      questionId: question.id,
      answer: normalizeOptionAnswer(nextSelected, question),
    }));
  };

  const handleMatchingChange = (rightIndex, displayedLeftIndex) => {
    const nextMatching = { ...matching };

    if (displayedLeftIndex === '') {
      delete nextMatching[rightIndex];
    } else {
      nextMatching[rightIndex] = Number(displayedLeftIndex);
    }

    setMatching(nextMatching);
    setIsChecked(false);
    dispatch(setUserAnswer({
      questionId: question.id,
      answer: normalizeMatchingAnswer(nextMatching, question),
    }));
  };

  const handleCheckAnswer = () => {
    /* istanbul ignore else -- the check button is disabled until an answer exists */
    if (hasAnswer) {
      setIsChecked(true);
    }
  };

  return (
    <div className={styles.questionBlock}>
      {mode === 'wrong' && (
        <div className={styles.errorInfo}>
          Повтор ошибок: {wrongQuestions.length} вопрос(ов)
        </div>
      )}

      <h3 className={styles.questionText}>{question.question}</h3>

      {isMatching ? (
        <div className={styles.matchingContainer}>
          <p className={styles.matchingInstruction}>
            <strong>Сопоставьте элементы:</strong>
          </p>

          {question.right.map((item, rightIndex) => (
            <div
              key={rightIndex}
              className={[
                styles.matchingRow,
                isChecked && normalizedMatching[rightIndex] === getCorrectMatchingIndex(question, rightIndex)
                  ? styles.correctAnswer
                  : '',
                isChecked && normalizedMatching[rightIndex] !== getCorrectMatchingIndex(question, rightIndex)
                  ? styles.wrongAnswer
                  : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={styles.matchingRight}>{item}</span>
              <select
                className={styles.matchingSelect}
                value={matching[rightIndex] ?? ''}
                onChange={(event) => handleMatchingChange(rightIndex, event.target.value)}
              >
                <option value="">--</option>
                {question.left.map((description, leftIndex) => (
                  <option key={leftIndex} value={leftIndex}>
                    {description}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.options}>
          {question.options.map((option, index) => {
            const originalIndex = question.optionIndexMap[index];
            const isCorrectOption = correctOptionIndices.includes(originalIndex);
            const isSelectedOption = selected.includes(index);

            return (
              <label
                key={index}
                className={[
                  styles.optionLabel,
                  isChecked && isCorrectOption ? styles.correctAnswer : '',
                  isChecked && isSelectedOption && !isCorrectOption ? styles.wrongAnswer : '',
                ].filter(Boolean).join(' ')}
              >
                <input
                  type={isSingleAnswer ? 'radio' : 'checkbox'}
                  name={`question-${question.id}`}
                  checked={isSelectedOption}
                  onChange={() => handleOptionChange(index)}
                  className={styles.optionInput}
                />
                <span className={styles.optionText}>{option}</span>
              </label>
            );
          })}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleCheckAnswer}
          disabled={!hasAnswer}
          className={styles.checkButton}
        >
          Проверить
        </button>
      </div>

      {isChecked && (
        <div className={`${styles.result} ${isAnswerCorrect ? styles.resultSuccess : styles.resultError}`}>
          <p className={styles.resultTitle}>{isAnswerCorrect ? 'Ответ верный.' : 'Ответ неверный.'}</p>
          <div className={styles.feedbackTableWrapper}>
            <table className={styles.feedbackTable}>
              <thead>
                <tr>
                  <th>{isMatching ? 'Элемент задания' : 'Вариант ответа'}</th>
                  <th>Ваш ответ</th>
                  <th>Правильный ответ</th>
                </tr>
              </thead>
              <tbody>
                {(isMatching ? matchingFeedbackRows : optionFeedbackRows).map((row) => (
                  <tr
                    key={row.key}
                    className={[
                      row.isCorrectOption ? styles.feedbackCorrectRow : '',
                      row.isWrongAnswer ? styles.feedbackWrongRow : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <td>{row.item}</td>
                    <td>{row.userAnswer}</td>
                    <td>{row.correctAnswer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Question;
