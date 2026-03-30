const express = require('express');
const router = express.Router();
const checkoutCtrl = require('../controllers/checkoutController');

// These must come before /:registrationId to avoid catch-all conflict
router.get('/success/:orderNumber', checkoutCtrl.showSuccess);
router.post('/webhook/paggo', checkoutCtrl.paggoWebhook);

// Public checkout pages — :courseId is the course_id string (e.g. 'tkp')
router.get('/:courseId/start', checkoutCtrl.startCheckout);
router.get('/:courseId', checkoutCtrl.showCheckout);
router.post('/:courseId/pay', checkoutCtrl.processPayment);

module.exports = router;
