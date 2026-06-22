const assert = require('assert');

const {
  evaluateAnswers,
  isAnswerCorrect,
  sanitizeAnswerPayload,
  sanitizeSubmittedAnswers
} = require('../../src/utils/grading');

const MAX_ENTRIES = 64;

const takeByte = (data, cursor) => {
  if (data.length === 0) {
    return 0;
  }

  const value = data[cursor.value % data.length];
  cursor.value += 1;
  return value;
};

const takeInteger = (data, cursor) => {
  const magnitude = takeByte(data, cursor);
  return takeByte(data, cursor) % 2 === 0 ? magnitude : -magnitude;
};

const takeAnswer = (data, cursor) => {
  const answerType = takeByte(data, cursor) % 5;
  const answerLength = takeByte(data, cursor) % 6;

  if (answerType <= 1) {
    return Array.from({ length: answerLength }, () => takeInteger(data, cursor));
  }

  if (answerType === 2) {
    const answer = {};

    for (let index = 0; index < answerLength; index += 1) {
      answer[takeInteger(data, cursor)] = takeInteger(data, cursor);
    }

    return answer;
  }

  if (answerType === 3) {
    return String.fromCharCode(...Array.from(
      { length: answerLength },
      () => takeByte(data, cursor)
    ));
  }

  return null;
};

const decodeBinaryInput = (data) => {
  const cursor = { value: 0 };
  const questionCount = takeByte(data, cursor) % 9;
  const answerCount = takeByte(data, cursor) % 12;
  const questionTypes = ['single', 'multiple', 'matching', 'unknown'];
  const questions = [];
  const answers = [];

  for (let index = 0; index < questionCount; index += 1) {
    questions.push({
      id: takeInteger(data, cursor),
      type: questionTypes[takeByte(data, cursor) % questionTypes.length],
      correct: takeAnswer(data, cursor)
    });
  }

  for (let index = 0; index < answerCount; index += 1) {
    answers.push({
      questionId: takeInteger(data, cursor),
      answer: takeAnswer(data, cursor)
    });
  }

  return { questions, answers, candidate: takeAnswer(data, cursor) };
};

const decodeInput = (data) => {
  try {
    const parsed = JSON.parse(data.toString('utf8'));

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        questions: Array.isArray(parsed.questions)
          ? parsed.questions.slice(0, MAX_ENTRIES)
          : [],
        answers: parsed.answers,
        candidate: parsed.candidate
      };
    }
  } catch (error) {
    // Invalid JSON is intentionally converted into a structured input below.
  }

  return decodeBinaryInput(data);
};

const assertNormalizedAnswer = (answer) => {
  if (Array.isArray(answer)) {
    assert(answer.every(Number.isInteger), 'Array answer contains a non-integer');
    assert.strictEqual(new Set(answer).size, answer.length, 'Array answer contains duplicates');

    for (let index = 1; index < answer.length; index += 1) {
      assert(answer[index - 1] < answer[index], 'Array answer is not sorted');
    }

    return;
  }

  assert(answer && typeof answer === 'object', 'Normalized answer is not an object');
  assert(Object.values(answer).every(Number.isInteger), 'Matching answer contains a non-integer');
  assert(Object.keys(answer).every((key) => Number.isInteger(Number(key))), 'Matching key is not an integer');
};

module.exports.fuzz = function fuzz(data) {
  const { questions, answers, candidate } = decodeInput(data);
  const normalizedCandidate = sanitizeAnswerPayload(candidate);
  const normalizedAnswers = sanitizeSubmittedAnswers(answers);
  const result = evaluateAnswers(questions, answers);

  assertNormalizedAnswer(normalizedCandidate);
  normalizedAnswers.forEach((entry) => {
    assert(Number.isInteger(entry.questionId), 'Normalized question id is not an integer');
    assertNormalizedAnswer(entry.answer);
  });

  assert.deepStrictEqual(
    sanitizeSubmittedAnswers(normalizedAnswers),
    normalizedAnswers,
    'Answer normalization is not idempotent'
  );
  assert.deepStrictEqual(result.answers, normalizedAnswers, 'Evaluation uses non-normalized answers');
  assert(Number.isInteger(result.score), 'Score is not an integer');
  assert(result.score >= 0 && result.score <= questions.length, 'Score is outside valid bounds');
  assert.strictEqual(result.totalQuestions, questions.length, 'Total question count is inconsistent');
  assert.strictEqual(
    result.incorrectQuestionIds.length,
    questions.length - result.score,
    'Incorrect question count is inconsistent'
  );

  const answersByQuestionId = new Map(
    normalizedAnswers.map((entry) => [entry.questionId, entry.answer])
  );
  const expectedIncorrectIds = questions
    .filter((question) => !isAnswerCorrect(question, answersByQuestionId.get(question?.id)))
    .map((question) => question?.id);

  assert.deepStrictEqual(
    result.incorrectQuestionIds,
    expectedIncorrectIds,
    'Evaluation result does not match the grading oracle'
  );
};
