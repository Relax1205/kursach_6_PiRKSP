import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';

import App from './App';
import QuestionsAdmin from './pages/Admin/QuestionsAdmin';
import authReducer from './store/slices/authSlice';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  authAPI: {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
  },
  testsAPI: {
    getAll: jest.fn(),
    getById: jest.fn(),
    getQuestions: jest.fn(),
    getManageQuestions: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    submit: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
  },
  resultsAPI: {
    save: jest.fn(),
    getMy: jest.fn(),
    getStats: jest.fn(),
  },
}));

const { testsAPI: mockTestsAPI } = require('./services/api');

let warnSpy;

beforeEach(() => {
  Object.values(mockTestsAPI).forEach((mock) => mock.mockReset());
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

test('renders constructor home page', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /Добро пожаловать в Конструктор Тестов/i })
  ).toBeInTheDocument();
});

test('allows removing answer options in the question constructor', async () => {
  mockTestsAPI.getAll.mockResolvedValue({
    data: [{ id: 1, title: 'Тест для проверки' }],
  });
  mockTestsAPI.getManageQuestions.mockResolvedValue({ data: [] });

  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          name: 'Teacher',
          email: 'teacher@test.ru',
          role: 'teacher',
        },
        token: 'test-token',
        isAuthenticated: true,
        role: 'teacher',
        isLoading: false,
        error: null,
      },
    },
  });

  const { container } = render(
    <Provider store={store}>
      <QuestionsAdmin />
    </Provider>
  );

  await waitFor(() => expect(mockTestsAPI.getManageQuestions).toHaveBeenCalledWith(1));

  fireEvent.click(screen.getByRole('button', { name: /Добавить вопрос/i }));

  const optionInputs = () => container.querySelectorAll('input[type="text"][placeholder^="Вариант"]');
  const removeButtons = () => screen.getAllByRole('button', { name: /Удалить вариант/i });

  expect(optionInputs()).toHaveLength(4);
  expect(removeButtons()).toHaveLength(4);

  fireEvent.click(screen.getByRole('button', { name: /Добавить вариант/i }));
  expect(optionInputs()).toHaveLength(5);
  expect(removeButtons()).toHaveLength(5);

  fireEvent.click(removeButtons()[0]);
  fireEvent.click(removeButtons()[0]);
  fireEvent.click(removeButtons()[0]);

  expect(optionInputs()).toHaveLength(2);
  expect(removeButtons()).toHaveLength(2);
  removeButtons().forEach((button) => expect(button).toBeDisabled());
  expect(within(removeButtons()[0].closest('div')).getByRole('textbox')).toHaveAttribute('placeholder', 'Вариант 1');
});
