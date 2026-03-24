const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { createRegistration, getAllRegistrations } = require('../controllers/registrationController');

// Rate limit: max 3 registration submissions per hour per IP
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registrationLimiter, createRegistration);
router.get('/registrations', getAllRegistrations);

// POST /api/checkout (DISABLED - for future Stripe integration)
// router.post('/checkout', checkoutController.createSession);

module.exports = router;
