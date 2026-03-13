const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const testController = require('../controllers/testController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');

// Публичные маршруты
router.get('/', testController.getAllTests);
router.get('/:id', testController.getTestById);
router.get('/:id/questions', testController.getTestQuestions);

// Защищённые маршруты (только авторизованные)
router.post('/',
  auth,
  role('teacher', 'admin'),
  [
    body('title').isLength({ min: 5, max: 200 }).withMessage('Название от 5 до 200 символов'),
    body('questions').isArray().withMessage('Вопросы должны быть массивом')
  ],
  validate,
  testController.createTest
);

router.put('/:id',
  auth,
  testController.updateTest
);

router.delete('/:id',
  auth,
  role('teacher', 'admin'),
  testController.deleteTest
);

module.exports = router;