const { TestResult, Question } = require('../models');

// Сохранить результат теста
exports.saveResult = async (req, res) => {
  try {
    const { testId, score, total, answers } = req.body;

    const result = await TestResult.create({
      userId: req.user.id,
      testId,
      score,
      totalQuestions: total,
      answers: answers || []
    });

    res.status(201).json({
      message: 'Результат сохранён',
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить результаты пользователя
exports.getUserResults = async (req, res) => {
  try {
    const results = await TestResult.findAll({
      where: { userId: req.user.id },
      include: [{
        model: require('../models').Test,
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

// Получить статистику теста (только преподаватель/админ)
exports.getTestStatistics = async (req, res) => {
  try {
    const { testId } = req.params;

    const results = await TestResult.findAll({
      where: { testId },
      include: [{
        model: require('../models').User,
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