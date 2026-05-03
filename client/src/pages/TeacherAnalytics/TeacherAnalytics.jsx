import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import * as XLSX from 'xlsx';
import { resultsAPI } from '../../services/api';
import styles from './TeacherAnalytics.module.css';

const EMPTY_TEACHER_REPORT = {
  totalAttempts: 0,
  tests: [],
  results: [],
};

const TEACHER_GROUPING_LABELS = {
  student: 'По студентам',
  test: 'По тестам',
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

export const formatDate = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString('ru-RU');
};

export const getResultPercent = (result) => {
  if (!result?.totalQuestions) {
    return 0;
  }

  return Math.round((result.score / result.totalQuestions) * 100);
};

export const normalizeTeacherReport = (report) => ({
  totalAttempts: Number(report?.totalAttempts || 0),
  tests: Array.isArray(report?.tests) ? report.tests : [],
  results: Array.isArray(report?.results) ? report.results : [],
});

export const getStudentName = (result) => {
  return result?.student?.name || `Студент #${result?.student?.id || result?.resultId || '-'}`;
};

export const getCorrectAnswersCount = (result) => {
  const numericValue = Number(result?.correctAnswerCount ?? result?.score ?? 0);

  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
};

export const getIncorrectAnswersCount = (result) => {
  const numericValue = Number(result?.incorrectAnswerCount);

  if (Number.isFinite(numericValue)) {
    return Math.max(0, numericValue);
  }

  const totalQuestions = Number(result?.totalQuestions ?? 0);

  if (!Number.isFinite(totalQuestions)) {
    return 0;
  }

  return Math.max(0, totalQuestions - getCorrectAnswersCount(result));
};

const getAverageDurationSeconds = (results) => {
  const durationValues = results
    .filter((result) => hasDuration(result.durationSeconds))
    .map((result) => Number(result.durationSeconds));

  if (durationValues.length === 0) {
    return null;
  }

  return Math.round(durationValues.reduce((sum, durationSeconds) => sum + durationSeconds, 0) / durationValues.length);
};

const getResultPercentValue = (result) => {
  const percent = Number(result?.percent);

  return Number.isFinite(percent) ? percent : getResultPercent(result);
};

const normalizeReportText = (value) => {
  return String(value ?? '').replace(/\u2192/g, '->');
};

