import { fireEvent, screen } from '@testing-library/react';

import Header from './Header';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

function renderHeader(auth) {
  return renderWithProviders(<Header />, {
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

describe('Header', () => {
  test('renders guest navigation', () => {
    renderHeader({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.queryByText('Конструктор')).not.toBeInTheDocument();
  });

  test('renders teacher navigation and logs out', () => {
    const { store } = renderHeader({
      user: { id: 1, role: 'teacher' },
      token: 'token',
      isAuthenticated: true,
      role: 'teacher',
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Конструктор')).toBeInTheDocument();
    expect(screen.queryByText('Администрирование')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Выйти'));
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  test('renders admin navigation', () => {
    renderHeader({
      user: { id: 1, role: 'admin' },
      token: 'token',
      isAuthenticated: true,
      role: 'admin',
      isLoading: false,
      error: null,
    });

    expect(screen.getByText('Конструктор')).toBeInTheDocument();
    expect(screen.getByText('Администрирование')).toBeInTheDocument();
  });
});

