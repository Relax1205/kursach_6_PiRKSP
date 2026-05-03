import { fireEvent, screen, waitFor } from '@testing-library/react';

import TeacherAnalytics, {
  buildAnswerRows,
  buildPerformanceRows,
  buildTeacherPerformancePdfDefinition,
  buildTeacherAnalyticsGroups,
  exportPerformanceToExcel,
  exportPerformanceToPdf,
  formatDate,
  formatDuration,
  getAnswerDetailsText,
  getCorrectAnswersText,
  getCorrectAnswersCount,
  getIncorrectAnswersCount,
  getResultPercent,
  getStudentName,
  hasDuration,
  normalizeTeacherReport,
} from './TeacherAnalytics';
import { resultsAPI } from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({ sheets: [] })),
    json_to_sheet: jest.fn((rows) => ({ rows })),
    book_append_sheet: jest.fn((workbook, sheet, name) => {
      workbook.sheets.push({ sheet, name });
    }),
  },
  writeFile: jest.fn(),
}));

jest.mock('pdfmake/build/pdfmake', () => {
  const mockDownload = jest.fn(() => Promise.resolve('downloaded'));
  const mockCreatePdf = jest.fn(() => ({ download: mockDownload }));

  return {
    __esModule: true,
    default: {
      addVirtualFileSystem: jest.fn(),
      createPdf: mockCreatePdf,
      __mockDownload: mockDownload,
    },
  };
});

jest.mock('pdfmake/build/vfs_fonts', () => ({
  __esModule: true,
  default: {
    'Roboto-Regular.ttf': 'font-data',
  },
}));

jest.mock('../../services/api', () => ({
  resultsAPI: {
    getTeacherPerformance: jest.fn(),
  },
}));

const XLSX = require('xlsx');
const pdfMake = require('pdfmake/build/pdfmake').default;

beforeEach(() => {
  XLSX.utils.book_new.mockImplementation(() => ({ sheets: [] }));
  XLSX.utils.json_to_sheet.mockImplementation((rows) => ({ rows }));
  XLSX.utils.book_append_sheet.mockImplementation((workbook, sheet, name) => {
    workbook.sheets.push({ sheet, name });
  });
  XLSX.writeFile.mockImplementation(() => {});

  pdfMake.addVirtualFileSystem.mockImplementation(() => {});
  pdfMake.__mockDownload.mockImplementation(() => Promise.resolve('downloaded'));
  pdfMake.createPdf.mockImplementation(() => ({ download: pdfMake.__mockDownload }));
});

function renderTeacherAnalytics(auth) {
  return renderWithProviders(<TeacherAnalytics />, {
    store: createTestStore({
      auth,
      quiz: {
        questions: [],
        currentQuestion: 0,
        wrongQuestions: [],
        mode: 'main',
        isFinished: false,
        userAnswers: [],
        isLoading: false,
        isSubmitting: false,
        error: null,
        finalResult: null,
      },
    }),
  });
}

