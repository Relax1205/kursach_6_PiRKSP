import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { resultsAPI, testsAPI } from '../../services/api';
import styles from './Profile.module.css';

const ROLE_LABELS = {
  admin: 'Администратор',
  teacher: 'Преподаватель',
  student: 'Студент',
};

export const getResultPercent = (result) => {
  if (!result?.totalQuestions) {
    return 0;
  }

  return Math.round((result.score / result.totalQuestions) * 100);
};

export const getGrade = (percent) => {
  if (percent >= 90) {
    return { label: 'Отлично', className: styles.excellent };
  }

  if (percent >= 70) {
    return { label: 'Хорошо', className: styles.good };
  }

  if (percent >= 50) {
    return { label: 'Удовл.', className: styles.satisfactory };
  }

  return { label: 'Неудовл.', className: styles.poor };
};

export const hasDuration = (seconds) => {
  return seconds !== null && seconds !== undefined && seconds !== '' && Number.isFinite(Number(seconds));
};

export const formatDuration = (seconds) => {
  if (!hasDuration(seconds)) {
    return 'нет данных';
  }

  const normalizedSeconds = Math.max(0, Number(seconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const restSeconds = normalizedSeconds % 60;

  if (minutes === 0) {
    return `${restSeconds} сек.`;
  }

  return `${minutes} мин. ${restSeconds.toString().padStart(2, '0')} сек.`;
};

export const makeEmptyAnalytics = (test) => ({
  testId: test.id,
  title: test.title,
  totalAttempts: 0,
  averageScore: 0,
  averagePercent: 0,
  averageDurationSeconds: null,
  questionStats: [],
  results: [],
});

export const normalizeAnalytics = (test, stats) => ({
  ...makeEmptyAnalytics(test),
  ...stats,
  testId: Number(stats?.testId || test.id),
  title: test.title,
  totalAttempts: Number(stats?.totalAttempts || 0),
  averageScore: Number(stats?.averageScore || 0),
  averagePercent: Number(stats?.averagePercent || 0),
  averageDurationSeconds: stats?.averageDurationSeconds ?? null,
  questionStats: Array.isArray(stats?.questionStats) ? stats.questionStats : [],
  results: Array.isArray(stats?.results) ? stats.results : [],
});

export const sanitizeReportFileName = (value) => {
  return String(value || 'report')
    .replace(/[^\wа-яё-]+/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
};

export const getNextAnalyticsId = (analytics, currentId) => {
  if (analytics.length === 0) {
    return '';
  }

  const hasCurrent = analytics.some((analyticsItem) => String(analyticsItem.testId) === String(currentId));
  return hasCurrent ? currentId : String(analytics[0].testId);
};

function Profile() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState('');
  const canViewTeacherAnalytics = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    const loadResults = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await resultsAPI.getMy();
        setResults(response.data);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!isAuthenticated || !canViewTeacherAnalytics) {
        setAnalytics([]);
        setAnalyticsLoading(false);
        return;
      }

      try {
        setAnalyticsLoading(true);
        setAnalyticsError('');

        const testsResponse = await testsAPI.getManageable();
        const teacherTests = testsResponse.data || [];
        const analyticsData = await Promise.all(
          teacherTests.map(async (test) => {
            try {
              const statsResponse = await resultsAPI.getStats(test.id);
              return normalizeAnalytics(test, statsResponse.data);
            } catch (error) {
              console.error('Failed to load test statistics:', error);
              return makeEmptyAnalytics(test);
            }
          })
        );

        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setAnalyticsError('Не удалось загрузить аналитику преподавателя.');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, [canViewTeacherAnalytics, isAuthenticated]);

  useEffect(() => {
    setSelectedAnalyticsId((currentId) => getNextAnalyticsId(analytics, currentId));
  }, [analytics]);

  const selectedAnalytics = useMemo(() => {
    return analytics.find((analyticsItem) => String(analyticsItem.testId) === String(selectedAnalyticsId)) || null;
  }, [analytics, selectedAnalyticsId]);

  const averageScoreChartData = useMemo(() => {
    return analytics.map((analyticsItem, index) => ({
      label: `#${index + 1}`,
      title: analyticsItem.title,
      averagePercent: analyticsItem.averagePercent,
      attempts: analyticsItem.totalAttempts,
    }));
  }, [analytics]);

  const questionChartData = useMemo(() => {
    if (!selectedAnalytics) {
      return [];
    }

    return selectedAnalytics.questionStats.map((questionStat, index) => ({
      label: `В${index + 1}`,
      questionText: questionStat.questionText,
      correctPercent: questionStat.correctPercent,
      incorrectPercent: Math.max(0, 100 - questionStat.correctPercent),
      correctCount: questionStat.correctCount,
      incorrectCount: questionStat.incorrectCount,
    }));
  }, [selectedAnalytics]);

  const durationChartData = useMemo(() => {
    if (!selectedAnalytics) {
      return [];
    }

    return selectedAnalytics.results.map((result, index) => ({
      label: `#${index + 1}`,
      student: result.user?.name || `Пользователь #${result.userId}`,
      durationMinutes: hasDuration(result.durationSeconds)
        ? Math.round((Number(result.durationSeconds) / 60) * 10) / 10
        : null,
      percent: Number.isFinite(Number(result.percent)) ? Number(result.percent) : getResultPercent(result),
      completedAt: result.completedAt,
    }));
  }, [selectedAnalytics]);

  const exportAnalyticsToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const summaryRows = analytics.map((analyticsItem) => ({
      Тест: analyticsItem.title,
      Попытки: analyticsItem.totalAttempts,
      'Средний балл, %': analyticsItem.averagePercent,
      'Средний балл': analyticsItem.averageScore,
      'Среднее время': formatDuration(analyticsItem.averageDurationSeconds),
    }));
    const questionRows = analytics.flatMap((analyticsItem) => (
      analyticsItem.questionStats.map((questionStat, index) => ({
        Тест: analyticsItem.title,
        Вопрос: index + 1,
        Текст: questionStat.questionText,
        'Верных ответов': questionStat.correctCount,
        'Ошибок': questionStat.incorrectCount,
        'Верно, %': questionStat.correctPercent,
      }))
    ));
    const attemptRows = analytics.flatMap((analyticsItem) => (
      analyticsItem.results.map((result, index) => ({
        Тест: analyticsItem.title,
        Попытка: index + 1,
        Пользователь: result.user?.name || `#${result.userId}`,
        Email: result.user?.email || '',
        Балл: result.score,
        'Всего вопросов': result.totalQuestions,
        Процент: Number.isFinite(Number(result.percent)) ? Number(result.percent) : getResultPercent(result),
        Время: formatDuration(result.durationSeconds),
        Дата: result.completedAt ? new Date(result.completedAt).toLocaleString('ru-RU') : '',
      }))
    ));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(questionRows), 'Question Stats');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(attemptRows), 'Attempts');
    XLSX.writeFile(workbook, `teacher-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportSelectedAnalyticsToPdf = () => {
    const doc = new jsPDF();
    const margin = 14;
    let y = 18;
    const addText = (text, fontSize = 11, gap = 7) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, margin, y);
      y += lines.length * gap;
    };

    addText('Отчет по результатам теста', 16, 8);
    addText(`Тест: ${selectedAnalytics.title}`);
    addText(`Попыток: ${selectedAnalytics.totalAttempts}`);
    addText(`Средний балл: ${selectedAnalytics.averagePercent}%`);
    addText(`Среднее время прохождения: ${formatDuration(selectedAnalytics.averageDurationSeconds)}`);
    y += 4;
    addText('Распределение по вопросам', 13, 8);

    selectedAnalytics.questionStats.forEach((questionStat, index) => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }

      addText(
        `${index + 1}. ${questionStat.questionText} - ${questionStat.correctPercent}% верных ответов (${questionStat.correctCount}/${questionStat.totalAnswers})`,
        10,
        6
      );
    });

    if (selectedAnalytics.results.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      y += 4;
      addText('Последние попытки', 13, 8);
      selectedAnalytics.results.slice(-10).forEach((result, index) => {
        addText(
          `${index + 1}. ${result.user?.name || `#${result.userId}`}: ${result.score}/${result.totalQuestions}, ${formatDuration(result.durationSeconds)}`,
          10,
          6
        );
      });
    }

    doc.save(`${sanitizeReportFileName(selectedAnalytics.title)}-report.pdf`);
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <p>Пожалуйста, войдите в систему для просмотра профиля.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <h1>Профиль пользователя</h1>

        <div className={styles.userInfo}>
          <div className={styles.infoItem}>
            <strong>Имя:</strong> {user?.name}
          </div>
          <div className={styles.infoItem}>
            <strong>Email:</strong> {user?.email}
          </div>
          <div className={styles.infoItem}>
            <strong>Роль:</strong>
            <span className={`${styles.role} ${styles[user?.role]}`}>
              {ROLE_LABELS[user?.role]}
            </span>
          </div>
          <div className={styles.infoItem}>
            <strong>Дата регистрации:</strong> {new Date(user?.createdAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>

      {canViewTeacherAnalytics && (
        <section className={styles.analyticsSection}>
          <div className={styles.sectionHeader}>
            <h2>Аналитика преподавателя</h2>
            <div className={styles.exportActions}>
              <button
                type="button"
                onClick={selectedAnalytics ? exportSelectedAnalyticsToPdf : undefined}
                disabled={!selectedAnalytics}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={analytics.length > 0 ? exportAnalyticsToExcel : undefined}
                disabled={analytics.length === 0}
              >
                Excel
              </button>
            </div>
          </div>

          {analyticsLoading ? (
            <p>Загрузка аналитики...</p>
          ) : analyticsError ? (
            <p className={styles.empty}>{analyticsError}</p>
          ) : analytics.length === 0 ? (
            <p className={styles.empty}>У вас пока нет тестов для аналитики.</p>
          ) : (
            <>
              <div className={styles.analyticsControls}>
                <label>
                  <span>Детализация по тесту</span>
                  <select
                    value={selectedAnalyticsId}
                    onChange={(event) => setSelectedAnalyticsId(event.target.value)}
                  >
                    {analytics.map((analyticsItem) => (
                      <option key={analyticsItem.testId} value={analyticsItem.testId}>
                        {analyticsItem.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.metricGrid}>
                <div>
                  <span>Всего попыток</span>
                  <strong>{analytics.reduce((sum, analyticsItem) => sum + analyticsItem.totalAttempts, 0)}</strong>
                </div>
                <div>
                  <span>Средний балл</span>
                  <strong>{selectedAnalytics?.averagePercent || 0}%</strong>
                </div>
                <div>
                  <span>Среднее время</span>
                  <strong>{formatDuration(selectedAnalytics?.averageDurationSeconds)}</strong>
                </div>
              </div>

              <div className={styles.chartGrid}>
                <div className={styles.chartPanel}>
                  <h3>Средний балл по тестам</h3>
                  <div className={styles.chartArea}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={averageScoreChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <Bar dataKey="averagePercent" name="Средний балл" fill="#2f80ed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.chartPanel}>
                  <h3>Распределение по вопросам</h3>
                  <div className={styles.chartArea}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={questionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="correctPercent" name="Верно" stackId="answers" fill="#2e7d32" />
                        <Bar dataKey="incorrectPercent" name="Ошибки" stackId="answers" fill="#c62828" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.chartPanelWide}>
                  <h3>Время прохождения и результат</h3>
                  <div className={styles.chartArea}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={durationChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis yAxisId="left" unit=" мин." />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="durationMinutes" name="Время" stroke="#8a5a00" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="percent" name="Результат" stroke="#2f80ed" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <div className={styles.resultsSection}>
        <h2>Мои результаты тестов</h2>

        {loading ? (
          <p>Загрузка результатов...</p>
        ) : results.length === 0 ? (
          <p className={styles.empty}>Вы пока не проходили тесты</p>
        ) : (
          <div className={styles.resultsList}>
            {results.map((result) => {
              const percent = getResultPercent(result);
              const grade = getGrade(percent);

              return (
                <div key={result.id} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <h3>{result.test?.title || `Тест #${result.testId}`}</h3>
                    <span className={`${styles.grade} ${grade.className}`}>{grade.label}</span>
                  </div>
                  <div className={styles.resultBody}>
                    <div className={styles.score}>
                      Правильных ответов: <strong>{result.score} из {result.totalQuestions}</strong>
                    </div>
                    <div className={styles.percent}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span>{percent}%</span>
                    </div>
                    {hasDuration(result.durationSeconds) && (
                      <div className={styles.date}>
                        Время прохождения: {formatDuration(result.durationSeconds)}
                      </div>
                    )}
                    <div className={styles.date}>
                      {new Date(result.completedAt).toLocaleString('ru-RU')}
                    </div>
                    {result.score < result.totalQuestions && result.test?.id && (
                      <Link
                        to={`/test/${result.test.id}?mistakes=${result.id}`}
                        className={styles.retryLink}
                      >
                        Повторить ошибки
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
