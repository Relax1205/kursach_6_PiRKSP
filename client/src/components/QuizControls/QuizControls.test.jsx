import { fireEvent, render, screen } from '@testing-library/react';

import QuizControls from './QuizControls';

describe('QuizControls', () => {
  test('renders previous and next controls', () => {
    const onNext = jest.fn();
    const onPrev = jest.fn();

    render(
      <QuizControls
        currentQuestion={0}
        totalQuestions={2}
        isSubmitting={false}
        onNext={onNext}
        onPrev={onPrev}
        onFinish={jest.fn()}
      />
    );

    expect(screen.getByText('Назад')).toBeDisabled();
    fireEvent.click(screen.getByText('Вперёд'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });

  test('renders finish button and disables controls while submitting', () => {
    render(
      <QuizControls
        currentQuestion={1}
        totalQuestions={2}
        isSubmitting
        onNext={jest.fn()}
        onPrev={jest.fn()}
        onFinish={jest.fn()}
      />
    );

    expect(screen.getByText('Назад')).toBeDisabled();
    expect(screen.getByText('Отправка...')).toBeDisabled();
  });

  test('calls previous and finish callbacks', () => {
    const onPrev = jest.fn();
    const onFinish = jest.fn();

    render(
      <QuizControls
        currentQuestion={1}
        totalQuestions={2}
        isSubmitting={false}
        onNext={jest.fn()}
        onPrev={onPrev}
        onFinish={onFinish}
      />
    );

    fireEvent.click(screen.getByText('Назад'));
    fireEvent.click(screen.getByText('Завершить тест'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

