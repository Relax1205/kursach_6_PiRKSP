import { configureStore } from '@reduxjs/toolkit';

import quizReducer, {
  fetchMistakeQuestions,
  fetchQuestions,
  nextQuestion,
  prevQuestion,
  resetQuiz,
  setModeWrong,
  setUserAnswer,
  submitResults,
} from './quizSlice';
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

function makeStore() {
  return configureStore({
    reducer: { quiz: quizReducer },
  });
}

const optionQuestion = {
  id: 1,
  questionText: 'Question text',
  type: 'single',
  options: ['A', 'B', 'C'],
  correct: [0],
};

const matchingQuestion = {
  id: 2,
  questionText: 'Match text',
  type: 'matching',
  left: ['L1', 'L2'],
  right: ['R1', 'R2'],
  correct: [0, 1],
};

const bareQuestion = {
  id: 3,
  question: 'Bare question',
  correct: [],
};

describe('quizSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    Math.random.mockRestore();
  });

  test('moves between questions inside bounds and stores answers', () => {
    let state = quizReducer(undefined, {
      type: fetchQuestions.fulfilled.type,
      payload: [optionQuestion, bareQuestion],
    });

    state = quizReducer(state, prevQuestion());
    expect(state.currentQuestion).toBe(0);

    state = quizReducer(state, nextQuestion());
    expect(state.currentQuestion).toBe(1);

    state = quizReducer(state, nextQuestion());
    expect(state.currentQuestion).toBe(1);

    state = quizReducer(state, setUserAnswer({ questionId: 1, answer: [0] }));
    state = quizReducer(state, setUserAnswer({ questionId: 1, answer: [1] }));
    expect(state.userAnswers).toEqual([{ questionId: 1, answer: [1] }]);

    expect(quizReducer(state, resetQuiz())).toMatchObject({
      questions: [],
      currentQuestion: 0,
      mode: 'main',
    });
  });

  test('switches to wrong-question mode only when wrong questions exist', () => {
    const unchanged = quizReducer(undefined, setModeWrong());
    expect(unchanged.mode).toBe('main');

    const submitted = quizReducer(
      {
        questions: [optionQuestion, matchingQuestion],
        currentQuestion: 1,
        wrongQuestions: [matchingQuestion],
        mode: 'main',
        isFinished: true,
        userAnswers: [{ questionId: 2, answer: {} }],
        isLoading: false,
        isSubmitting: false,
        error: 'old',
        finalResult: { score: 0 },
      },
      setModeWrong()
    );

    expect(submitted).toMatchObject({
      mode: 'wrong',
      currentQuestion: 0,
      isFinished: false,
      userAnswers: [],
      error: null,
      finalResult: null,
    });
    expect(submitted.questions[0].type).toBe('matching');
    expect(submitted.questions[0].leftIndexMap).toHaveLength(2);

    const bareSubmitted = quizReducer(
      {
        ...submitted,
        wrongQuestions: [bareQuestion],
      },
      setModeWrong()
    );
    expect(bareSubmitted.questions[0]).toMatchObject({
      id: 3,
      options: [],
    });
  });

  test('fetches questions, mistakes, and submits results', async () => {
    testsAPI.getQuestions.mockResolvedValue({ data: [optionQuestion, matchingQuestion, bareQuestion] });
    resultsAPI.getMistakes.mockResolvedValue({ data: [matchingQuestion] });
    testsAPI.submit.mockResolvedValue({
      data: {
        score: 1,
        totalQuestions: 2,
        incorrectQuestionIds: [2],
      },
    });

    const store = makeStore();

    await store.dispatch(fetchQuestions(10));
    expect(testsAPI.getQuestions).toHaveBeenCalledWith(10);
    expect(store.getState().quiz.questions).toHaveLength(3);
    expect(store.getState().quiz.questions[0]).toHaveProperty('optionIndexMap');

    await store.dispatch(fetchMistakeQuestions(20));
    expect(resultsAPI.getMistakes).toHaveBeenCalledWith(20);
    expect(store.getState().quiz.mode).toBe('wrong');

    await store.dispatch(
      submitResults({
        testId: 10,
        questionIds: [2],
        answers: [{ questionId: 2, answer: {} }],
        persistResult: false,
      })
    );
    expect(testsAPI.submit).toHaveBeenCalledWith(10, {
      questionIds: [2],
      answers: [{ questionId: 2, answer: {} }],
      persistResult: false,
    });
    expect(store.getState().quiz).toMatchObject({
      isFinished: true,
      finalResult: {
        score: 1,
        totalQuestions: 2,
        incorrectQuestionIds: [2],
      },
    });
    expect(store.getState().quiz.wrongQuestions).toHaveLength(1);
  });

  test('handles rejected async actions with api payloads and fallbacks', async () => {
    testsAPI.getQuestions
      .mockRejectedValueOnce({ response: { data: { error: 'load failed' } } })
      .mockRejectedValueOnce({});
    resultsAPI.getMistakes.mockRejectedValueOnce({});
    testsAPI.submit
      .mockRejectedValueOnce({ response: { data: 'submit failed' } })
      .mockRejectedValueOnce({});

    const store = makeStore();

    await store.dispatch(fetchQuestions(10));
    expect(store.getState().quiz).toMatchObject({
      isLoading: false,
      error: { error: 'load failed' },
    });

    await store.dispatch(fetchQuestions(10));
    expect(store.getState().quiz.error).toBe('Ошибка загрузки вопросов');

    await store.dispatch(fetchMistakeQuestions(1));
    expect(store.getState().quiz.error).toBe('Ошибка загрузки ошибок');

    await store.dispatch(submitResults({ testId: 10, questionIds: [], answers: [] }));
    expect(store.getState().quiz).toMatchObject({
      isSubmitting: false,
      error: 'submit failed',
    });

    await store.dispatch(submitResults({ testId: 10, questionIds: [], answers: [] }));
    expect(store.getState().quiz.error).toBe('Ошибка отправки результатов');
  });
});