export const buildTeacherAnalyticsGroups = (report, grouping = 'student') => {
  const results = normalizeTeacherReport(report).results;
  const groupByStudent = grouping !== 'test';
  const groupsByKey = new Map();

  results.forEach((result) => {
    const title = groupByStudent ? getStudentName(result) : result.testTitle || `Тест #${result.testId || '-'}`;
    const subtitle = groupByStudent ? result.student?.email || '' : '';
    const id = groupByStudent ? result.student?.id || title : result.testId || title;
    const key = `${groupByStudent ? 'student' : 'test'}-${id}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        title,
        subtitle,
        results: [],
      });
    }

    groupsByKey.get(key).results.push(result);
  });

  return Array.from(groupsByKey.values()).map((group) => {
    const correctTotal = group.results.reduce((sum, result) => sum + getCorrectAnswersCount(result), 0);
    const incorrectTotal = group.results.reduce((sum, result) => sum + getIncorrectAnswersCount(result), 0);
    const averagePercent = Math.round(
      group.results.reduce((sum, result) => sum + getResultPercentValue(result), 0) / group.results.length
    );

    return {
      ...group,
      attempts: group.results.length,
      correctTotal,
      incorrectTotal,
      averagePercent,
      averageDurationSeconds: getAverageDurationSeconds(group.results),
    };
  });
};

export const getCorrectAnswersText = (result) => {
  if (!Array.isArray(result?.correctAnswers) || result.correctAnswers.length === 0) {
    return 'Нет верных ответов';
  }

  return result.correctAnswers
    .map((answerDetail) => `${normalizeReportText(answerDetail.questionText)}: ${normalizeReportText(answerDetail.correctAnswer)}`)
    .join('; ');
};

export const getAnswerDetailsText = (result) => {
  if (!Array.isArray(result?.answerDetails) || result.answerDetails.length === 0) {
    return 'Нет данных по ответам';
  }

  return result.answerDetails
    .map((answerDetail) => (
      `${answerDetail.isCorrect ? 'Верно' : 'Ошибка'}: ${normalizeReportText(answerDetail.questionText)}. `
      + `Ответ студента: ${normalizeReportText(answerDetail.studentAnswer)}. `
      + `Верный ответ: ${normalizeReportText(answerDetail.correctAnswer)}`
    ))
    .join('\n');
};

export const buildPerformanceRows = (report) => {
  return normalizeTeacherReport(report).results.map((result) => ({
    Студент: getStudentName(result),
    Email: result.student?.email || '',
    Тест: result.testTitle,
    'Правильных вопросов': getCorrectAnswersCount(result),
    'Неправильных вопросов': getIncorrectAnswersCount(result),
    'Всего вопросов': result.totalQuestions,
    Процент: result.percent,
    Время: formatDuration(result.durationSeconds),
    Дата: formatDate(result.completedAt),
  }));
};

export const buildAnswerRows = (report) => {
  return normalizeTeacherReport(report).results.flatMap((result) => (
    (Array.isArray(result.answerDetails) ? result.answerDetails : []).map((answerDetail) => ({
      Студент: getStudentName(result),
      Email: result.student?.email || '',
      Тест: result.testTitle,
      Вопрос: normalizeReportText(answerDetail.questionText),
      Статус: answerDetail.isCorrect ? 'Верно' : 'Ошибка',
      'Ответ студента': normalizeReportText(answerDetail.studentAnswer),
      'Верный ответ': normalizeReportText(answerDetail.correctAnswer),
    }))
  ));
};

export const exportPerformanceToExcel = (report) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildPerformanceRows(report)), 'Успеваемость');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildAnswerRows(report)), 'Ответы');
  XLSX.writeFile(workbook, `teacher-performance-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

let pdfMakeInstance = null;

const loadPdfMake = async () => {
  if (pdfMakeInstance) {
    return pdfMakeInstance;
  }

  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);

  pdfMake.addVirtualFileSystem(pdfFonts);

  pdfMakeInstance = pdfMake;

  return pdfMakeInstance;
};

const getPdfText = (value) => {
  const text = normalizeReportText(value).trim();

  return text || '-';
};

const buildAnswerDetailBlocks = (result) => {
  const answerDetails = Array.isArray(result.answerDetails) ? result.answerDetails : [];

  if (answerDetails.length === 0) {
    return [{ text: 'Нет данных по ответам', style: 'mutedText' }];
  }

  return answerDetails.map((answerDetail, index) => ({
    margin: [0, 0, 0, 7],
    stack: [
      {
        text: `${index + 1}. ${answerDetail.isCorrect ? 'Верно' : 'Ошибка'}: ${getPdfText(answerDetail.questionText)}`,
        style: answerDetail.isCorrect ? 'answerCorrect' : 'answerIncorrect',
      },
      {
        text: `Ответ студента: ${getPdfText(answerDetail.studentAnswer)}`,
        style: 'answerLine',
      },
      {
        text: `Верный ответ: ${getPdfText(answerDetail.correctAnswer)}`,
        style: 'answerLine',
      },
    ],
  }));
};

export const buildTeacherPerformancePdfDefinition = (report) => {
  const normalizedReport = normalizeTeacherReport(report);
  const reportDate = new Date().toLocaleString('ru-RU');
  const content = [
    { text: 'Отчёт по успеваемости студентов', style: 'title' },
    { text: `Сформировано: ${reportDate}`, style: 'subtitle' },
    {
      columns: [
        { text: [{ text: `${normalizedReport.totalAttempts}\n`, style: 'summaryValue' }, 'прохождений'] },
        { text: [{ text: `${normalizedReport.tests.length}\n`, style: 'summaryValue' }, 'тестов'] },
        { text: [{ text: `${normalizedReport.results.length}\n`, style: 'summaryValue' }, 'результатов'] },
      ],
      columnGap: 14,
      margin: [0, 4, 0, 14],
    },
  ];

  normalizedReport.results.forEach((result, index) => {
    content.push(
      {
        text: `${index + 1}. ${getStudentName(result)}`,
        style: 'studentTitle',
        margin: [0, index === 0 ? 0 : 10, 0, 5],
      },
      {
        table: {
          widths: [95, '*'],
          body: [
            ['Email', getPdfText(result.student?.email)],
            ['Тест', getPdfText(result.testTitle)],
            ['Дата', getPdfText(formatDate(result.completedAt))],
            ['Время', formatDuration(result.durationSeconds)],
            ['Правильных вопросов', `${getCorrectAnswersCount(result)} из ${getPdfText(result.totalQuestions)}`],
            ['Неправильных вопросов', getIncorrectAnswersCount(result)],
            ['Итог', `${getPdfText(result.percent)}%`],
          ].map(([label, value]) => [
            { text: label, style: 'tableLabel' },
            { text: getPdfText(value), style: 'tableValue' },
          ]),
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      },
      { text: 'Верные ответы', style: 'sectionTitle' },
      { text: getCorrectAnswersText(result), style: 'bodyText', margin: [0, 0, 0, 7] },
      { text: 'Детали ответов', style: 'sectionTitle' },
      ...buildAnswerDetailBlocks(result)
    );
  });

  return {
    pageSize: 'A4',
    pageMargins: [34, 36, 34, 36],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      lineHeight: 1.18,
    },
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'right',
      margin: [0, 0, 34, 12],
      fontSize: 8,
      color: '#64748b',
    }),
    content,
    styles: {
      title: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 5],
        color: '#111827',
      },
      subtitle: {
        fontSize: 9,
        color: '#64748b',
        margin: [0, 0, 0, 10],
      },
      summaryValue: {
        fontSize: 15,
        bold: true,
        color: '#111827',
      },
      studentTitle: {
        fontSize: 12,
        bold: true,
        color: '#111827',
      },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        margin: [0, 2, 0, 3],
        color: '#1f2937',
      },
      tableLabel: {
        bold: true,
        color: '#334155',
      },
      tableValue: {
        color: '#111827',
      },
      bodyText: {
        color: '#111827',
      },
      mutedText: {
        color: '#64748b',
        italics: true,
        margin: [0, 0, 0, 7],
      },
      answerCorrect: {
        bold: true,
        color: '#166534',
      },
      answerIncorrect: {
        bold: true,
        color: '#b91c1c',
      },
      answerLine: {
        color: '#111827',
        margin: [10, 2, 0, 0],
      },
    },
  };
};

