import { configureStore } from '@reduxjs/toolkit';

import api from '../../services/api';
import authReducer, {
  clearError,
  fetchProfile,
  login,
  logout,
  register,
} from './authSlice';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

function makeStore(preloadedState) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  });
}

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('handles logout and clearError reducers', () => {
    localStorage.setItem('token', 'saved-token');
    const stateWithError = authReducer(undefined, { type: 'auth/login/rejected', payload: 'boom' });

    expect(authReducer(stateWithError, clearError()).error).toBeNull();

    const loggedInState = {
      user: { id: 1, role: 'admin' },
      token: 'saved-token',
      isAuthenticated: true,
      role: 'admin',
      isLoading: false,
      error: null,
    };

    expect(authReducer(loggedInState, logout())).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('logs in and stores token', async () => {
    api.post.mockResolvedValue({
      data: {
        user: { id: 1, email: 'a@test.ru', role: 'student' },
        token: 'token-1',
      },
    });
    const store = makeStore();

    const result = await store.dispatch(login({ email: 'a@test.ru', password: '123456' }));

    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'a@test.ru',
      password: '123456',
    });
    expect(localStorage.getItem('token')).toBe('token-1');
    expect(store.getState().auth).toMatchObject({
      isAuthenticated: true,
      role: 'student',
      token: 'token-1',
    });
  });

  test('registers and normalizes response error strings', async () => {
    api.post
      .mockResolvedValueOnce({
        data: {
          user: { id: 2, email: 'b@test.ru', role: 'student' },
          token: 'token-2',
        },
      })
      .mockRejectedValueOnce({ response: { data: 'email busy' } });

    const store = makeStore();
    await expect(
      store.dispatch(register({ name: 'B', email: 'b@test.ru', password: '123456' })).unwrap()
    ).resolves.toEqual({
      user: { id: 2, email: 'b@test.ru', role: 'student' },
      token: 'token-2',
    });

    await expect(
      store.dispatch(register({ name: 'B', email: 'b@test.ru', password: '123456' })).unwrap()
    ).rejects.toBe('email busy');
  });

  test('fetches profile and clears auth on rejected profile request', async () => {
    api.get
      .mockResolvedValueOnce({ data: { user: { id: 3, role: 'teacher' } } })
      .mockRejectedValueOnce({ response: { data: { error: 'bad token' } } });

    const store = makeStore({
      auth: {
        user: null,
        token: 'token-3',
        isAuthenticated: true,
        role: null,
        isLoading: false,
        error: null,
      },
    });

    await store.dispatch(fetchProfile());
    expect(store.getState().auth).toMatchObject({
      user: { id: 3, role: 'teacher' },
      isAuthenticated: true,
      role: 'teacher',
    });

    await store.dispatch(fetchProfile());
    expect(store.getState().auth).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      error: 'bad token',
    });
  });

  test('falls back to generic error messages', async () => {
    api.post.mockRejectedValueOnce(new Error('network down')).mockRejectedValueOnce({});
    const store = makeStore();

    await expect(
      store.dispatch(login({ email: 'a@test.ru', password: '123456' })).unwrap()
    ).rejects.toBe('network down');

    await expect(
      store.dispatch(login({ email: 'a@test.ru', password: '123456' })).unwrap()
    ).rejects.toBe('Ошибка входа');
  });
});

