import { screen, waitFor } from '@testing-library/react';

import Test, { formatMinuteLimit, formatQuestionCount } from './Test';
import { testsAPI } from '../../services/api';
import { renderWithProviders } from '../../test-utils/render';

jest.mock('../../services/api', () => ({
  testsAPI: {
    getAll: jest.fn(),
  },
}));

describe('Test page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('formats Russian question and minute counts', () => {
    expect(formatQuestionCount(1)).toBe('1 вопрос');
    expect(formatQuestionCount(2)).toBe('2 вопроса');
    expect(formatQuestionCount(5)).toBe('5 вопросов');
    expect(formatQuestionCount(11)).toBe('11 вопросов');
    expect(formatQuestionCount(undefined)).toBe('0 вопросов');

    expect(formatMinuteLimit(1)).toBe('1 минута');
    expect(formatMinuteLimit(3)).toBe('3 минуты');
    expect(formatMinuteLimit(8)).toBe('8 минут');
    expect(formatMinuteLimit(12)).toBe('12 минут');
    expect(formatMinuteLimit(undefined)).toBe('0 минут');
  });

  test('renders loaded tests and time limits', async () => {
    testsAPI.getAll.mockResolvedValue({
      data: [{
        id: 1,
        title: 'Тест по JS',
        description: 'Описание',
        questionCount: 10,
      }],
    });

    renderWithProviders(<Test />);
    expect(screen.getByText('Загрузка тестов...')).toBeInTheDocument();

    expect(await screen.findByText('Тест по JS')).toBeInTheDocument();
    expect(screen.getByText('10 вопросов')).toBeInTheDocument();
    expect(screen.getByText('Время: 10 минут')).toBeInTheDocument();
  });

  test('renders empty state on empty and failed loads', async () => {
    testsAPI.getAll.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('boom'));
    const { unmount } = renderWithProviders(<Test />);

    expect(await screen.findByText(/Тесты пока не созданы/)).toBeInTheDocument();
    unmount();

    renderWithProviders(<Test />);
    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Failed to load tests:', expect.any(Error)));
    expect(await screen.findByText(/Тесты пока не созданы/)).toBeInTheDocument();
  });
});

