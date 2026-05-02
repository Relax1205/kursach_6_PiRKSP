const {
  evaluateAnswers,
  isAnswerCorrect,
  sanitizeAnswerPayload,
  sanitizeSubmittedAnswers,
} = require('../src/utils/grading');

describe('grading utils', () => {
  test('sanitizes array and matching answers', () => {
    expect(sanitizeAnswerPayload([2, '1', 1, '', null, 'bad'])).toEqual([1, 2]);
    expect(sanitizeAnswerPayload({ 0: '1', bad: 2, 2: null, 3: 'x' })).toEqual({ 0: 1 });
    expect(sanitizeAnswerPayload('bad')).toEqual([]);
  });

  test('sanitizes submitted answer payloads', () => {
    expect(sanitizeSubmittedAnswers()).toEqual([]);
    expect(sanitizeSubmittedAnswers('bad')).toEqual([]);
    expect(sanitizeSubmittedAnswers([
      { questionId: '1', answer: ['0'] },
      { questionId: 'x', answer: [1] },
      null,
    ])).toEqual([{ questionId: 1, answer: [0] }]);
  });

  test('evaluates single, multiple and matching answers', () => {
    const questions = [
      { id: 1, type: 'single', correct: [0] },
      { id: 2, type: 'multiple', correct: [0, 2] },
      { id: 3, type: 'matching', correct: [1, 0] },
      { id: 4, type: 'matching', correct: ['bad'] },
    ];

    expect(evaluateAnswers(questions, [
      { questionId: 1, answer: [0] },
      { questionId: 2, answer: [2, 0] },
      { questionId: 3, answer: { 0: 1, 1: 0 } },
      { questionId: 4, answer: { 0: 0 } },
    ])).toEqual({
      score: 3,
      totalQuestions: 4,
      incorrectQuestionIds: [4],
      answers: [
        { questionId: 1, answer: [0] },
        { questionId: 2, answer: [0, 2] },
        { questionId: 3, answer: { 0: 1, 1: 0 } },
        { questionId: 4, answer: { 0: 0 } },
      ],
    });
  });

  test('marks missing, malformed and mismatched answers as incorrect', () => {
    const result = evaluateAnswers([
      { id: 1, type: 'single', correct: [0, 1] },
      { id: 2, type: 'matching', correct: [0, 1] },
      { id: 3, type: 'single', correct: [0] },
      { id: 4, type: 'matching', correct: [0] },
    ], [
      { questionId: 1, answer: [0] },
      { questionId: 2, answer: { 0: 0 } },
      { questionId: 4, answer: [0] },
    ]);

    expect(result.score).toBe(0);
    expect(result.incorrectQuestionIds).toEqual([1, 2, 3, 4]);
  });

  test('exposes direct correctness checks for defensive branches', () => {
    expect(isAnswerCorrect(null, [0])).toBe(false);
    expect(isAnswerCorrect({ type: 'single', correct: [0] }, undefined)).toBe(false);
    expect(isAnswerCorrect({ type: 'matching', correct: [0] }, null)).toBe(false);
    expect(isAnswerCorrect({ type: 'matching', correct: null }, {})).toBe(false);
  });

  test('uses an empty answers list when evaluateAnswers is called without answers', () => {
    expect(evaluateAnswers([{ id: 10, type: 'single', correct: [0] }])).toEqual({
      score: 0,
      totalQuestions: 1,
      incorrectQuestionIds: [10],
      answers: [],
    });
  });
});
