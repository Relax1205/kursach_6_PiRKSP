const { sequelize, User, Test, Question, TestResult } = require('../models');
const { ROLE_VALUES, ROLES } = require('../constants/roles');
const { getSettings, updateSettings } = require('../services/systemSettings');

const serializeUser = async (user) => {
  const [testCount, resultCount] = await Promise.all([
    Test.count({ where: { authorId: user.id } }),
    TestResult.count({ where: { userId: user.id } })
  ]);

  return {
    ...user.toJSON(),
    testCount,
    resultCount
  };
};

const serializeTest = async (test) => {
  const [questionCount, results] = await Promise.all([
    Question.count({ where: { testId: test.id } }),
    TestResult.findAll({
      where: { testId: test.id },
      attributes: ['score']
    })
  ]);

  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
    : 0;

  return {
    ...test.toJSON(),
    questionCount,
    totalAttempts: results.length,
    averageScore
  };
};

const isLastAdmin = async (user) => {
  if (user.role !== ROLES.ADMIN) {
    return false;
  }

  const adminCount = await User.count({ where: { role: ROLES.ADMIN } });
  return adminCount <= 1;
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']]
    });

    const usersWithCounts = await Promise.all(users.map(serializeUser));
    res.json(usersWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    if (!ROLE_VALUES.includes(req.body.role)) {
      return res.status(400).json({ error: 'Некорректная роль.' });
    }

    if (user.role === ROLES.ADMIN && req.body.role !== ROLES.ADMIN && await isLastAdmin(user)) {
      return res.status(400).json({ error: 'Нельзя снять роль у последнего администратора.' });
    }

    await user.update({ role: req.body.role });
    res.json({ message: 'Роль пользователя обновлена.', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Нельзя удалить собственную учетную запись.' });
    }

    if (await isLastAdmin(user)) {
      return res.status(400).json({ error: 'Нельзя удалить последнего администратора.' });
    }

    await sequelize.transaction(async (transaction) => {
      await TestResult.destroy({
        where: { userId: user.id },
        transaction
      });

      await Test.update(
        { authorId: req.user.id },
        {
          where: { authorId: user.id },
          transaction
        }
      );

      await user.destroy({ transaction });
    });

    res.json({ message: 'Пользователь удалён. Его тесты переданы текущему администратору.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTests = async (req, res) => {
  try {
    const tests = await Test.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      order: [['id', 'ASC']]
    });

    const testsWithStats = await Promise.all(tests.map(serializeTest));
    res.json(testsWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTestModeration = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    await test.update({ isActive: req.body.isActive });
    res.json({ message: 'Статус публикации теста обновлён.', test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await updateSettings(req.body.settings || {}, req.user.id);
    res.json({ message: 'Системные настройки обновлены.', settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
