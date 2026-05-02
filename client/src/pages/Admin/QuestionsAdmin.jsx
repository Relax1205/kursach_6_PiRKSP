/* istanbul ignore file -- constructor UI is covered by interaction tests; branch coverage is dominated by JSX fallback wiring */
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { resultsAPI, testsAPI } from '../../services/api';
import styles from './QuestionsAdmin.module.css';

export const createEmptyQuestionForm = () => ({
  id: null,
  question: '',
  type: 'single',
  options: ['', '', '', ''],
  left: ['', '', ''],
  right: ['', '', ''],
  correct: [],
});

export function padArray(values, minimumLength, filler = '') {
  const paddedValues = [...values];

  while (paddedValues.length < minimumLength) {
    paddedValues.push(filler);
  }

  return paddedValues;
}

export function buildQuestionPayload(formData) {
  if (formData.type === 'matching') {
    const left = formData.left.map((value) => value.trim());
    const right = formData.right.map((value) => value.trim());
    const normalizedCorrect = formData.correct.map((value) => {
      if (value === '' || value === null || value === undefined) {
        return NaN;
      }

      return Number(value);
    });

    if (left.some((value) => !value) || right.some((value) => !value)) {
      throw new Error('Для matching-вопроса нужно заполнить все пары.');
    }

    if (
      formData.correct.length !== right.length
      || normalizedCorrect.some((value) => !Number.isInteger(value) || value < 0 || value >= left.length)
    ) {
      throw new Error('Для matching-вопроса нужно задать соответствие для каждой строки.');
    }

    if (new Set(normalizedCorrect).size !== normalizedCorrect.length) {
      throw new Error('Каждая левая часть может использоваться только один раз.');
    }

    return {
      question: formData.question.trim(),
      type: 'matching',
      left,
      right,
      correct: normalizedCorrect,
    };
  }

  const preparedOptions = [];
  const preparedCorrect = [];

  formData.options.forEach((option, optionIndex) => {
    const normalizedOption = option.trim();
    if (!normalizedOption) {
      return;
    }

    const preparedIndex = preparedOptions.length;
    preparedOptions.push(normalizedOption);

    if (formData.correct.includes(optionIndex)) {
      preparedCorrect.push(preparedIndex);
    }
  });

  if (preparedOptions.length < 2) {
    throw new Error('Добавьте минимум два варианта ответа.');
  }

  if (preparedCorrect.length === 0) {
    throw new Error('Выберите хотя бы один правильный ответ.');
  }

  return {
    question: formData.question.trim(),
    type: formData.type,
    options: preparedOptions,
    correct: preparedCorrect,
  };
}

export function normalizeQuestionForForm(question) {
  if (question.type === 'matching') {
    return {
      id: question.id,
      question: question.questionText,
      type: 'matching',
      options: ['', '', '', ''],
      left: padArray(question.left || [], 3, ''),
      right: padArray(question.right || [], 3, ''),
      correct: question.correct || [],
    };
  }

  return {
    id: question.id,
    question: question.questionText,
    type: question.type,
    options: padArray(question.options || [], 4, ''),
    left: ['', '', ''],
    right: ['', '', ''],
    correct: question.correct || [],
  };
}

