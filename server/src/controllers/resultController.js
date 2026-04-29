const { Op } = require('sequelize');
const { Test, TestResult, Question, User } = require('../models');
const { canAccessTest, canManageTest } = require('../constants/roles');
const { evaluateAnswers } = require('../utils/grading');

exports.saveResult = async (req, res) => {
  try {
    const { testId, questionIds } = req.body;
    const test = await Test.findByPk(testId);

    if (!test || !canAccessTest(req.user, test)) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    const submittedQuestionIds = Array.isArray(questionIds)
      ? [...new Set(
          questionIds
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
      return res.status(404).json({ error: 'Вопросы для сохранения результата не найдены.' });
    }

    if (submittedQuestionIds.length > 0 && questions.length !== submittedQuestionIds.length) {
      return res.status(400).json({ error: 'Передан некорректный набор вопросов.' });
    }

    const evaluation = evaluateAnswers(questions, req.body.answers);

    const result = await TestResult.create({
      userId: req.user.id,
      testId,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      answers: evaluation.answers
    });

    res.status(201).json({
      message: 'Результат сохранён',
      result,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      incorrectQuestionIds: evaluation.incorrectQuestionIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserResults = async (req, res) => {
  try {
    const results = await TestResult.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Test,
        as: 'test',
        attributes: ['id', 'title']
      }],
      order: [['completedAt', 'DESC']]
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getResultMistakes = async (req, res) => {
  try {
    const result = await TestResult.findByPk(req.params.id, {
      include: [{
        model: Test,
        as: 'test',
        attributes: ['id', 'title', 'authorId', 'isActive', 'questionLimit']
      }]
    });

    if (!result) {
      return res.status(404).json({ error: 'Результат не найден.' });
    }

    const canViewResult = result.userId === req.user.id
      || req.user.role === 'admin'
      || canManageTest(req.user, result.test);

    if (!canViewResult) {
      return res.status(403).json({ error: 'Нет прав для просмотра этого результата.' });
    }

    const questions = await Question.findAll({
      where: { testId: result.testId },
      order: [['order', 'ASC']],
      attributes: ['id', 'type', 'questionText', 'options', 'left', 'right', 'correct', 'order']
    });

    const evaluation = evaluateAnswers(questions, result.answers);
    const incorrectQuestionIdSet = new Set(evaluation.incorrectQuestionIds);
    const incorrectQuestions = questions.filter((question) => incorrectQuestionIdSet.has(question.id));

    res.json(incorrectQuestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTestStatistics = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findByPk(testId);

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    if (!canManageTest(req.user, test)) {
      return res.status(403).json({ error: 'Нет прав для просмотра статистики этого теста.' });
    }

    const results = await TestResult.findAll({
      where: { testId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;

    res.json({
      testId,
      totalAttempts: results.length,
      averageScore,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
