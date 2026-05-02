import { fireEvent, screen, waitFor } from '@testing-library/react';

import Profile, {
  formatDuration,
  getGrade,
  getNextAnalyticsId,
  getResultPercent,
  hasDuration,
  makeEmptyAnalytics,
  normalizeAnalytics,
  sanitizeReportFileName,
} from './Profile';
import { resultsAPI, testsAPI } from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('recharts', () => {
  const React = require('react');
  const Chart = ({ children, data }) => (
    <div data-testid="chart" data-count={Array.isArray(data) ? data.length : 0}>
      {children}
    </div>
  );
  const Item = ({ children }) => <div>{children}</div>;

  return {
    Bar: Item,
    BarChart: Chart,
    CartesianGrid: Item,
    Legend: Item,
    Line: Item,
    LineChart: Chart,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    Tooltip: Item,
    XAxis: Item,
    YAxis: Item,
  };
});

jest.mock('jspdf', () => {
  const instance = {
    setFontSize: jest.fn(),
    splitTextToSize: jest.fn((text) => [String(text)]),
    text: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
  };
  const JsPDF = jest.fn(() => instance);
  JsPDF.__instance = instance;

  return {
    __esModule: true,
    default: JsPDF,
  };
});

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

jest.mock('../../services/api', () => ({
  resultsAPI: {
    getMy: jest.fn(),
    getStats: jest.fn(),
  },
  testsAPI: {
    getManageable: jest.fn(),
  },
}));

