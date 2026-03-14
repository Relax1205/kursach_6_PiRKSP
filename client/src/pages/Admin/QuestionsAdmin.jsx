import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { testsAPI } from '../../services/api';
import styles from './QuestionsAdmin.module.css';

function QuestionsAdmin() {
  const { user } = useSelector((state) => state.auth);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    type: 'single',
    options: ['', '', '', ''],
    correct: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'teacher' || user?.role === 'admin') {
      loadTests();
    }
  }, [user]);

  const loadTests = async () => {
    try {
      const response = await testsAPI.getAll();
      setTests(response.data);
      if (response.data.length > 0) {
        setSelectedTest(response.data[0]);
        loadQuestions(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (testId) => {
    try {
      const response = await testsAPI.getQuestions(testId);
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleTestChange = (e) => {
    const test = tests.find(t => t.id === parseInt(e.target.value));
    setSelectedTest(test);
    if (test) {
      loadQuestions(test.id);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleCorrectChange = (index) => {
    const newCorrect = formData.type === 'single' 
      ? [index] 
      : formData.correct.includes(index)
        ? formData.correct.filter(i => i !== index)
        : [...formData.correct, index];
    setFormData({ ...formData, correct: newCorrect });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const questionData = {
      testId: selectedTest.id,
      type: formData.type,
      question: formData.question,
      options: formData.options.filter(o => o),
      correct: formData.correct
    };

    try {
      await testsAPI.create({ 
        title: selectedTest.title, 
        questions: [questionData] 
      });
      alert('✅ Вопрос добавлен!');
      setShowForm(false);
      loadQuestions(selectedTest.id);
      setFormData({
        question: '',
        type: 'single',
        options: ['', '', '', ''],
        correct: []
      });
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>⛔ Доступ только для преподавателей</div>
      </div>
    );
  }

  if (loading) return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>;

  return (
    <div className={styles.container}>
      <h1>📝 Управление вопросами</h1>
      
      <div className={styles.controls}>
        <label>Выберите тест: </label>
        <select value={selectedTest?.id || ''} onChange={handleTestChange}>
          {tests.map(test => (
            <option key={test.id} value={test.id}>{test.title}</option>
          ))}
        </select>
        
        <button onClick={() => setShowForm(!showForm)} className={styles.addButton}>
          {showForm ? '✕ Отмена' : '➕ Добавить вопрос'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Тип вопроса:</label>
            <select 
              value={formData.type} 
              onChange={(e) => setFormData({...formData, type: e.target.value, correct: []})}
            >
              <option value="single">Один правильный ответ</option>
              <option value="multiple">Несколько правильных ответов</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Вопрос:</label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({...formData, question: e.target.value})}
              required
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Варианты ответов (отметьте правильные):</label>
            {formData.options.map((option, index) => (
              <div key={index} className={styles.optionRow}>
                <input
                  type={formData.type === 'single' ? 'radio' : 'checkbox'}
                  name="correct"
                  checked={formData.correct.includes(index)}
                  onChange={() => handleCorrectChange(index)}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Вариант ${index + 1}`}
                  required
                />
              </div>
            ))}
          </div>

          <button type="submit" className={styles.submitButton}>💾 Сохранить</button>
        </form>
      )}

      <div className={styles.questionsList}>
        <h2>📋 Вопросы в тесте ({questions.length})</h2>
        {questions.length === 0 ? (
          <p className={styles.empty}>Вопросов пока нет</p>
        ) : (
          questions.map((q, index) => (
            <div key={q.id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span className={styles.number}>#{index + 1}</span>
                <span className={styles.type}>{q.type}</span>
              </div>
              <p className={styles.questionText}>{q.questionText}</p>
              {q.options && (
                <div className={styles.options}>
                  {q.options.map((opt, i) => (
                    <div 
                      key={i} 
                      className={`${styles.option} ${q.correct.includes(i) ? styles.correct : ''}`}
                    >
                      {opt} {q.correct.includes(i) && '✅'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default QuestionsAdmin;