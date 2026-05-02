import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import QuizContainer from './QuizContainer';
import { createTestStore } from '../../test-utils/render';
import { resultsAPI, testsAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  testsAPI: {
    getQuestions: jest.fn(),
    submit: jest.fn(),
  },
  resultsAPI: {
    getMistakes: jest.fn(),
  },
}));

const baseQuestion = {
  id: 1,
  question: 'Вопрос?',
  questionText: 'Вопрос?',
  type: 'single',
  options: ['Да', 'Нет'],
  correct: [0],
  optionIndexMap: [0, 1],
};

function quizState(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function authState() {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    role: null,
    isLoading: false,
    error: null,
  };
}

function renderQuiz({
  route = '/test/10',
  path = '/test/:testId',
  quiz = quizState(),
} = {}) {
  const store = createTestStore({
    auth: authState(),
    quiz,
  });

  const result = render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Routes>
          <Route path={path} element={<QuizContainer />} />
          <Route path="/tests" element={<div>Tests page</div>} />
          <Route path="/profile" element={<div>Profile page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

  return { store, ...result };
}

describe('QuizContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    Math.random.mockRestore();
    jest.useRealTimers();
  });

  test('loads questions from route and renders active quiz', async () => {
    testsAPI.getQuestions.mockResolvedValue({ data: [baseQuestion] });

    renderQuiz();
    expect(screen.getByText('Загрузка вопросов...')).toBeInTheDocument();

    expect(await screen.findByText('Вопрос?')).toBeInTheDocument();
    expect(screen.getByText('Осталось: 1:00')).toBeInTheDocument();
  });

  test('loads mistake questions from query param', async () => {
    resultsAPI.getMistakes.mockResolvedValue({ data: [baseQuestion] });

    renderQuiz({ route: '/test/10?mistakes=44' });

    expect(await screen.findByText('Повтор ошибок: 1 вопрос(ов)')).toBeInTheDocument();
    expect(resultsAPI.getMistakes).toHaveBeenCalledWith('44');
  });

  test('renders string and object errors and empty states', () => {
    const { unmount } = renderQuiz({ route: '/', path: '/', quiz: quizState({ error: 'boom' }) });
    expect(screen.getByText('Ошибка: boom')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Вернуться к тестам'));
    expect(screen.getByText('Tests page')).toBeInTheDocument();
    unmount();

    renderQuiz({ route: '/', path: '/', quiz: quizState({ error: { error: 'object boom' } }) });
    expect(screen.getByText('Ошибка: object boom')).toBeInTheDocument();
  });

  test('renders empty test and mistake states', async () => {
    const { unmount } = renderQuiz({ route: '/', path: '/', quiz: quizState() });
    expect(screen.getByText('В тесте пока нет вопросов.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Вернуться к тестам'));
    expect(screen.getByText('Tests page')).toBeInTheDocument();
    unmount();

    resultsAPI.getMistakes.mockResolvedValue({ data: [] });
    renderQuiz({ route: '/?mistakes=1', path: '/', quiz: quizState() });
    expect(await screen.findByText('В этом результате нет ошибок для повторения.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Вернуться в профиль'));
    expect(screen.getByText('Profile page')).toBeInTheDocument();
  });

  test.each([
    [9, 10, 'Отлично! Вы отлично знаете материал.'],
    [7, 10, 'Хорошо! Знания на высоте.'],
    [5, 10, 'Удовлетворительно. Есть над чем поработать.'],
    [0, 10, 'Нужно ещё потренироваться. Попробуйте ещё раз.'],
    [0, 0, 'Нужно ещё потренироваться. Попробуйте ещё раз.'],
  ])('renders finished result for %i/%i', (score, totalQuestions, message) => {
    renderQuiz({
      route: '/',
      path: '/',
      quiz: quizState({
        questions: [baseQuestion],
        isFinished: true,
        hasTimedOut: true,
        finalResult: {
          score,
          totalQuestions,
          saved: score !== 0,
          message: 'not saved',
        },
      }),
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    if (score === 0) {
      expect(screen.getByText('not saved')).toBeInTheDocument();
    }
  });

  test('retries wrong questions, navigates back, and submits manually', async () => {
    testsAPI.submit.mockResolvedValue({
      data: {
        score: 0,
        totalQuestions: 1,
        incorrectQuestionIds: [1],
        saved: true,
      },
    });
    testsAPI.getQuestions.mockResolvedValue({ data: [baseQuestion] });

    const { store } = renderQuiz({
      route: '/',
      path: '/',
      quiz: quizState({
        questions: [baseQuestion],
        wrongQuestions: [baseQuestion],
        isFinished: true,
        finalResult: {
          score: 0,
          totalQuestions: 1,
          saved: true,
          incorrectQuestionIds: [1],
        },
      }),
    });

    fireEvent.click(screen.getByText('Повторить ошибки'));
    expect(store.getState().quiz.mode).toBe('wrong');

    fireEvent.click(screen.getByText('Завершить тест'));
    await waitFor(() => expect(testsAPI.submit).toHaveBeenCalledWith(undefined, {
      questionIds: [1],
      answers: [],
      persistResult: false,
      durationSeconds: expect.any(Number),
    }));

    fireEvent.click(await screen.findByText('Пройти заново'));
    fireEvent.click(await screen.findByText('К списку тестов'));
    expect(screen.getByText('Tests page')).toBeInTheDocument();
  });

  test('uses container next and previous navigation callbacks', () => {
    renderQuiz({
      route: '/',
      path: '/',
      quiz: quizState({
        questions: [baseQuestion, { ...baseQuestion, id: 2, question: 'Второй?' }],
      }),
    });

    fireEvent.click(screen.getByText('Вперёд'));
    expect(screen.getByText('Второй?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Назад'));
    expect(screen.getByText('Вопрос?')).toBeInTheDocument();
  });

  test('auto-submits when time runs out', async () => {
    jest.useFakeTimers();
    testsAPI.submit.mockResolvedValue({
      data: {
        score: 0,
        totalQuestions: 1,
        incorrectQuestionIds: [1],
        saved: true,
      },
    });

    renderQuiz({
      route: '/',
      path: '/',
      quiz: quizState({
        questions: [baseQuestion],
      }),
    });

    expect(screen.getByText('Осталось: 1:00')).toBeInTheDocument();
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    await waitFor(() => expect(testsAPI.submit).toHaveBeenCalled());
    expect(await screen.findByText('Время вышло, тест завершён автоматически.')).toBeInTheDocument();
  });
});