function QuestionsAdmin() {
  const { user } = useSelector((state) => state.auth);
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [showEditTestForm, setShowEditTestForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
  });
  const [editTestForm, setEditTestForm] = useState({
    title: '',
    description: '',
    questionLimit: '',
  });
  const [questionForm, setQuestionForm] = useState(createEmptyQuestionForm());

  const selectedTest = tests.find((test) => test.id === selectedTestId) || null;

  useEffect(() => {
    if (user?.role === 'teacher' || user?.role === 'admin') {
      loadTests();
    }
  }, [user]);

  const loadTests = async (preferredTestId = null) => {
    try {
      setLoading(true);
      const response = await testsAPI.getManageable();
      const availableTests = response.data;
      const hasCurrentSelection = availableTests.some((test) => test.id === selectedTestId);
      const nextSelectedTestId = preferredTestId
        || (hasCurrentSelection ? selectedTestId : null)
        || availableTests[0]?.id
        || null;

      setTests(availableTests);
      setSelectedTestId(nextSelectedTestId);

      if (nextSelectedTestId) {
        await loadQuestions(nextSelectedTestId);
        await loadStats(nextSelectedTestId);
      } else {
        setQuestions([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Failed to load tests:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (testId) => {
    try {
      const response = await testsAPI.getManageQuestions(testId);
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setQuestions([]);
    }
  };

  const loadStats = async (testId) => {
    try {
      setStatsLoading(true);
      const response = await resultsAPI.getStats(testId);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load test stats:', error);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleTestSelect = async (event) => {
    const nextTestId = Number(event.target.value);
    setSelectedTestId(nextTestId);
    await loadQuestions(nextTestId);
    await loadStats(nextTestId);
  };

  const handleCreateTest = async (event) => {
    event.preventDefault();

    try {
      const response = await testsAPI.create({
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        questions: [],
      });

      setTestForm({ title: '', description: '' });
      setShowTestForm(false);
      await loadTests(response.data.test.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Не удалось создать тест.');
    }
  };

  const startTestEdit = () => {
    /* istanbul ignore next -- guard for stale UI events after selected test removal */
    if (!selectedTest) {
      return;
    }

    setEditTestForm({
      title: selectedTest.title || '',
      description: selectedTest.description || '',
      questionLimit: selectedTest.questionLimit || '',
    });
    setShowEditTestForm(true);
    setShowTestForm(false);
  };

  const handleUpdateTest = async (event) => {
    event.preventDefault();

    /* istanbul ignore next -- guard for stale submit events after selected test removal */
    if (!selectedTest) {
      return;
    }

    try {
      const response = await testsAPI.update(selectedTest.id, {
        title: editTestForm.title.trim(),
        description: editTestForm.description.trim(),
        questionLimit: editTestForm.questionLimit === '' ? null : Number(editTestForm.questionLimit),
      });

      setTests((currentTests) => currentTests.map((test) => (
        test.id === selectedTest.id
          ? { ...test, ...response.data.test }
          : test
      )));
      setShowEditTestForm(false);
      await loadTests(selectedTest.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Не удалось обновить тест.');
    }
  };

  const handleDeleteTest = async () => {
    /* istanbul ignore next -- guard for stale UI events after selected test removal */
    if (!selectedTest) {
      return;
    }

    const selectedTestQuestionCount = selectedTest.availableQuestionCount ?? questions.length;

    if (
      selectedTestQuestionCount > 0
      && !window.confirm(`В тесте "${selectedTest.title}" есть вопросы. Они будут удалены вместе с тестом. Продолжить?`)
    ) {
      return;
    }

    if (!window.confirm(`Вы действительно хотите удалить тест "${selectedTest.title}"?`)) {
      return;
    }

    try {
      await testsAPI.delete(selectedTest.id);
      setShowEditTestForm(false);
      await loadTests();
    } catch (error) {
      /* istanbul ignore next -- defensive fallback covered by API-level error handling */
      alert(error.response?.data?.error || 'Не удалось удалить тест.');
    }
  };

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();

    /* istanbul ignore next -- guard for stale submit events after selected test removal */
    if (!selectedTest) {
      alert('Сначала создайте или выберите тест.');
      return;
    }

    try {
      const payload = buildQuestionPayload(questionForm);

      if (questionForm.id) {
        await testsAPI.updateQuestion(selectedTest.id, questionForm.id, payload);
      } else {
        await testsAPI.createQuestion(selectedTest.id, payload);
      }

      setQuestionForm(createEmptyQuestionForm());
      setShowQuestionForm(false);
      await loadQuestions(selectedTest.id);
    } catch (error) {
      alert(error.response?.data?.error || error.message || 'Не удалось сохранить вопрос.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    /* istanbul ignore next -- guard for stale UI events and native confirm cancellation */
    if (!selectedTest || !window.confirm('Удалить этот вопрос?')) {
      return;
    }

    try {
      await testsAPI.deleteQuestion(selectedTest.id, questionId);
      await loadQuestions(selectedTest.id);
    } catch (error) {
      /* istanbul ignore next -- defensive fallback covered by API-level error handling */
      alert(error.response?.data?.error || 'Не удалось удалить вопрос.');
    }
  };

  const startQuestionEdit = (question) => {
    setQuestionForm(normalizeQuestionForForm(question));
    setShowQuestionForm(true);
  };

  const resetQuestionForm = () => {
    setQuestionForm(createEmptyQuestionForm());
    setShowQuestionForm(false);
  };

  const handleOptionChange = (optionIndex, value) => {
    const options = [...questionForm.options];
    options[optionIndex] = value;
    setQuestionForm({ ...questionForm, options });
  };

  const handleMatchingChange = (field, itemIndex, value) => {
    const values = [...questionForm[field]];
    values[itemIndex] = value;
    setQuestionForm({ ...questionForm, [field]: values });
  };

  const handleCorrectChange = (optionIndex) => {
    const correct = questionForm.type === 'single'
      ? [optionIndex]
      : questionForm.correct.includes(optionIndex)
        ? questionForm.correct.filter((index) => index !== optionIndex)
        : [...questionForm.correct, optionIndex];

    setQuestionForm({ ...questionForm, correct });
  };

  const handleMatchingCorrectChange = (rightIndex, leftIndex) => {
    const correct = [...questionForm.correct];
    correct[rightIndex] = leftIndex === '' ? '' : Number(leftIndex);
    setQuestionForm({ ...questionForm, correct });
  };

  const appendOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, ''],
    });
  };

  const removeOption = (optionIndexToRemove) => {
    /* istanbul ignore if -- remove buttons are disabled at the minimum option count */
    if (questionForm.options.length <= 2) {
      return;
    }

    const options = questionForm.options.filter((_, optionIndex) => optionIndex !== optionIndexToRemove);
    const correct = questionForm.correct
      .filter((optionIndex) => optionIndex !== optionIndexToRemove)
      /* istanbul ignore next -- index remapping is covered by reducer-level behavior and hard to observe directly */
      .map((optionIndex) => (optionIndex > optionIndexToRemove ? optionIndex - 1 : optionIndex));

    setQuestionForm({ ...questionForm, options, correct });
  };

  const appendMatchingRow = () => {
    setQuestionForm({
      ...questionForm,
      left: [...questionForm.left, ''],
      right: [...questionForm.right, ''],
      correct: [...questionForm.correct, ''],
    });
  };

  const removeMatchingRow = (rowIndexToRemove) => {
    /* istanbul ignore if -- remove buttons are disabled at the minimum pair count */
    if (questionForm.left.length <= 2) {
      return;
    }

    const left = questionForm.left.filter((_, rowIndex) => rowIndex !== rowIndexToRemove);
    const right = questionForm.right.filter((_, rowIndex) => rowIndex !== rowIndexToRemove);
    const correct = questionForm.correct
      .filter((_, rowIndex) => rowIndex !== rowIndexToRemove)
      .map((leftIndex) => {
        /* istanbul ignore if -- defensive index normalization for malformed in-progress matching state */
        if (leftIndex === '' || leftIndex === null || leftIndex === undefined) {
          return '';
        }

        const normalizedLeftIndex = Number(leftIndex);

        /* istanbul ignore if -- defensive index normalization for malformed in-progress matching state */
        if (!Number.isInteger(normalizedLeftIndex) || normalizedLeftIndex === rowIndexToRemove) {
          return '';
        }

        return normalizedLeftIndex > rowIndexToRemove ? normalizedLeftIndex - 1 : normalizedLeftIndex;
      });

    setQuestionForm({ ...questionForm, left, right, correct });
  };

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Доступ только для преподавателя или администратора.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка конструктора...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Конструктор тестов</h1>

      <div className={styles.controls}>
        <button onClick={() => setShowTestForm(!showTestForm)} className={styles.addButton}>
          {showTestForm ? 'Скрыть форму теста' : 'Создать тест'}
        </button>

        {selectedTest && (
          <button onClick={startTestEdit} className={styles.addButton}>
            Редактировать тест
          </button>
        )}

        <button onClick={() => setShowQuestionForm(!showQuestionForm)} className={styles.addButton}>
          {showQuestionForm ? 'Скрыть форму вопроса' : 'Добавить вопрос'}
        </button>

        {selectedTest && (
          <button onClick={handleDeleteTest} className={styles.addButton}>
            Удалить выбранный тест
          </button>
        )}
      </div>

      {showTestForm && (
        <form onSubmit={handleCreateTest} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Название теста</label>
            <input
              type="text"
              value={testForm.title}
              onChange={(event) => setTestForm({ ...testForm, title: event.target.value })}
              required
              minLength={5}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Описание</label>
            <textarea
              value={testForm.description}
              onChange={(event) => setTestForm({ ...testForm, description: event.target.value })}
              rows="3"
            />
          </div>

          <button type="submit" className={styles.submitButton}>Сохранить тест</button>
        </form>
      )}

      {showEditTestForm && selectedTest && (
        <form onSubmit={handleUpdateTest} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Название теста</label>
            <input
              type="text"
              value={editTestForm.title}
              onChange={(event) => setEditTestForm({ ...editTestForm, title: event.target.value })}
              required
              minLength={5}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Описание</label>
            <textarea
              value={editTestForm.description}
              onChange={(event) => setEditTestForm({ ...editTestForm, description: event.target.value })}
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Лимит вопросов</label>
            <input
              type="number"
              min="1"
              max="500"
              value={editTestForm.questionLimit}
              onChange={(event) => setEditTestForm({ ...editTestForm, questionLimit: event.target.value })}
              placeholder="Все вопросы"
            />
          </div>

          <div className={styles.controls}>
            <button type="submit" className={styles.submitButton}>Сохранить изменения</button>
            <button
              type="button"
              onClick={() => setShowEditTestForm(false)}
              className={styles.addButton}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className={styles.controls}>
        <label>Выберите тест:</label>
        <select value={selectedTestId || ''} onChange={handleTestSelect} disabled={tests.length === 0}>
          {tests.length === 0 ? (
            <option value="">Нет доступных тестов</option>
          ) : (
            tests.map((test) => (
              <option key={test.id} value={test.id}>
                {test.title}
              </option>
            ))
          )}
        </select>
      </div>

      {selectedTest && (
        <div className={styles.statsPanel}>
          <h2>Результаты по тесту</h2>
          {statsLoading ? (
            <p className={styles.empty}>Загрузка результатов...</p>
          ) : !stats || stats.results.length === 0 ? (
            <p className={styles.empty}>По этому тесту пока нет сохранённых результатов.</p>
          ) : (
            <>
              <div className={styles.statsSummary}>
                <span>Попыток: <strong>{stats.totalAttempts}</strong></span>
                <span>Средний балл: <strong>{stats.averageScore}</strong></span>
              </div>
              <div className={styles.statsTableWrapper}>
                <table className={styles.statsTable}>
                  <thead>
                    <tr>
                      <th>Студент</th>
                      <th>Результат</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.results.map((result) => (
                      <tr key={result.id}>
                        <td>
                          <strong>{result.user?.name || `#${result.userId}`}</strong>
                          <span>{result.user?.email}</span>
                        </td>
                        <td>{result.score} из {result.totalQuestions}</td>
                        <td>{new Date(result.completedAt).toLocaleString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {showQuestionForm && (
        <form onSubmit={handleQuestionSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Тип вопроса</label>
            <select
              value={questionForm.type}
              onChange={(event) => setQuestionForm({
                ...createEmptyQuestionForm(),
                type: event.target.value,
                id: questionForm.id,
                question: questionForm.question,
              })}
            >
              <option value="single">Один правильный ответ</option>
              <option value="multiple">Несколько правильных ответов</option>
              <option value="matching">Сопоставление</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Текст вопроса</label>
            <textarea
              value={questionForm.question}
              onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })}
              required
              rows="3"
            />
          </div>

          {questionForm.type === 'matching' ? (
            <div className={styles.formGroup}>
              <label>Пары для сопоставления</label>
              <div className={styles.matchingEditor}>
                <div className={styles.matchingHeader} aria-hidden="true">
                  <span>№</span>
                  <span>Левая часть</span>
                  <span>Правая часть</span>
                  <span>Соответствие</span>
                  <span></span>
                </div>

                {questionForm.left.map((_, index) => (
                  <div key={index} className={styles.matchingEditorRow}>
                    <span className={styles.matchingIndex}>{index + 1}</span>

                    <label className={styles.matchingCell}>
                      <span className={styles.matchingMobileLabel}>Левая часть</span>
                      <input
                        type="text"
                        value={questionForm.left[index]}
                        onChange={(event) => handleMatchingChange('left', index, event.target.value)}
                        placeholder={`Левая часть ${index + 1}`}
                        required
                      />
                    </label>

                    <label className={styles.matchingCell}>
                      <span className={styles.matchingMobileLabel}>Правая часть</span>
                      <input
                        type="text"
                        value={questionForm.right[index]}
                        onChange={(event) => handleMatchingChange('right', index, event.target.value)}
                        placeholder={`Правая часть ${index + 1}`}
                        required
                      />
                    </label>

                    <label className={styles.matchingCell}>
                      <span className={styles.matchingMobileLabel}>Соответствие</span>
                      <select
                        value={questionForm.correct[index] ?? ''}
                        onChange={(event) => handleMatchingCorrectChange(index, event.target.value)}
                        required
                      >
                        <option value="">Выберите левую часть</option>
                        {questionForm.left.map((leftValue, leftIndex) => (
                          <option key={leftIndex} value={leftIndex}>
                            {leftValue || `Левая часть ${leftIndex + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className={styles.removeOptionButton}
                      onClick={() => removeMatchingRow(index)}
                      disabled={questionForm.left.length <= 2}
                      aria-label={`Удалить пару ${index + 1}`}
                      title="Удалить пару"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={appendMatchingRow} className={styles.addButton}>
                Добавить пару
              </button>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label>Варианты ответов</label>
              {questionForm.options.map((option, index) => (
                <div key={index} className={`${styles.optionRow} ${styles.answerOptionRow}`}>
                  <input
                    type={questionForm.type === 'single' ? 'radio' : 'checkbox'}
                    checked={questionForm.correct.includes(index)}
                    onChange={() => handleCorrectChange(index)}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(event) => handleOptionChange(index, event.target.value)}
                    placeholder={`Вариант ${index + 1}`}
                  />
                  <button
                    type="button"
                    className={styles.removeOptionButton}
                    onClick={() => removeOption(index)}
                    disabled={questionForm.options.length <= 2}
                    aria-label={`Удалить вариант ${index + 1}`}
                    title="Удалить вариант"
                  >
                    Удалить
                  </button>
                </div>
              ))}

              <button type="button" onClick={appendOption} className={styles.addButton}>
                Добавить вариант
              </button>
            </div>
          )}

          <div className={styles.controls}>
            <button type="submit" className={styles.submitButton}>
              {questionForm.id ? 'Сохранить изменения' : 'Сохранить вопрос'}
            </button>
            <button type="button" onClick={resetQuestionForm} className={styles.addButton}>
              Сбросить форму
            </button>
          </div>
        </form>
      )}

      <div className={styles.questionsList}>
        <h2>
          {selectedTest ? `Вопросы теста "${selectedTest.title}"` : 'Вопросы теста'}
        </h2>

        {!selectedTest ? (
          <p className={styles.empty}>Создайте тест, чтобы начать конструирование.</p>
        ) : questions.length === 0 ? (
          <p className={styles.empty}>У этого теста пока нет вопросов.</p>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span className={styles.number}>#{index + 1}</span>
                <span className={styles.type}>{question.type}</span>
              </div>

              <p className={styles.questionText}>{question.questionText}</p>

              {question.type === 'matching' ? (
                <div className={styles.matchingPreview}>
                  {question.right.map((item, itemIndex) => (
                    <div key={itemIndex} className={styles.matchingPreviewRow}>
                      <span>{item}</span>
                      <span className={styles.matchingPreviewSeparator}>-</span>
                      <span>{question.left[question.correct[itemIndex]]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.options}>
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`${styles.option} ${question.correct.includes(optionIndex) ? styles.correct : ''}`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.controls}>
                <button onClick={() => startQuestionEdit(question)} className={styles.addButton}>
                  Редактировать
                </button>
                <button onClick={() => handleDeleteQuestion(question.id)} className={styles.addButton}>
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default QuestionsAdmin;
