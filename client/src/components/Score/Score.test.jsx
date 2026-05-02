import { render, screen } from '@testing-library/react';

import Score, { formatRemainingTime } from './Score';

describe('Score', () => {
  test('formats remaining time safely', () => {
    expect(formatRemainingTime(65)).toBe('1:05');
    expect(formatRemainingTime(-10)).toBe('0:00');
    expect(formatRemainingTime(null)).toBe('0:00');
  });

  test('renders question progress without timer', () => {
    render(<Score current={1} total={4} mode="main" />);

    expect(screen.getByText('Пройдено вопросов: 1 / 4')).toBeInTheDocument();
    expect(screen.queryByText(/Осталось/)).not.toBeInTheDocument();
  });

  test('renders a non-warning timer', () => {
    render(<Score current={1} total={2} mode="main" remainingSeconds={90} timeLimitSeconds={120} />);

    expect(screen.getByText('Осталось: 1:30')).toBeInTheDocument();
  });

  test('renders wrong mode and warning timer', () => {
    render(<Score current={2} total={3} mode="wrong" remainingSeconds={60} timeLimitSeconds={180} />);

    expect(screen.getByText('Ошибка 2 из 3')).toBeInTheDocument();
    expect(screen.getByText('Осталось: 1:00')).toBeInTheDocument();
  });
});

