const toInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : null;
};

const sanitizeArrayAnswer = (answer) => {
  if (!Array.isArray(answer)) {
    return [];
  }

  return [...new Set(
    answer
      .map(toInteger)
      .filter((value) => value !== null)
  )].sort((left, right) => left - right);
};

const sanitizeMatchingAnswer = (answer) => {
  if (!answer || Array.isArray(answer) || typeof answer !== 'object') {
    return {};
  }

  return Object.entries(answer).reduce((accumulator, [rightIndex, leftIndex]) => {
    const normalizedRightIndex = toInteger(rightIndex);
    const normalizedLeftIndex = toInteger(leftIndex);

    if (normalizedRightIndex !== null && normalizedLeftIndex !== null) {
      accumulator[normalizedRightIndex] = normalizedLeftIndex;
    }

    return accumulator;
  }, {});
};

const sanitizeAnswerPayload = (answer) => {
  if (Array.isArray(answer)) {
    return sanitizeArrayAnswer(answer);
  }

  if (answer && typeof answer === 'object') {
    return sanitizeMatchingAnswer(answer);
  }

  return [];
};

const sanitizeSubmittedAnswers = (answers = []) => {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers.reduce((accumulator, answerEntry) => {
    const questionId = toInteger(answerEntry?.questionId);

    if (questionId === null) {
      return accumulator;
    }

    accumulator.push({
      questionId,
      answer: sanitizeAnswerPayload(answerEntry.answer)
    });

    return accumulator;
  }, []);
};

const areArrayAnswersEqual = (answer, correct) => {
  const normalizedAnswer = sanitizeArrayAnswer(answer);
  const normalizedCorrect = sanitizeArrayAnswer(correct);

  if (normalizedAnswer.length !== normalizedCorrect.length) {
    return false;
  }

  return normalizedAnswer.every((value, index) => value === normalizedCorrect[index]);
};

const areMatchingAnswersEqual = (answer, correct) => {
  const normalizedAnswer = sanitizeMatchingAnswer(answer);
  const normalizedCorrect = Array.isArray(correct) ? correct.map(toInteger) : [];

  if (normalizedCorrect.some((value) => value === null)) {
    return false;
  }

  if (Object.keys(normalizedAnswer).length !== normalizedCorrect.length) {
    return false;
  }

  return normalizedCorrect.every((expectedLeftIndex, rightIndex) => {
    return normalizedAnswer[rightIndex] === expectedLeftIndex;
  });
};

const isAnswerCorrect = (question, answer) => {
  if (!question) {
    return false;
  }

  if (question.type === 'matching') {
    return areMatchingAnswersEqual(answer, question.correct);
  }

  return areArrayAnswersEqual(answer, question.correct);
};

const evaluateAnswers = (questions, answers = []) => {
  const normalizedAnswers = sanitizeSubmittedAnswers(answers);
  const answersByQuestionId = new Map(
    normalizedAnswers.map((answerEntry) => [answerEntry.questionId, answerEntry.answer])
  );

  let score = 0;
  const incorrectQuestionIds = [];

  for (const question of questions) {
    if (isAnswerCorrect(question, answersByQuestionId.get(question.id))) {
      score += 1;
      continue;
    }

    incorrectQuestionIds.push(question.id);
  }

  return {
    score,
    totalQuestions: questions.length,
    incorrectQuestionIds,
    answers: normalizedAnswers
  };
};

module.exports = {
  evaluateAnswers,
  sanitizeSubmittedAnswers,
  sanitizeAnswerPayload
};
