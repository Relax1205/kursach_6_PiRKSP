import { render, screen } from '@testing-library/react';

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

import App from './App';

let warnSpy;

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

test('renders constructor home page', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /добро пожаловать в конструктор тестов/i })
  ).toBeInTheDocument();
});
