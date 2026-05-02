import { fireEvent, screen, within } from '@testing-library/react';

import Question from './Question';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

function renderQuestion(question, quizOverrides = {}) {
  const store = createTestStore({
    auth: {
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    },
    quiz: {
      questions: question ? [question] : [],
      currentQuestion: 0,
      wrongQuestions: [],
      mode: 'main',
      isFinished: false,
      userAnswers: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      finalResult: null,
      ...quizOverrides,
    },
  });

  return renderWithProviders(<Question question={question} />, { store });
}

const singleQuestion = {
  id: 1,
  question: 'Столица Франции?',
  type: 'single',
  options: ['Париж', 'Лондон'],
  correct: [0],
  optionIndexMap: [0, 1],
};

describe('Question', () => {
  test('renders fallback when question is missing', () => {
    renderQuestion(null);

    expect(screen.getByText('Подготовка вопроса...')).toBeInTheDocument();
  });

  test('checks a correct single-choice answer and stores it', () => {
    const { store } = renderQuestion(singleQuestion);

    fireEvent.click(screen.getByLabelText(/Париж/));
    expect(store.getState().quiz.userAnswers).toEqual([{ questionId: 1, answer: [0] }]);

    fireEvent.click(screen.getByText('Проверить'));
    expect(screen.getByText('Ответ верный.')).toBeInTheDocument();
    expect(screen.getAllByText('Правильный ответ').length).toBeGreaterThan(0);
  });

  test('checks a wrong multiple-choice answer and toggles selected options', () => {
    const question = {
      ...singleQuestion,
      id: 2,
      type: 'multiple',
      correct: [0],
    };
    const { store } = renderQuestion(question);

    fireEvent.click(screen.getByLabelText(/Лондон/));
    fireEvent.click(screen.getByLabelText(/Лондон/));
    fireEvent.click(screen.getByLabelText(/Лондон/));
    expect(store.getState().quiz.userAnswers).toEqual([{ questionId: 2, answer: [1] }]);

    fireEvent.click(screen.getByText('Проверить'));
    expect(screen.getByText('Ответ неверный.')).toBeInTheDocument();
    const row = screen.getAllByText('Лондон').find((element) => element.tagName === 'TD').closest('tr');
    expect(within(row).getByText('Выбрано')).toBeInTheDocument();
  });

  test('restores saved option answer and shows wrong-mode info', () => {
    renderQuestion(singleQuestion, {
      mode: 'wrong',
      wrongQuestions: [singleQuestion],
      userAnswers: [{ questionId: 1, answer: [0] }],
    });

    expect(screen.getByText('Повтор ошибок: 1 вопрос(ов)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Париж/)).toBeChecked();
  });

  test('checks matching answers and clears selections', () => {
    const matchingQuestion = {
      id: 3,
      question: 'Сопоставьте',
      type: 'matching',
      left: ['Один', 'Два'],
      right: ['1', '2'],
      correct: [0, 1],
      leftIndexMap: [0, 1],
      options: [],
      optionIndexMap: [],
    };
    const { store } = renderQuestion(matchingQuestion);
    const selects = screen.getAllByRole('combobox');

    fireEvent.change(selects[0], { target: { value: '0' } });
    fireEvent.change(selects[1], { target: { value: '0' } });
    fireEvent.change(selects[1], { target: { value: '' } });
    fireEvent.change(selects[1], { target: { value: '1' } });

    expect(store.getState().quiz.userAnswers).toEqual([
      { questionId: 3, answer: { 0: 0, 1: 1 } },
    ]);

    fireEvent.click(screen.getByText('Проверить'));
    expect(screen.getByText('Ответ верный.')).toBeInTheDocument();
  });

  test('restores saved matching answer and marks wrong row', () => {
    const matchingQuestion = {
      id: 4,
      question: 'Сопоставьте',
      type: 'matching',
      left: ['Один', 'Два'],
      right: ['1', '2'],
      correct: [0, 1],
      leftIndexMap: [0, 1],
      options: [],
      optionIndexMap: [],
    };

    renderQuestion(matchingQuestion, {
      userAnswers: [{ questionId: 4, answer: { 0: 1, 1: 0 } }],
    });

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('1');
    fireEvent.click(screen.getByText('Проверить'));
    expect(screen.getByText('Ответ неверный.')).toBeInTheDocument();
    expect(screen.getAllByText('Один').length).toBeGreaterThan(0);
  });

  test('handles malformed saved answers and answer metadata defensively', () => {
    const malformedOptionQuestion = {
      ...singleQuestion,
      id: 5,
      type: 'multiple',
      correct: null,
      optionIndexMap: [1, 0],
    };
    const { unmount } = renderQuestion(malformedOptionQuestion, {
      userAnswers: [{ questionId: 5, answer: null }],
    });

    fireEvent.click(screen.getByLabelText(/Париж/));
    fireEvent.click(screen.getByLabelText(/Лондон/));
    fireEvent.click(screen.getByText('Проверить'));
    expect(screen.getByText('Ответ неверный.')).toBeInTheDocument();
    unmount();

    const malformedMatchingQuestion = {
      id: 6,
      question: 'Сопоставьте',
      type: 'matching',
      left: ['Один'],
      right: ['1'],
      correct: null,
      leftIndexMap: [0],
      options: [],
      optionIndexMap: [],
    };

    renderQuestion(malformedMatchingQuestion, {
      userAnswers: [{ questionId: 6, answer: null }],
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Проверить'));
    expect(screen.getByText('Ответ неверный.')).toBeInTheDocument();
  });
});

