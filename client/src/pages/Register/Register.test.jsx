import { fireEvent, screen, waitFor } from '@testing-library/react';

import Register from './Register';
import api from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

function renderRegister(authOverrides = {}) {
  return renderWithProviders(<Register />, {
    store: createTestStore({
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        role: null,
        isLoading: false,
        error: null,
        ...authOverrides,
      },
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

function fillForm({ password = '123456', confirmPassword = '123456' } = {}) {
  fireEvent.change(screen.getByPlaceholderText('Ваше имя'), {
    target: { name: 'name', value: 'Student' },
  });
  fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
    target: { name: 'email', value: 'student@test.ru' },
  });
  const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');
  fireEvent.change(passwordInput, { target: { name: 'password', value: password } });
  fireEvent.change(confirmInput, { target: { name: 'confirmPassword', value: confirmPassword } });
}

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('validates password mismatch and length', () => {
    renderRegister();

    fillForm({ password: '123456', confirmPassword: 'abcdef' });
    fireEvent.submit(screen.getByRole('button', { name: 'Зарегистрироваться' }).closest('form'));
    expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();

    fillForm({ password: '123', confirmPassword: '123' });
    fireEvent.submit(screen.getByRole('button', { name: 'Зарегистрироваться' }).closest('form'));
    expect(screen.getByText('Пароль должен содержать минимум 6 символов')).toBeInTheDocument();
  });

  test('submits registration data and renders auth loading/error states', async () => {
    api.post.mockResolvedValue({
      data: {
        user: { id: 1, role: 'student' },
        token: 'token',
      },
    });
    const { unmount } = renderRegister();

    fillForm();
    fireEvent.submit(screen.getByRole('button', { name: 'Зарегистрироваться' }).closest('form'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
      name: 'Student',
      email: 'student@test.ru',
      password: '123456',
    }));
    expect(localStorage.getItem('token')).toBe('token');
    unmount();

    const loading = renderRegister({
      error: 'Email занят',
      isLoading: true,
    });
    expect(screen.getByText('Email занят')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Регистрация...' })).toBeDisabled();
    loading.unmount();

    renderRegister({
      isAuthenticated: true,
      user: { id: 1 },
    });
  });

  test('stays on the form after rejected registration submit', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'bad register' } } });
    renderRegister();

    fillForm();
    fireEvent.submit(screen.getByRole('button', { name: 'Зарегистрироваться' }).closest('form'));

    expect(await screen.findByText('bad register')).toBeInTheDocument();
  });
});

