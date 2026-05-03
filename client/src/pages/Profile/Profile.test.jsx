import { screen, waitFor } from '@testing-library/react';

import Profile, {
  formatDuration,
  getGrade,
  getResultPercent,
  hasDuration,
} from './Profile';
import { resultsAPI } from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  resultsAPI: {
    getMy: jest.fn(),
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

describe('Profile helpers', () => {
  test('calculates percent, grades and durations', () => {
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
    expect(formatDuration(-5)).toBe('0 сек.');
    expect(formatDuration(45)).toBe('45 сек.');
    expect(formatDuration(125)).toBe('2 мин. 05 сек.');
  });

});

describe('Profile', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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

    const teacherRender = renderProfile(authWithRole('teacher'));
    expect(screen.getByText('Преподаватель')).toBeInTheDocument();
    expect(await screen.findByText('Вы пока не проходили тесты')).toBeInTheDocument();
    teacherRender.unmount();

    renderProfile(authWithRole('student'));
    expect(await screen.findByText('Студент')).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Failed to load results:', expect.any(Error)));
    expect(await screen.findByText('Вы пока не проходили тесты')).toBeInTheDocument();
  });
});
