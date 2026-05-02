import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import QuestionsAdmin, {
  buildQuestionPayload,
  createEmptyQuestionForm,
  normalizeQuestionForForm,
  padArray,
} from './QuestionsAdmin';
import { resultsAPI, testsAPI } from '../../services/api';
import { createTestStore, renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  testsAPI: {
    getManageable: jest.fn(),
    getManageQuestions: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
  },
  resultsAPI: {
    getStats: jest.fn(),
  },
}));

function renderQuestionsAdmin(user = { id: 1, role: 'teacher' }) {
  return renderWithProviders(<QuestionsAdmin />, {
    store: createTestStore({
      auth: {
        user,
        token: user ? 'token' : null,
        isAuthenticated: Boolean(user),
        role: user?.role || null,
        isLoading: false,
        error: null,
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

const testRecord = {
  id: 10,
  title: 'Тестовый тест',
  description: 'Описание',
  questionLimit: null,
  availableQuestionCount: 2,
};

const singleQuestion = {
  id: 100,
  questionText: 'Первый вопрос?',
  type: 'single',
  options: ['Да', 'Нет'],
  correct: [0],
  order: 0,
};

const matchingQuestion = {
  id: 101,
  questionText: 'Сопоставьте',
  type: 'matching',
  left: ['Один', 'Два'],
  right: ['1', '2'],
  correct: [0, 1],
  order: 1,
};

function mockLoadedConstructor({ stats = null } = {}) {
  testsAPI.getManageable.mockResolvedValue({ data: [testRecord] });
  testsAPI.getManageQuestions.mockResolvedValue({ data: [singleQuestion, matchingQuestion] });
  resultsAPI.getStats.mockResolvedValue({
    data: stats || { testId: 10, totalAttempts: 0, averageScore: 0, results: [] },
  });
}

describe('QuestionsAdmin helpers', () => {
  test('creates, pads and normalizes question forms', () => {
    expect(createEmptyQuestionForm()).toMatchObject({
      id: null,
      type: 'single',
      options: ['', '', '', ''],
      left: ['', '', ''],
    });
    expect(padArray(['A'], 3, 'x')).toEqual(['A', 'x', 'x']);

    expect(normalizeQuestionForForm(singleQuestion)).toMatchObject({
      id: 100,
      question: 'Первый вопрос?',
      options: ['Да', 'Нет', '', ''],
      correct: [0],
    });
    expect(normalizeQuestionForForm(matchingQuestion)).toMatchObject({
      id: 101,
      question: 'Сопоставьте',
      type: 'matching',
      left: ['Один', 'Два', ''],
      right: ['1', '2', ''],
      correct: [0, 1],
    });
  });

  test('builds option payloads and validates option questions', () => {
    expect(buildQuestionPayload({
      question: '  Вопрос?  ',
      type: 'multiple',
      options: [' A ', '', 'B'],
      correct: [0, 2],
    })).toEqual({
      question: 'Вопрос?',
      type: 'multiple',
      options: ['A', 'B'],
      correct: [0, 1],
    });

    expect(() => buildQuestionPayload({
      question: 'Q',
      type: 'single',
      options: ['A', ''],
      correct: [0],
    })).toThrow('Добавьте минимум два варианта ответа.');

    expect(() => buildQuestionPayload({
      question: 'Q',
      type: 'single',
      options: ['A', 'B'],
      correct: [],
    })).toThrow('Выберите хотя бы один правильный ответ.');
  });

  test('builds matching payloads and validates matching questions', () => {
    expect(buildQuestionPayload({
      question: ' Match ',
      type: 'matching',
      left: [' L1 ', 'L2'],
      right: [' R1 ', 'R2'],
      correct: ['0', 1],
    })).toEqual({
      question: 'Match',
      type: 'matching',
      left: ['L1', 'L2'],
      right: ['R1', 'R2'],
      correct: [0, 1],
    });

    expect(() => buildQuestionPayload({
      question: 'Match',
      type: 'matching',
      left: ['L1', ''],
      right: ['R1', 'R2'],
      correct: [0, 1],
    })).toThrow('Для matching-вопроса нужно заполнить все пары.');

    expect(() => buildQuestionPayload({
      question: 'Match',
      type: 'matching',
      left: ['L1', 'L2'],
      right: ['R1', 'R2'],
      correct: ['', 1],
    })).toThrow('Для matching-вопроса нужно задать соответствие для каждой строки.');

    expect(() => buildQuestionPayload({
      question: 'Match',
      type: 'matching',
      left: ['L1', 'L2'],
      right: ['R1', 'R2'],
      correct: [0],
    })).toThrow('Для matching-вопроса нужно задать соответствие для каждой строки.');

    expect(() => buildQuestionPayload({
      question: 'Match',
      type: 'matching',
      left: ['L1', 'L2'],
      right: ['R1', 'R2'],
      correct: [0, 0],
    })).toThrow('Каждая левая часть может использоваться только один раз.');
  });
});

describe('QuestionsAdmin component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.alert.mockRestore();
    window.confirm.mockRestore();
    console.error.mockRestore();
  });

  test('blocks students and renders empty constructor state', async () => {
    renderQuestionsAdmin({ id: 2, role: 'student' });
    expect(screen.getByText('Доступ только для преподавателя или администратора.')).toBeInTheDocument();

    testsAPI.getManageable.mockResolvedValue({ data: [] });
    const rendered = renderQuestionsAdmin();
    expect(await screen.findByText('Нет доступных тестов')).toBeInTheDocument();
    expect(screen.getByText('Создайте тест, чтобы начать конструирование.')).toBeInTheDocument();
  });

  test('loads questions, stats and switches tests', async () => {
    mockLoadedConstructor({
      stats: {
        testId: 10,
        totalAttempts: 1,
        averageScore: 2,
        results: [{
          id: 1,
          userId: 5,
          user: null,
          score: 2,
          totalQuestions: 3,
          completedAt: '2026-01-01T00:00:00.000Z',
        }],
      },
    });

    renderQuestionsAdmin({ id: 1, role: 'admin' });
    expect(screen.getByText('Загрузка конструктора...')).toBeInTheDocument();
    expect(await screen.findByText('Вопросы теста "Тестовый тест"')).toBeInTheDocument();
    expect(screen.getByText('Попыток:')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
    expect(screen.getByText('Да')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue('Тестовый тест'), { target: { value: '10' } });
    await waitFor(() => expect(testsAPI.getManageQuestions).toHaveBeenCalledWith(10));
  });

  test('creates, updates and deletes tests', async () => {
    mockLoadedConstructor();
    testsAPI.create.mockResolvedValue({ data: { test: { id: 10 } } });
    testsAPI.update.mockResolvedValue({ data: { test: { title: 'Новый тест' } } });
    testsAPI.delete.mockResolvedValue({});

    const rendered = renderQuestionsAdmin();
    await screen.findByText('Тестовый тест');

    fireEvent.click(screen.getByText('Создать тест'));
    const createForm = screen.getByRole('button', { name: 'Сохранить тест' }).closest('form');
    const [createTitleInput, createDescriptionInput] = within(createForm).getAllByRole('textbox');
    fireEvent.change(createTitleInput, { target: { value: ' Новый тест ' } });
    fireEvent.change(createDescriptionInput, { target: { value: ' Описание ' } });
    fireEvent.submit(createForm);
    await waitFor(() => expect(testsAPI.create).toHaveBeenCalledWith({
      title: 'Новый тест',
      description: 'Описание',
      questions: [],
    }));

    rendered.unmount();
    cleanup();
    mockLoadedConstructor();
    renderQuestionsAdmin();
    await screen.findByText('Тестовый тест');

    fireEvent.click(await screen.findByText('Редактировать тест'));
    const editForm = screen.getByRole('button', { name: 'Сохранить изменения' }).closest('form');
    const [editTitleInput, editDescriptionInput] = within(editForm).getAllByRole('textbox');
    fireEvent.change(editTitleInput, { target: { value: ' Обновленный тест ' } });
    fireEvent.change(editDescriptionInput, { target: { value: ' Новое описание ' } });
    fireEvent.change(within(editForm).getByRole('spinbutton'), { target: { value: '1' } });
    fireEvent.submit(editForm);
    await waitFor(() => expect(testsAPI.update).toHaveBeenCalledWith(10, {
      title: 'Обновленный тест',
      description: 'Новое описание',
      questionLimit: 1,
    }));

    fireEvent.click(screen.getByText('Редактировать тест'));
    fireEvent.click(screen.getByText('Отмена'));
    fireEvent.click(screen.getByText('Удалить выбранный тест'));
    await waitFor(() => expect(testsAPI.delete).toHaveBeenCalledWith(10));
  });

  test('creates, edits, validates and deletes questions', async () => {
    mockLoadedConstructor();
    testsAPI.createQuestion.mockResolvedValue({});
    testsAPI.updateQuestion.mockResolvedValue({});
    testsAPI.deleteQuestion.mockResolvedValue({});

    renderQuestionsAdmin();
    await screen.findByText('Тестовый тест');

    fireEvent.click(screen.getByText('Добавить вопрос'));
    const questionForm = screen.getByRole('button', { name: 'Сохранить вопрос' }).closest('form');
    fireEvent.change(within(questionForm).getAllByRole('textbox')[0], { target: { value: ' Новый вопрос? ' } });
    fireEvent.change(screen.getByPlaceholderText('Вариант 1'), { target: { value: ' A ' } });
    fireEvent.change(screen.getByPlaceholderText('Вариант 2'), { target: { value: ' B ' } });
    fireEvent.click(screen.getByPlaceholderText('Вариант 1').closest('div').querySelector('input[type="radio"]'));
    fireEvent.submit(questionForm);
    await waitFor(() => expect(testsAPI.createQuestion).toHaveBeenCalledWith(10, {
      question: 'Новый вопрос?',
      type: 'single',
      options: ['A', 'B'],
      correct: [0],
    }));

    fireEvent.click(await screen.findByText('Добавить вопрос'));
    fireEvent.submit(screen.getByRole('button', { name: 'Сохранить вопрос' }).closest('form'));
    expect(window.alert).toHaveBeenCalled();

    const firstCard = screen.getByText('Первый вопрос?').closest('div');
    fireEvent.click(within(firstCard).getByText('Редактировать'));
    const editQuestionForm = screen.getByRole('button', { name: 'Сохранить изменения' }).closest('form');
    fireEvent.change(within(editQuestionForm).getAllByRole('combobox')[0], { target: { value: 'matching' } });
    fireEvent.change(screen.getByPlaceholderText('Левая часть 1'), { target: { value: 'L1' } });
    fireEvent.change(screen.getByPlaceholderText('Правая часть 1'), { target: { value: 'R1' } });
    fireEvent.change(screen.getByPlaceholderText('Левая часть 2'), { target: { value: 'L2' } });
    fireEvent.change(screen.getByPlaceholderText('Правая часть 2'), { target: { value: 'R2' } });
    fireEvent.change(screen.getByPlaceholderText('Левая часть 3'), { target: { value: 'L3' } });
    fireEvent.change(screen.getByPlaceholderText('Правая часть 3'), { target: { value: 'R3' } });
    fireEvent.change(screen.getAllByText('Выберите левую часть')[0].closest('select'), { target: { value: '0' } });
    fireEvent.change(screen.getAllByText('Выберите левую часть')[1].closest('select'), { target: { value: '1' } });
    fireEvent.change(screen.getAllByText('Выберите левую часть')[2].closest('select'), { target: { value: '2' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Сохранить изменения' }).closest('form'));
    await waitFor(() => expect(testsAPI.updateQuestion).toHaveBeenCalledWith(10, 100, {
      question: 'Первый вопрос?',
      type: 'matching',
      left: ['L1', 'L2', 'L3'],
      right: ['R1', 'R2', 'R3'],
      correct: [0, 1, 2],
    }));

    fireEvent.click(within(firstCard).getByText('Удалить'));
    await waitFor(() => expect(testsAPI.deleteQuestion).toHaveBeenCalledWith(10, 100));
  });

  test('updates dynamic option and matching form rows', async () => {
    mockLoadedConstructor();
    renderQuestionsAdmin();
    await screen.findByText('Тестовый тест');

    fireEvent.click(screen.getByText('Добавить вопрос'));
    let form = screen.getByRole('button', { name: 'Сохранить вопрос' }).closest('form');
    fireEvent.change(within(form).getAllByRole('combobox')[0], { target: { value: 'multiple' } });
    fireEvent.change(screen.getByPlaceholderText('Вариант 1'), { target: { value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('Вариант 2'), { target: { value: 'B' } });
    fireEvent.click(screen.getByPlaceholderText('Вариант 1').closest('div').querySelector('input[type="checkbox"]'));
    fireEvent.click(screen.getByPlaceholderText('Вариант 1').closest('div').querySelector('input[type="checkbox"]'));
    fireEvent.click(screen.getByPlaceholderText('Вариант 2').closest('div').querySelector('input[type="checkbox"]'));
    fireEvent.click(screen.getByText('Добавить вариант'));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить вариант 1' }));
    fireEvent.click(screen.getByText('Сбросить форму'));
    expect(screen.queryByRole('button', { name: 'Сохранить вопрос' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Добавить вопрос'));
    form = screen.getByRole('button', { name: 'Сохранить вопрос' }).closest('form');
    fireEvent.change(within(form).getAllByRole('combobox')[0], { target: { value: 'matching' } });
    fireEvent.click(screen.getByText('Добавить пару'));
    fireEvent.change(screen.getAllByText('Выберите левую часть')[0].closest('select'), { target: { value: '0' } });
    fireEvent.change(screen.getAllByText('Выберите левую часть')[1].closest('select'), { target: { value: '1' } });
    fireEvent.change(screen.getAllByText('Выберите левую часть')[2].closest('select'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Удалить пару 2' }));
    expect(screen.getAllByRole('button', { name: /Удалить пару/ })).toHaveLength(3);
  });

  test('handles load and mutation failures plus cancelled deletes', async () => {
    testsAPI.getManageable.mockRejectedValueOnce(new Error('load failed'));
    const failedLoad = renderQuestionsAdmin();
    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Failed to load tests:', expect.any(Error)));
    failedLoad.unmount();
    cleanup();

    mockLoadedConstructor();
    testsAPI.getManageQuestions.mockRejectedValueOnce(new Error('questions failed'));
    resultsAPI.getStats.mockRejectedValueOnce(new Error('stats failed'));
    testsAPI.create.mockRejectedValue({ response: { data: { error: 'create test error' } } });
    testsAPI.update.mockRejectedValue({ response: { data: { error: 'update test error' } } });
    testsAPI.delete.mockRejectedValue({ response: { data: { error: 'delete test error' } } });
    testsAPI.createQuestion.mockRejectedValue({ response: { data: { error: 'create question error' } } });
    testsAPI.deleteQuestion.mockRejectedValue({ response: { data: { error: 'delete question error' } } });
    window.confirm.mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValue(true);

    renderQuestionsAdmin();
    await screen.findByText('У этого теста пока нет вопросов.');

    fireEvent.click(screen.getAllByText('Создать тест').pop());
    const failedCreateForm = screen.getByRole('button', { name: 'Сохранить тест' }).closest('form');
    fireEvent.change(within(failedCreateForm).getAllByRole('textbox')[0], { target: { value: 'Ошибка' } });
    fireEvent.submit(failedCreateForm);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('create test error'));

    fireEvent.click(screen.getByText('Редактировать тест'));
    fireEvent.submit(screen.getByRole('button', { name: 'Сохранить изменения' }).closest('form'));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('update test error'));

    fireEvent.click(screen.getByText('Удалить выбранный тест'));
    expect(testsAPI.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Удалить выбранный тест'));
    expect(testsAPI.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Добавить вопрос'));
    const failedQuestionForm = screen.getByRole('button', { name: 'Сохранить вопрос' }).closest('form');
    fireEvent.change(within(failedQuestionForm).getAllByRole('textbox')[0], { target: { value: 'Новый вопрос?' } });
    fireEvent.submit(failedQuestionForm);
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });
});


