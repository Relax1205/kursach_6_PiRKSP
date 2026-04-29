const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const validate = require('../middleware/validate');
const { ROLE_VALUES } = require('../constants/roles');

router.use(auth, role('admin'));

router.get('/users', adminController.getUsers);

router.patch('/users/:id/role',
  [
    param('id').isInt({ min: 1 }).withMessage('Некорректный id пользователя').toInt(),
    body('role').isIn(ROLE_VALUES).withMessage('Некорректная роль')
  ],
  validate,
  adminController.updateUserRole
);

router.delete('/users/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Некорректный id пользователя').toInt()
  ],
  validate,
  adminController.deleteUser
);

router.get('/tests', adminController.getTests);

router.patch('/tests/:id/moderation',
  [
    param('id').isInt({ min: 1 }).withMessage('Некорректный id теста').toInt(),
    body('isActive').isBoolean().withMessage('Статус публикации должен быть boolean').toBoolean()
  ],
  validate,
  adminController.updateTestModeration
);

router.get('/settings', adminController.getSettings);

router.patch('/settings',
  [
    body('settings').isObject().withMessage('Настройки должны быть объектом'),
    body('settings.platformName')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Название системы должно быть от 1 до 100 символов'),
    body('settings.publicRegistrationEnabled')
      .optional()
      .isBoolean()
      .withMessage('Флаг регистрации должен быть boolean')
      .toBoolean(),
    body('settings.teacherTestsRequireModeration')
      .optional()
      .isBoolean()
      .withMessage('Флаг модерации должен быть boolean')
      .toBoolean()
  ],
  validate,
  adminController.updateSettings
);

module.exports = router;
