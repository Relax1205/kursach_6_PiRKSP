const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const testController = require('../controllers/testController');
const questionController = require('../controllers/questionController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');

const questionValidationRules = [
  body('question')
    .isLength({ min: 5, max: 500 })
    .withMessage('Текст вопроса должен быть от 5 до 500 символов'),
  body('type')
    .isIn(['single', 'multiple', 'matching'])
    .withMessage('Некорректный тип вопроса'),
  body('correct')
    .isArray({ min: 1 })
    .withMessage('Нужно указать хотя бы один правильный ответ'),
  body('options').custom((value, { req }) => {
    if (req.body.type === 'matching') {
      return true;
    }

    if (!Array.isArray(value) || value.length < 2) {
      throw new Error('Для вопроса нужно минимум два варианта ответа');
    }

    return true;
  }),
  body('left').custom((value, { req }) => {
    if (req.body.type !== 'matching') {
      return true;
    }

    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('Для matching-вопроса нужен левый список');
    }

    return true;
  }),
  body('right').custom((value, { req }) => {
    if (req.body.type !== 'matching') {
      return true;
    }

    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('Для matching-вопроса нужен правый список');
    }

    if (!Array.isArray(req.body.left) || value.length !== req.body.left.length) {
      throw new Error('Для matching-вопроса списки left и right должны быть одинаковой длины');
    }

    return true;
  }),
  body('correct').custom((value, { req }) => {
    if (req.body.type !== 'matching') {
      return true;
    }

    if (!Array.isArray(req.body.right) || value.length !== req.body.right.length) {
      throw new Error('Для matching-вопроса нужно указать соответствие для каждого элемента');
    }

    return true;
  })
];

const testIdValidationRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Некорректный id теста')
    .toInt()
];

const questionIdValidationRules = [
  param('questionId')
    .isInt({ min: 1 })
    .withMessage('Некорректный id вопроса')
    .toInt()
];

const questionLimitValidationRule = body('questionLimit')
  .optional({ nullable: true })
  .isInt({ min: 1, max: 500 })
  .withMessage('Количество вопросов должно быть от 1 до 500')
  .toInt();

router.get('/', testController.getAllTests);
router.get('/:id', testIdValidationRules, validate, testController.getTestById);
router.get('/:id/questions/manage', auth, role('teacher', 'admin'), testIdValidationRules, validate, questionController.getManageQuestions);
router.get('/:id/questions', testIdValidationRules, validate, testController.getTestQuestions);
router.post('/:id/submit', testIdValidationRules, validate, optionalAuth, testController.submitTest);

router.post('/',
  auth,
  role('teacher', 'admin'),
  [
    body('title').isLength({ min: 5, max: 200 }).withMessage('Название от 5 до 200 символов'),
    body('questions').isArray().withMessage('Вопросы должны быть массивом'),
    questionLimitValidationRule
  ],
  validate,
  testController.createTest
);

router.put('/:id',
  auth,
  testIdValidationRules,
  questionLimitValidationRule,
  validate,
  testController.updateTest
);

router.delete('/:id',
  auth,
  role('teacher', 'admin'),
  testIdValidationRules,
  validate,
  testController.deleteTest
);

router.post('/:id/questions',
  auth,
  role('teacher', 'admin'),
  testIdValidationRules,
  questionValidationRules,
  validate,
  questionController.createQuestion
);

router.put('/:id/questions/:questionId',
  auth,
  role('teacher', 'admin'),
  testIdValidationRules,
  questionIdValidationRules,
  questionValidationRules,
  validate,
  questionController.updateQuestion
);

router.delete('/:id/questions/:questionId',
  auth,
  role('teacher', 'admin'),
  testIdValidationRules,
  questionIdValidationRules,
  validate,
  questionController.deleteQuestion
);

module.exports = router;
