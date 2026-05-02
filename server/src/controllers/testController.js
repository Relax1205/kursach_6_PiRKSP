const { Op } = require('sequelize');
const { sequelize, Test, Question, TestResult, User } = require('../models');
const { ROLES, canAccessTest } = require('../constants/roles');
const { getSettingValue } = require('../services/systemSettings');
const { evaluateAnswers } = require('../utils/grading');

const normalizeDurationSeconds = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.min(numericValue, 86400);
};

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

const addQuestionCounts = async (test) => {
  const availableQuestionCount = await Question.count({ where: { testId: test.id } });
  const questionLimit = normalizeQuestionLimit(test.questionLimit, availableQuestionCount);
  const questionCount = questionLimit || availableQuestionCount;

  return {
    ...test.toJSON(),
    availableQuestionCount,
    questionCount
  };
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

    const testsWithQuestionCounts = await Promise.all(tests.map(addQuestionCounts));

    res.json(testsWithQuestionCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getManageableTests = async (req, res) => {
  try {
    const where = req.user.role === ROLES.ADMIN
      ? {}
      : { authorId: req.user.id };

    const tests = await Test.findAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      order: [['id', 'ASC']]
    });

    const testsWithQuestionCounts = await Promise.all(tests.map(addQuestionCounts));
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

    if (!canAccessTest(req.user, test)) {
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

    if (!canAccessTest(req.user, test)) {
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
    const teacherTestsRequireModeration = await getSettingValue('teacherTestsRequireModeration');
    const normalizedQuestionLimit = normalizeQuestionLimit(questionLimit, questions?.length || null);
    const isActive = req.user.role === ROLES.ADMIN
      ? req.body.isActive !== false
      : !teacherTestsRequireModeration;

    const test = await Test.create({
      title,
      description,
      questionLimit: normalizedQuestionLimit,
      authorId: req.user.id,
      isActive
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
    const updatePayload = {};

    if (title !== undefined) {
      updatePayload.title = title;
    }

    if (description !== undefined) {
      updatePayload.description = description;
    }

    if (questionLimit !== undefined) {
      updatePayload.questionLimit = normalizeQuestionLimit(questionLimit, questionCount);
    }

    if (isActive !== undefined && req.user.role === ROLES.ADMIN) {
      updatePayload.isActive = isActive;
    } else if (isActive !== undefined) {
      const teacherTestsRequireModeration = await getSettingValue('teacherTestsRequireModeration');

      if (teacherTestsRequireModeration && Boolean(isActive) && !test.isActive) {
        return res.status(403).json({ error: 'Публикацию теста должен подтвердить администратор.' });
      }

      updatePayload.isActive = isActive;
    }

    await test.update(updatePayload);

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

    await sequelize.transaction(async (transaction) => {
      await TestResult.destroy({
        where: { testId: test.id },
        transaction
      });

      await Question.destroy({
        where: { testId: test.id },
        transaction
      });

      await test.destroy({ transaction });
    });

    res.json({ message: 'Тест успешно удалён' });
  } catch (error) {
    res.status(500).json({ error: 'Не удалось удалить тест.' });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const testId = Number(req.params.id);
    const test = await Test.findByPk(testId);
    const isPracticeSubmission = req.user && req.body.persistResult === false;

    if (!test || (!canAccessTest(req.user, test) && !isPracticeSubmission)) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

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
        durationSeconds: normalizeDurationSeconds(req.body.durationSeconds),
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
