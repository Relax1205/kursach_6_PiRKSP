import { screen, waitFor } from '@testing-library/react';

import Profile from './Profile';
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

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('renders all result grade branches and retry links', async () => {
    resultsAPI.getMy.mockResolvedValue({
      data: [
        { id: 1, testId: 1, score: 10, totalQuestions: 10, test: { id: 1, title: 'A' }, completedAt: '2026-01-01T00:00:00.000Z' },
        { id: 2, testId: 2, score: 8, totalQuestions: 10, test: { id: 2, title: 'B' }, completedAt: '2026-01-01T00:00:00.000Z' },
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
    expect(screen.getAllByText('Повторить ошибки')).toHaveLength(1);
  });

  test('renders empty and failed result loads plus teacher/student role labels', async () => {
    resultsAPI.getMy.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('boom'));
    renderProfile(authWithRole('teacher'));
    expect(screen.getByText('Преподаватель')).toBeInTheDocument();
    expect(await screen.findByText('Вы пока не проходили тесты')).toBeInTheDocument();

    renderProfile(authWithRole('student'));
    expect(await screen.findByText('Студент')).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
  });
});

