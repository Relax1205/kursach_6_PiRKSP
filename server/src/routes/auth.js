const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register',
  [
    body('email').isEmail().withMessage('Неверный формат email'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
    body('name').notEmpty().withMessage('Имя обязательно')
  ],
  validate,
  authController.register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Неверный формат email'),
    body('password').notEmpty().withMessage('Пароль обязателен')
  ],
  validate,
  authController.login
);

router.get('/profile', auth, authController.getProfile);

module.exports = router;