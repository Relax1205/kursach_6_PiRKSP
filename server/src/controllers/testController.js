const { Op } = require('sequelize');
const { Test, Question, TestResult, User } = require('../models');
const { evaluateAnswers } = require('../utils/grading');

const normalizeQuestionLimit = (value, maxQuestions = null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    return null;
  }

  if (Number.isInteger(maxQuestions) && maxQuestions > 0) {
    return Math.min(numericValue, maxQuestions);
  }

  return numericValue;
};

exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.findAll({
      where: { isActive: true },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      attributes: { exclude: ['authorId'] },
      order: [['id', 'ASC']]
    });

    const testsWithQuestionCounts = await Promise.all(
      tests.map(async (test) => {
        const availableQuestionCount = await Question.count({ where: { testId: test.id } });
        const questionLimit = normalizeQuestionLimit(test.questionLimit, availableQuestionCount);
        const questionCount = questionLimit || availableQuestionCount;

        return {
          ...test.toJSON(),
          availableQuestionCount,
          questionCount
        };
      })
    );

    res.json(testsWithQuestionCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    const questions = await Question.findAll({
      where: { testId: req.params.id },
      order: [['order', 'ASC']],
      attributes: ['id', 'type', 'questionText', 'options', 'left', 'right', 'correct', 'order']
    });

    const questionLimit = normalizeQuestionLimit(test.questionLimit, questions.length);
    res.json(questionLimit ? questions.slice(0, questionLimit) : questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTest = async (req, res) => {
  try {
    const { title, description, questions, questionLimit } = req.body;
    const normalizedQuestionLimit = normalizeQuestionLimit(questionLimit, questions?.length || null);

    const test = await Test.create({
      title,
      description,
      questionLimit: normalizedQuestionLimit,
      authorId: req.user.id
    });

    if (questions && questions.length > 0) {
      const questionRecords = questions.map((q, index) => ({
        testId: test.id,
        type: q.type || 'single',
        questionText: q.question,
        options: q.options || null,
        left: q.left || null,
        right: q.right || null,
        correct: q.correct,
        order: index
      }));

      await Question.bulkCreate(questionRecords);
    }

    const createdTest = await Test.findByPk(test.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.status(201).json({
      message: 'Тест успешно создан',
      test: createdTest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    if (test.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для редактирования этого теста.' });
    }

    const questionCount = await Question.count({ where: { testId: test.id } });
    const { title, description, isActive, questionLimit } = req.body;
    await test.update({
      title,
      description,
      isActive,
      questionLimit: normalizeQuestionLimit(questionLimit, questionCount)
    });

    res.json({ message: 'Тест успешно обновлён', test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    if (test.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для удаления этого теста.' });
    }

    await test.destroy();
    res.json({ message: 'Тест успешно удалён' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const testId = Number(req.params.id);
    const submittedQuestionIds = Array.isArray(req.body.questionIds)
      ? [...new Set(
          req.body.questionIds
            .map((questionId) => Number(questionId))
            .filter((questionId) => Number.isInteger(questionId))
        )]
      : [];

    const questionWhere = { testId };
    if (submittedQuestionIds.length > 0) {
      questionWhere.id = { [Op.in]: submittedQuestionIds };
    }

    const questions = await Question.findAll({
      where: questionWhere,
      order: [['order', 'ASC']]
    });

    if (!questions.length) {
      return res.status(404).json({ error: 'Вопросы для отправки результата не найдены.' });
    }

    if (submittedQuestionIds.length > 0 && questions.length !== submittedQuestionIds.length) {
      return res.status(400).json({ error: 'Передан некорректный набор вопросов.' });
    }

    const evaluation = evaluateAnswers(questions, req.body.answers);
    let savedResult = null;
    const shouldPersistResult = req.user && req.body.persistResult !== false;

    if (shouldPersistResult) {
      savedResult = await TestResult.create({
        userId: req.user.id,
        testId,
        score: evaluation.score,
        totalQuestions: evaluation.totalQuestions,
        answers: evaluation.answers
      });
    }

    res.json({
      message: req.user
        ? shouldPersistResult
          ? 'Тест завершён, результат сохранён.'
          : 'Тест завершён без сохранения результата.'
        : 'Тест завершён. Войдите в систему, чтобы сохранять результаты.',
      saved: Boolean(savedResult),
      result: savedResult,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      incorrectQuestionIds: evaluation.incorrectQuestionIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