function renderProfile(auth) {
  return renderWithProviders(<Profile />, {
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

const makeQuestionStats = (count) => Array.from({ length: count }, (_, index) => ({
  questionId: index + 1,
  order: index,
  questionText: `Вопрос ${index + 1}`,
  correctCount: index % 2,
  incorrectCount: 2 - (index % 2),
  totalAnswers: 2,
  correctPercent: index % 2 ? 50 : 0,
}));

describe('Profile helpers', () => {
  test('calculates percent, grades, durations and analytics ids', () => {
    expect(getResultPercent(null)).toBe(0);
    expect(getResultPercent({ score: 3, totalQuestions: 4 })).toBe(75);
    expect(getGrade(95).label).toBe('Отлично');
    expect(getGrade(75).label).toBe('Хорошо');
    expect(getGrade(55).label).toBe('Удовл.');
    expect(getGrade(10).label).toBe('Неудовл.');
    expect(hasDuration(0)).toBe(true);
    expect(hasDuration(null)).toBe(false);
    expect(hasDuration('')).toBe(false);
    expect(formatDuration(null)).toBe('нет данных');
    expect(formatDuration(45)).toBe('45 сек.');
    expect(formatDuration(125)).toBe('2 мин. 05 сек.');
    expect(sanitizeReportFileName('A:* bad/name')).toBe('A_bad_name');
    expect(getNextAnalyticsId([], '7')).toBe('');
    expect(getNextAnalyticsId([{ testId: 7 }], '7')).toBe('7');
    expect(getNextAnalyticsId([{ testId: 8 }], '7')).toBe('8');
  });

  test('normalizes empty and partially malformed analytics payloads', () => {
    const test = { id: 4, title: 'Test title' };

    expect(makeEmptyAnalytics(test)).toMatchObject({
      testId: 4,
      title: 'Test title',
      totalAttempts: 0,
      questionStats: [],
      results: [],
    });
    expect(normalizeAnalytics(test, {
      testId: '5',
      totalAttempts: '2',
      averageScore: '1',
      averagePercent: '50',
      questionStats: 'bad',
      results: 'bad',
    })).toMatchObject({
      testId: 5,
      totalAttempts: 2,
      averageScore: 1,
      averagePercent: 50,
      questionStats: [],
      results: [],
    });
  });
});

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const jsPDF = require('jspdf').default;
    const XLSX = require('xlsx');

    jsPDF.mockImplementation(() => jsPDF.__instance);
    jsPDF.__instance.setFontSize.mockImplementation(() => {});
    jsPDF.__instance.splitTextToSize.mockImplementation((text) => [String(text)]);
    jsPDF.__instance.text.mockImplementation(() => {});
    jsPDF.__instance.addPage.mockImplementation(() => {});
    jsPDF.__instance.save.mockImplementation(() => {});
    XLSX.utils.book_new.mockImplementation(() => ({ sheets: [] }));
    XLSX.utils.json_to_sheet.mockImplementation((rows) => ({ rows }));
    XLSX.utils.book_append_sheet.mockImplementation((workbook, sheet, name) => {
      workbook.sheets.push({ sheet, name });
    });
    XLSX.writeFile.mockImplementation(() => {});
    testsAPI.getManageable.mockResolvedValue({ data: [] });
    resultsAPI.getStats.mockResolvedValue({ data: {} });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('asks guests to log in', () => {
    renderProfile({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Пожалуйста, войдите в систему для просмотра профиля.')).toBeInTheDocument();
    expect(resultsAPI.getMy).not.toHaveBeenCalled();
  });

  test('renders all result grade branches, durations and retry links', async () => {
    resultsAPI.getMy.mockResolvedValue({
      data: [
        { id: 1, testId: 1, score: 10, totalQuestions: 10, durationSeconds: 30, test: { id: 1, title: 'A' }, completedAt: '2026-01-01T00:00:00.000Z' },
        { id: 2, testId: 2, score: 8, totalQuestions: 10, durationSeconds: 125, test: { id: 2, title: 'B' }, completedAt: '2026-01-01T00:00:00.000Z' },
        { id: 3, testId: 3, score: 6, totalQuestions: 10, test: { title: 'C' }, completedAt: '2026-01-01T00:00:00.000Z' },
        { id: 4, testId: 4, score: 1, totalQuestions: 10, test: null, completedAt: '2026-01-01T00:00:00.000Z' },
      ],
    });

    renderProfile(authWithRole('admin'));
    expect(screen.getByText('Загрузка результатов...')).toBeInTheDocument();

    expect(screen.getByText('Администратор')).toBeInTheDocument();
    expect(await screen.findByText('Отлично')).toBeInTheDocument();
    expect(screen.getByText('Хорошо')).toBeInTheDocument();
    expect(screen.getByText('Удовл.')).toBeInTheDocument();
    expect(screen.getByText('Неудовл.')).toBeInTheDocument();
    expect(screen.getByText('Тест #4')).toBeInTheDocument();
    expect(screen.getByText('Время прохождения: 30 сек.')).toBeInTheDocument();
    expect(screen.getByText('Время прохождения: 2 мин. 05 сек.')).toBeInTheDocument();
    expect(screen.getAllByText('Повторить ошибки')).toHaveLength(1);
  });

  test('renders empty and failed result loads plus teacher/student role labels', async () => {
    resultsAPI.getMy.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('boom'));
    renderProfile(authWithRole('teacher'));
    expect(screen.getByText('Преподаватель')).toBeInTheDocument();
    expect(await screen.findByText('Вы пока не проходили тесты')).toBeInTheDocument();
    expect(await screen.findByText('У вас пока нет тестов для аналитики.')).toBeInTheDocument();

    renderProfile(authWithRole('student'));
    expect(await screen.findByText('Студент')).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
  });

  test('loads teacher analytics, switches selected test and exports Excel/PDF', async () => {
    const jsPDF = require('jspdf').default;
    const XLSX = require('xlsx');

    resultsAPI.getMy.mockResolvedValue({ data: [] });
    testsAPI.getManageable.mockResolvedValue({
      data: [
        { id: 10, title: 'Алгебра' },
        { id: 11, title: 'История' },
      ],
    });
    resultsAPI.getStats
      .mockResolvedValueOnce({
        data: {
          testId: 10,
          totalAttempts: 2,
          averageScore: 1,
          averagePercent: 50,
          averageDurationSeconds: 90,
          questionStats: makeQuestionStats(34),
          results: [
            {
              id: 1,
              userId: 2,
              user: { name: 'Student One', email: 'one@test.ru' },
              score: 1,
              totalQuestions: 2,
              durationSeconds: 120,
              percent: 50,
              completedAt: '2026-01-02T00:00:00.000Z',
            },
            {
              id: 2,
              userId: 3,
              score: 2,
              totalQuestions: 2,
              durationSeconds: null,
              completedAt: null,
            },
          ],
        },
      })
      .mockRejectedValueOnce(new Error('stats failed'));

    renderProfile(authWithRole('teacher'));

    expect(await screen.findByText('Аналитика преподавателя')).toBeInTheDocument();
    expect(await screen.findByText('Алгебра')).toBeInTheDocument();
    expect(screen.getAllByTestId('chart')).toHaveLength(3);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1 мин. 30 сек.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } });
    expect(screen.getByRole('combobox')).toHaveValue('11');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), expect.stringMatching(/teacher-analytics-/));

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(jsPDF).toHaveBeenCalled();
    expect(jsPDF.__instance.addPage).toHaveBeenCalled();
    expect(jsPDF.__instance.save).toHaveBeenCalledWith('Алгебра-report.pdf');
    expect(console.error).toHaveBeenCalledWith('Failed to load test statistics:', expect.any(Error));
  });

  test('exports a multipage PDF while question list overflows before attempts', async () => {
    const jsPDF = require('jspdf').default;

    resultsAPI.getMy.mockResolvedValue({ data: [] });
    testsAPI.getManageable.mockResolvedValue({ data: [{ id: 12, title: 'Long report' }] });
    resultsAPI.getStats.mockResolvedValue({
      data: {
        testId: 12,
        totalAttempts: 0,
        questionStats: makeQuestionStats(36),
        results: [],
      },
    });

    renderProfile(authWithRole('teacher'));

    expect(await screen.findByText('Long report')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(jsPDF.__instance.addPage).toHaveBeenCalled();
    expect(jsPDF.__instance.save).toHaveBeenCalledWith('Long_report-report.pdf');
  });

  test('shows analytics load errors', async () => {
    resultsAPI.getMy.mockResolvedValue({ data: [] });
    testsAPI.getManageable.mockRejectedValue(new Error('analytics failed'));

    renderProfile(authWithRole('teacher'));

    expect(await screen.findByText('Не удалось загрузить аналитику преподавателя.')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith('Failed to load analytics:', expect.any(Error));
  });
});
