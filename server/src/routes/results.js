const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.post('/', auth, resultController.saveResult);
router.get('/my', auth, resultController.getUserResults);
router.get('/test/:testId/stats', auth, role('teacher', 'admin'), resultController.getTestStatistics);

module.exports = router;