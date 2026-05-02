import { screen } from '@testing-library/react';

import Home from './Home';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

function renderHome(auth) {
  return renderWithProviders(<Home />, {
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

describe('Home', () => {
  test('renders guest calls to action', () => {
    renderHome({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Пройти тест')).toBeInTheDocument();
    expect(screen.getByText('Войти для создания тестов')).toBeInTheDocument();
    expect(screen.queryByText('Открыть конструктор')).not.toBeInTheDocument();
  });

  test('renders constructor link for teachers', () => {
    renderHome({
      user: { role: 'teacher' },
      token: 'token',
      isAuthenticated: true,
      role: 'teacher',
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Открыть конструктор')).toBeInTheDocument();
    expect(screen.queryByText('Войти для создания тестов')).not.toBeInTheDocument();
  });

  test('renders constructor link for admins', () => {
    renderHome({
      user: { role: 'admin' },
      token: 'token',
      isAuthenticated: true,
      role: 'admin',
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Открыть конструктор')).toBeInTheDocument();
  });
});