function authWithRole(role) {
  return {
    user: {
      id: 1,
      name: 'User',
      email: 'user@test.ru',
      role,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    token: 'token',
    isAuthenticated: true,
    role,
    isLoading: false,
    error: null,
  };
}

const report = {
  totalAttempts: 2,
  tests: [{ id: 10, title: 'Основы JS', totalAttempts: 2 }],
  results: [
    {
      resultId: 1,
      testId: 10,
      testTitle: 'Основы JS',
      student: { id: 7, name: 'Иван', email: 'ivan@test.ru' },
      score: 4,
      totalQuestions: 5,
      correctAnswerCount: 4,
      incorrectAnswerCount: 1,
      percent: 80,
      durationSeconds: 120,
      completedAt: '2026-01-01T00:00:00.000Z',
      answerDetails: [
        {
          questionId: 1,
          questionText: 'Вопрос 1',
          isCorrect: true,
          studentAnswer: 'WHERE → фильтр',
          correctAnswer: 'WHERE → фильтр',
        },
        {
          questionId: 2,
          questionText: 'Вопрос 2',
          isCorrect: false,
          studentAnswer: 'ORDER BY → сортировка',
          correctAnswer: 'GROUP BY → группировка',
        },
      ],
    },
    {
      resultId: 2,
      testId: 10,
      testTitle: 'Основы JS',
      student: { id: 8, name: 'Анна', email: 'anna@test.ru' },
      score: 3,
      totalQuestions: 5,
      percent: 60,
      durationSeconds: 180,
      completedAt: '2026-01-02T00:00:00.000Z',
      answerDetails: [],
    },
  ],
};

describe('TeacherAnalytics helpers', () => {
  test('calculates durations, answer counts and groups', () => {
    expect(hasDuration(0)).toBe(true);
    expect(hasDuration(null)).toBe(false);
    expect(hasDuration('bad')).toBe(false);
    expect(formatDuration(null)).toBe('нет данных');
    expect(formatDuration(-5)).toBe('0 сек.');
    expect(formatDuration(125)).toBe('2 мин. 05 сек.');
    expect(getCorrectAnswersCount(report.results[0])).toBe(4);
    expect(getCorrectAnswersCount({ correctAnswerCount: 'bad' })).toBe(0);
    expect(getIncorrectAnswersCount(report.results[1])).toBe(2);
    expect(getIncorrectAnswersCount({ incorrectAnswerCount: 'bad', totalQuestions: 'bad' })).toBe(0);
    expect(formatDate(null)).toBe('');
    expect(getResultPercent({ score: 2, totalQuestions: 4 })).toBe(50);
    expect(getResultPercent({ score: 2, totalQuestions: 0 })).toBe(0);
    expect(getCorrectAnswersCount({ score: 2 })).toBe(2);
    expect(getCorrectAnswersCount()).toBe(0);
    expect(getIncorrectAnswersCount({})).toBe(0);
    expect(getStudentName({ student: { id: 5 } })).toBe('Студент #5');
    expect(getStudentName({ resultId: 99 })).toBe('Студент #99');
    expect(getStudentName({})).toBe('Студент #-');
    expect(normalizeTeacherReport({ totalAttempts: '2', tests: null, results: null })).toEqual({
      totalAttempts: 2,
      tests: [],
      results: [],
    });
    expect(normalizeTeacherReport(null)).toEqual({
      totalAttempts: 0,
      tests: [],
      results: [],
    });

    const studentGroups = buildTeacherAnalyticsGroups(report, 'student');
    expect(studentGroups).toHaveLength(2);
    expect(studentGroups[0]).toMatchObject({
      title: 'Иван',
      attempts: 1,
      correctTotal: 4,
      incorrectTotal: 1,
      averageDurationSeconds: 120,
    });

    const testGroups = buildTeacherAnalyticsGroups(report, 'test');
    expect(testGroups).toHaveLength(1);
    expect(testGroups[0]).toMatchObject({
      title: 'Основы JS',
      attempts: 2,
      correctTotal: 7,
      incorrectTotal: 3,
      averageDurationSeconds: 150,
      averagePercent: 70,
    });

    const fallbackGroups = buildTeacherAnalyticsGroups({
      results: [
        {
          resultId: 3,
          testId: 99,
          score: 1,
          totalQuestions: 2,
          durationSeconds: null,
        },
      ],
    }, 'test');
    expect(fallbackGroups[0]).toMatchObject({
      title: 'Тест #99',
      averagePercent: 50,
      averageDurationSeconds: null,
    });

    const duplicateStudentGroups = buildTeacherAnalyticsGroups({
      results: [
        { resultId: 4, student: { name: 'Без почты' }, score: 0, totalQuestions: 1, durationSeconds: '' },
        { resultId: 5, student: { name: 'Без почты' }, score: 1, totalQuestions: 1, durationSeconds: 2 },
      ],
    });
    expect(duplicateStudentGroups).toHaveLength(1);
    expect(duplicateStudentGroups[0]).toMatchObject({
      title: 'Без почты',
      subtitle: '',
      attempts: 2,
      averagePercent: 50,
      averageDurationSeconds: 2,
    });

    const titleOnlyTestGroups = buildTeacherAnalyticsGroups({
      results: [{ resultId: 6, testTitle: 'Тест без id', score: 0, totalQuestions: 1 }],
    }, 'test');
    expect(titleOnlyTestGroups[0]).toMatchObject({
      title: 'Тест без id',
      key: 'test-Тест без id',
    });

    const unnamedTestGroups = buildTeacherAnalyticsGroups({
      results: [{ resultId: 7, score: 0, totalQuestions: 1 }],
    }, 'test');
    expect(unnamedTestGroups[0]).toMatchObject({
      title: 'Тест #-',
      key: 'test-Тест #-',
    });
  });

  test('builds compact Excel rows and normalizes arrows in answer details', () => {
    const performanceRows = buildPerformanceRows(report);
    const answerRows = buildAnswerRows(report);

    expect(performanceRows[0]).not.toHaveProperty('Верные ответы');
    expect(answerRows[0]['Ответ студента']).toBe('WHERE -> фильтр');
    expect(answerRows[0]['Верный ответ']).toBe('WHERE -> фильтр');
    expect(answerRows[1].Статус).toBe('Ошибка');
    expect(answerRows[1]['Ответ студента']).toBe('ORDER BY -> сортировка');
    expect(buildAnswerRows({ results: [{ ...report.results[0], answerDetails: null }] })).toEqual([]);
    expect(buildAnswerRows({
      results: [
        {
          resultId: 10,
          student: null,
          answerDetails: [{ questionText: null, isCorrect: false, studentAnswer: null, correctAnswer: null }],
        },
      ],
    })).toEqual([
      {
        Студент: 'Студент #10',
        Email: '',
        Тест: undefined,
        Вопрос: '',
        Статус: 'Ошибка',
        'Ответ студента': '',
        'Верный ответ': '',
      },
    ]);
    expect(buildPerformanceRows({ results: [{ resultId: 11, student: null, durationSeconds: null, completedAt: null }] })[0]).toMatchObject({
      Студент: 'Студент #11',
      Email: '',
      Время: 'нет данных',
      Дата: '',
    });
    expect(getCorrectAnswersText({ correctAnswers: report.results[0].answerDetails })).toContain('WHERE -> фильтр');
    expect(getCorrectAnswersText({ correctAnswers: [] })).toBe('Нет верных ответов');
    expect(getAnswerDetailsText(report.results[0])).toContain('WHERE -> фильтр');
    expect(getAnswerDetailsText(report.results[0])).toContain('Ошибка: Вопрос 2');
    expect(getAnswerDetailsText({ answerDetails: [] })).toBe('Нет данных по ответам');
  });

  test('exports Excel workbook without verbose correct answers in performance sheet', () => {
    exportPerformanceToExcel(report);

    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      expect.not.objectContaining({ 'Верные ответы': expect.anything() }),
    ]));
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ rows: expect.any(Array) }),
      'Успеваемость'
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({ rows: expect.any(Array) }),
      'Ответы'
    );
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), expect.stringMatching(/^teacher-performance-\d{4}-\d{2}-\d{2}\.xlsx$/));
  });

  test('builds PDF definition with summaries, normalized answers and footer', () => {
    const pdfDefinition = buildTeacherPerformancePdfDefinition({
      ...report,
      results: [
        report.results[0],
        {
          ...report.results[1],
          student: null,
          testTitle: '',
          totalQuestions: '',
          percent: '',
          completedAt: null,
          durationSeconds: null,
          answerDetails: null,
        },
      ],
    });

    expect(pdfDefinition.defaultStyle.font).toBe('Roboto');
    expect(pdfDefinition.content[0]).toMatchObject({ text: 'Отчёт по успеваемости студентов', style: 'title' });
    expect(pdfDefinition.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: '1. Иван' }),
      expect.objectContaining({ text: 'Верные ответы', style: 'sectionTitle' }),
      expect.objectContaining({ text: '2. Студент #2' }),
      expect.objectContaining({ text: 'Нет данных по ответам', style: 'mutedText' }),
    ]));
    expect(JSON.stringify(pdfDefinition.content)).toContain('WHERE -> фильтр');
    expect(JSON.stringify(pdfDefinition.content)).toContain('Ошибка: Вопрос 2');
    expect(pdfDefinition.footer(2, 5)).toEqual(expect.objectContaining({ text: '2 / 5' }));
  });

  test('exports PDF through pdfmake and reuses loaded fonts', async () => {
    await expect(exportPerformanceToPdf(report)).resolves.toBe('downloaded');
    await expect(exportPerformanceToPdf(report)).resolves.toBe('downloaded');

    expect(pdfMake.addVirtualFileSystem).toHaveBeenCalledTimes(1);
    expect(pdfMake.addVirtualFileSystem).toHaveBeenCalledWith({ 'Roboto-Regular.ttf': 'font-data' });
    expect(pdfMake.createPdf).toHaveBeenCalledTimes(2);
    expect(pdfMake.createPdf).toHaveBeenCalledWith(expect.objectContaining({
      defaultStyle: expect.objectContaining({ font: 'Roboto' }),
    }));
    expect(pdfMake.__mockDownload).toHaveBeenCalledWith(expect.stringMatching(/^teacher-performance-\d{4}-\d{2}-\d{2}\.pdf$/));
  });
});

