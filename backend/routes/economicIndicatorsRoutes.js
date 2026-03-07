const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { getEconomicIndicators } = require('../controllers/economicIndicatorsController');

const router = express.Router();

router.use(authenticate);

router.get('/', getEconomicIndicators);

module.exports = router;
