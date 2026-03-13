const { Test, Question, TestResult } = require('../models');

// Получить все тесты
exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.findAll({
      where: { isActive: true },
      include: [{
        model: require('../models').User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      attributes: { exclude: ['authorId'] }
    });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Получить тест по ID
exports.getTestById = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id, {
      include: [{
        model: require('../models').User,
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

// Получить вопросы теста
exports.getTestQuestions = async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { testId: req.params.id },
      order: [['order', 'ASC']],
      attributes: ['id', 'type', 'questionText', 'options', 'left', 'right', 'correct', 'order']
    });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Создать тест (только преподаватель/админ)
exports.createTest = async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    const test = await Test.create({
      title,
      description,
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
        model: require('../models').User,
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

// Обновить тест
exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Тест не найден.' });
    }

    // Проверка прав (только автор или админ)
    if (test.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав для редактирования этого теста.' });
    }

    const { title, description, isActive } = req.body;
    await test.update({ title, description, isActive });

    res.json({ message: 'Тест успешно обновлён', test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Удалить тест
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