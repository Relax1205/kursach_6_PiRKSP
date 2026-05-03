import { fireEvent, screen, waitFor } from '@testing-library/react';

import TeacherAnalytics, {
  buildAnswerRows,
  buildPerformanceRows,
  buildTeacherAnalyticsGroups,
  formatDuration,
  getAnswerDetailsText,
  getCorrectAnswersCount,
  getIncorrectAnswersCount,
  hasDuration,
} from './TeacherAnalytics';
import { resultsAPI } from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  resultsAPI: {
    getTeacherPerformance: jest.fn(),
  },
}));

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
    expect(formatDuration(-5)).toBe('0 сек.');
    expect(formatDuration(125)).toBe('2 мин. 05 сек.');
    expect(getCorrectAnswersCount(report.results[0])).toBe(4);
    expect(getIncorrectAnswersCount(report.results[1])).toBe(2);

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
  });

  test('builds compact Excel rows and normalizes arrows in answer details', () => {
    const performanceRows = buildPerformanceRows(report);
    const answerRows = buildAnswerRows(report);

    expect(performanceRows[0]).not.toHaveProperty('Верные ответы');
    expect(answerRows[0]['Ответ студента']).toBe('WHERE -> фильтр');
    expect(answerRows[0]['Верный ответ']).toBe('WHERE -> фильтр');
    expect(getAnswerDetailsText(report.results[0])).toContain('WHERE -> фильтр');
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

    const byTestButton = screen.getByRole('button', { name: 'По тестам' });
    fireEvent.click(byTestButton);

    expect(byTestButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2 мин. 30 сек.')).toBeInTheDocument();
    expect(screen.getByText('среднее время')).toBeInTheDocument();
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
