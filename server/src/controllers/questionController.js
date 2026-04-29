const { Test, Question } = require('../models');

const ensureTestAccess = async (testId, user) => {
  const test = await Test.findByPk(testId);

  if (!test) {
    return {
      error: {
        status: 404,
        message: 'Тест не найден.'
      }
    };
  }

  if (test.authorId !== user.id && user.role !== 'admin') {
    return {
      error: {
        status: 403,
        message: 'Нет прав для управления этим тестом.'
      }
    };
  }

  return { test };
};

const buildQuestionPayload = (body, fallbackOrder = 0) => {
  const payload = {
    type: body.type || 'single',
    questionText: body.question,
    options: null,
    left: null,
    right: null,
    correct: body.correct,
    order: Number.isInteger(Number(body.order)) ? Number(body.order) : fallbackOrder
  };

  if (payload.type === 'matching') {
    payload.left = (body.left || []).map((value) => value.trim());
    payload.right = (body.right || []).map((value) => value.trim());
    payload.correct = (body.correct || []).map(Number);
  } else {
    payload.options = body.options || [];
  }

  return payload;
};

exports.getManageQuestions = async (req, res) => {
  try {
    const access = await ensureTestAccess(req.params.id, req.user);

    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

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

exports.createQuestion = async (req, res) => {
  try {
    const testId = Number(req.params.id);
    const access = await ensureTestAccess(testId, req.user);

    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const questionCount = await Question.count({ where: { testId } });
    const question = await Question.create({
      testId,
      ...buildQuestionPayload(req.body, questionCount)
    });

    res.status(201).json({
      message: 'Вопрос успешно создан.',
      question
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const testId = Number(req.params.id);
    const access = await ensureTestAccess(testId, req.user);

    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const question = await Question.findOne({
      where: {
        id: req.params.questionId,
        testId
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Вопрос не найден.' });
    }

    await question.update(buildQuestionPayload(req.body, question.order));

    res.json({
      message: 'Вопрос успешно обновлён.',
      question
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const testId = Number(req.params.id);
    const access = await ensureTestAccess(testId, req.user);

    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const question = await Question.findOne({
      where: {
        id: req.params.questionId,
        testId
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Вопрос не найден.' });
    }

    await question.destroy();

    res.json({ message: 'Вопрос успешно удалён.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