describe('TeacherAnalytics', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('requires login and teacher role', () => {
    renderTeacherAnalytics({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Пожалуйста, войдите в систему для просмотра аналитики.')).toBeInTheDocument();
    expect(resultsAPI.getTeacherPerformance).not.toHaveBeenCalled();
  });

  test('blocks non-teacher users', () => {
    renderTeacherAnalytics(authWithRole('student'));

    expect(screen.getByText('Раздел аналитики доступен только преподавателю.')).toBeInTheDocument();
    expect(resultsAPI.getTeacherPerformance).not.toHaveBeenCalled();
  });

  test('renders teacher analytics and switches grouping', async () => {
    resultsAPI.getTeacherPerformance.mockResolvedValue({ data: report });

    renderTeacherAnalytics(authWithRole('teacher'));

    expect(await screen.findByRole('heading', { name: 'Аналитика' })).toBeInTheDocument();
    expect(resultsAPI.getTeacherPerformance).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Иван')).toBeInTheDocument();
    expect(screen.getByText('4 из 5')).toBeInTheDocument();
    expect(screen.getAllByText('2 мин. 00 сек.').length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, node) => node.textContent.includes('WHERE -> фильтр')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, node) => node.textContent.includes('Ошибка')).length).toBeGreaterThan(0);

    const byTestButton = screen.getByRole('button', { name: 'По тестам' });
    fireEvent.click(byTestButton);

    expect(byTestButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2 мин. 30 сек.')).toBeInTheDocument();
    expect(screen.getByText('среднее время')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    expect(XLSX.writeFile).toHaveBeenCalled();
    await waitFor(() => expect(pdfMake.createPdf).toHaveBeenCalled());
  });

  test('shows load errors', async () => {
    resultsAPI.getTeacherPerformance.mockRejectedValue(new Error('boom'));

    renderTeacherAnalytics(authWithRole('teacher'));

    expect(await screen.findByText('Не удалось загрузить успеваемость студентов.')).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalledWith(
      'Failed to load teacher performance:',
      expect.any(Error)
    ));
  });
});
