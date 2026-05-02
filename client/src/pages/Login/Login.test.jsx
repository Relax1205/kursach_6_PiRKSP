import { fireEvent, screen, waitFor } from '@testing-library/react';

import Login from './Login';
import api from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

function makeAuth(overrides = {}) {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    role: null,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

function renderLogin(auth = makeAuth()) {
  return renderWithProviders(<Login />, {
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

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('submits credentials and shows loading text', async () => {
    api.post.mockResolvedValue({
      data: {
        user: { id: 1, role: 'student' },
        token: 'token',
      },
    });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { name: 'email', value: 'student@test.ru' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { name: 'password', value: '123456' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'student@test.ru',
      password: '123456',
    }));
    expect(localStorage.getItem('token')).toBe('token');
  });

  test('renders api errors and authenticated state cleanup path', () => {
    const { unmount } = renderLogin(makeAuth({
      error: 'Неверный пароль',
      isLoading: true,
    }));

    expect(screen.getByText('Неверный пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вход...' })).toBeDisabled();
    unmount();

    const authenticated = renderLogin(makeAuth({
      isAuthenticated: true,
      user: { id: 1 },
    }));

    authenticated.unmount();
  });

  test('stays on the form after rejected login submit', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'bad' } } });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { name: 'email', value: 'student@test.ru' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { name: 'password', value: '123456' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form'));

    expect(await screen.findByText('bad')).toBeInTheDocument();
  });
});

