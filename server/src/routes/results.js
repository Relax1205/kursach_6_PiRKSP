const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const resultController = require('../controllers/resultController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');

router.post('/',
  auth,
  [
    body('testId').isInt({ min: 1 }).withMessage('Некорректный id теста').toInt(),
    body('durationSeconds')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 86400 })
      .withMessage('Время прохождения должно быть от 0 до 86400 секунд')
      .toInt()
  ],
  validate,
  resultController.saveResult
);
router.get('/my', auth, resultController.getUserResults);
router.get('/:id/mistakes',
  auth,
  [
    param('id').isInt({ min: 1 }).withMessage('Некорректный id результата').toInt()
  ],
  validate,
  resultController.getResultMistakes
);
router.get('/test/:testId/stats',
  auth,
  role('teacher', 'admin'),
  [
    param('testId').isInt({ min: 1 }).withMessage('Некорректный id теста').toInt()
  ],
  validate,
  resultController.getTestStatistics
);

module.exports = router;