export const exportPerformanceToPdf = async (report) => {
  const pdfMake = await loadPdfMake();

  return pdfMake
    .createPdf(buildTeacherPerformancePdfDefinition(report))
    .download(`teacher-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
};

function TeacherAnalytics() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [teacherReport, setTeacherReport] = useState(EMPTY_TEACHER_REPORT);
  const [teacherReportLoading, setTeacherReportLoading] = useState(false);
  const [teacherReportError, setTeacherReportError] = useState('');
  const [teacherGrouping, setTeacherGrouping] = useState('student');
  const canViewTeacherPerformance = user?.role === 'teacher';
  const teacherAnalyticsGroups = buildTeacherAnalyticsGroups(teacherReport, teacherGrouping);

  useEffect(() => {
    const loadTeacherPerformance = async () => {
      if (!isAuthenticated || !canViewTeacherPerformance) {
        return;
      }

      try {
        setTeacherReportLoading(true);
        setTeacherReportError('');
        const response = await resultsAPI.getTeacherPerformance();
        setTeacherReport(normalizeTeacherReport(response.data));
      } catch (error) {
        console.error('Failed to load teacher performance:', error);
        setTeacherReportError('Не удалось загрузить успеваемость студентов.');
      } finally {
        setTeacherReportLoading(false);
      }
    };

    loadTeacherPerformance();
  }, [canViewTeacherPerformance, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <p>Пожалуйста, войдите в систему для просмотра аналитики.</p>
      </div>
    );
  }

  if (!canViewTeacherPerformance) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Раздел аналитики доступен только преподавателю.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.analyticsSection}>
        <div className={styles.sectionHeader}>
          <h1>Аналитика</h1>
          <div className={styles.exportActions}>
            <button
              type="button"
              onClick={() => exportPerformanceToPdf(teacherReport)}
              disabled={teacherReport.results.length === 0}
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => exportPerformanceToExcel(teacherReport)}
              disabled={teacherReport.results.length === 0}
            >
              Excel
            </button>
          </div>
        </div>

        {teacherReportLoading ? (
          <p>Загрузка успеваемости...</p>
        ) : teacherReportError ? (
          <p className={styles.empty}>{teacherReportError}</p>
        ) : teacherReport.results.length === 0 ? (
          <p className={styles.empty}>По вашим тестам пока нет сохранённых результатов студентов.</p>
        ) : (
          <div className={styles.teacherAnalytics}>
            <div className={styles.teacherToolbar}>
              <div className={styles.summaryStrip} aria-label="Сводка аналитики преподавания">
                <div>
                  <strong>{teacherReport.totalAttempts}</strong>
                  <span>прохождений</span>
                </div>
                <div>
                  <strong>{teacherReport.tests.length}</strong>
                  <span>тестов</span>
                </div>
                <div>
                  <strong>{teacherAnalyticsGroups.length}</strong>
                  <span>{teacherGrouping === 'student' ? 'студентов' : 'групп'}</span>
                </div>
              </div>

              <div
                className={styles.groupingControl}
                role="group"
                aria-label="Группировка аналитики преподавания"
              >
                <span>Группировка</span>
                {Object.entries(TEACHER_GROUPING_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.groupingButton} ${teacherGrouping === value ? styles.groupingButtonActive : ''}`}
                    aria-pressed={teacherGrouping === value}
                    onClick={() => setTeacherGrouping(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.analyticsGroups}>
              {teacherAnalyticsGroups.map((group) => (
                <article key={group.key} className={styles.analyticsGroup}>
                  <div className={styles.groupHeader}>
                    <div>
                      <h2>{group.title}</h2>
                      {group.subtitle && <span>{group.subtitle}</span>}
                    </div>
                    <div className={styles.groupStats}>
                      <div>
                        <strong>{group.attempts}</strong>
                        <span>прохожд.</span>
                      </div>
                      <div>
                        <strong>{formatDuration(group.averageDurationSeconds)}</strong>
                        <span>среднее время</span>
                      </div>
                      <div>
                        <strong>{group.correctTotal}</strong>
                        <span>верно</span>
                      </div>
                      <div>
                        <strong>{group.incorrectTotal}</strong>
                        <span>ошибок</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.performanceTableWrapper}>
                    <table className={styles.performanceTable}>
                      <thead>
                        <tr>
                          <th>{teacherGrouping === 'student' ? 'Тест' : 'Студент'}</th>
                          <th>Дата</th>
                          <th>Время</th>
                          <th>Правильных</th>
                          <th>Неправильных</th>
                          <th>Итог</th>
                          <th>Детали</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.results.map((result) => (
                          <tr key={result.resultId}>
                            <td>
                              {teacherGrouping === 'student' ? (
                                result.testTitle
                              ) : (
                                <>
                                  <strong>{getStudentName(result)}</strong>
                                  <span>{result.student?.email}</span>
                                </>
                              )}
                            </td>
                            <td>{formatDate(result.completedAt)}</td>
                            <td>{formatDuration(result.durationSeconds)}</td>
                            <td>{getCorrectAnswersCount(result)} из {result.totalQuestions}</td>
                            <td>{getIncorrectAnswersCount(result)}</td>
                            <td>{result.percent}%</td>
                            <td>
                              <details>
                                <summary>Ответы</summary>
                                {Array.isArray(result.answerDetails) && result.answerDetails.length > 0 ? (
                                  <ul className={styles.answerList}>
                                    {result.answerDetails.map((answerDetail) => (
                                      <li key={answerDetail.questionId}>
                                        <strong>{answerDetail.isCorrect ? 'Верно' : 'Ошибка'}:</strong>{' '}
                                        {normalizeReportText(answerDetail.questionText)}<br />
                                        Ответ студента: {normalizeReportText(answerDetail.studentAnswer)}<br />
                                        Верный ответ: {normalizeReportText(answerDetail.correctAnswer)}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className={styles.answerEmpty}>Нет данных по ответам</p>
                                )}
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default TeacherAnalytics;
