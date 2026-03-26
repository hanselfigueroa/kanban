const express = require('express');
const router = express.Router();
const checkoutCtrl = require('../controllers/checkoutController');

// These must come before /:registrationId to avoid catch-all conflict
router.get('/success/:orderNumber', checkoutCtrl.showSuccess);
router.post('/webhook/paggo', checkoutCtrl.paggoWebhook);

// Public checkout pages
router.get('/:registrationId', checkoutCtrl.showCheckout);
router.post('/:registrationId/pay', checkoutCtrl.processPayment);

module.exports = router;
