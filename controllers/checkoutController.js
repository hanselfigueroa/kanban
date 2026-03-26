const xss = require('xss');
const SiteSettings = require('../models/siteSettings');
const Order = require('../models/order');
const CourseDb = require('../models/courseDb');
const CourseDate = require('../models/courseDate');
const Registration = require('../models/registration');

// ── Show checkout page ──────────────────────────────────────────────────────
exports.showCheckout = async (req, res) => {
  try {
    const enabled = await SiteSettings.isCheckoutEnabled();
    if (!enabled) {
      return res.render('checkout/disabled', {
        title: 'Checkout Unavailable - Kanban.UNO'
      });
    }

    const registrationId = req.params.registrationId;
    const registration = await Registration.getById(registrationId);
    if (!registration) return res.status(404).send('Registration not found');

    // Check if order already exists for this registration
    const existingOrder = await Order.getByRegistrationId(registrationId);
    if (existingOrder && existingOrder.payment_status === 'paid') {
      return res.redirect(`/checkout/success/${existingOrder.order_number}`);
    }

    const course = await CourseDb.getById(registration.course_selected);
    let courseDate = null;
    if (registration.course_date_id) {
      courseDate = await CourseDate.getById(registration.course_date_id);
    }

    const settings = await SiteSettings.getCheckoutSettings();
    const price = course ? parseFloat(course.price) || 0 : 0;
    const taxRate = parseFloat(settings.checkout_tax_rate) || 0;
    const taxAmount = Math.round(price * taxRate * 100) / 100;
    const total = Math.round((price + taxAmount) * 100) / 100;

    res.render('checkout/index', {
      title: 'Checkout - Kanban.UNO',
      registration,
      course,
      courseDate,
      settings,
      pricing: { subtotal: price, taxRate, taxAmount, total, currency: settings.checkout_currency || 'GTQ' }
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).send('Error loading checkout');
  }
};

// ── Process payment ─────────────────────────────────────────────────────────
exports.processPayment = async (req, res) => {
  try {
    const enabled = await SiteSettings.isCheckoutEnabled();
    if (!enabled) return res.status(400).json({ success: false, error: 'Checkout is disabled' });

    const registrationId = req.params.registrationId;
    const registration = await Registration.getById(registrationId);
    if (!registration) return res.status(404).json({ success: false, error: 'Registration not found' });

    const course = await CourseDb.getById(registration.course_selected);
    const settings = await SiteSettings.getCheckoutSettings();

    const price = course ? parseFloat(course.price) || 0 : 0;
    const taxRate = parseFloat(settings.checkout_tax_rate) || 0;
    const taxAmount = Math.round(price * taxRate * 100) / 100;
    const total = Math.round((price + taxAmount) * 100) / 100;

    // Create order record
    const order = await Order.create({
      registration_id: registrationId,
      course_id: registration.course_selected,
      course_date_id: registration.course_date_id || null,
      customer_name: registration.full_name,
      customer_email: registration.email,
      customer_phone: registration.phone,
      customer_company: registration.company,
      subtotal: price,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      currency: settings.checkout_currency || 'GTQ'
    });

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │ PAGGO API INTEGRATION PLACEHOLDER                                  │
    // │                                                                    │
    // │ When ready to integrate with Paggo, replace this section with:     │
    // │                                                                    │
    // │ 1. Call Paggo API to create a payment:                             │
    // │    POST {paggo_api_url}/payments                                   │
    // │    Headers: Authorization: Bearer {paggo_api_key}                  │
    // │    Body: {                                                         │
    // │      merchant_id: settings.paggo_merchant_id,                      │
    // │      amount: total,                                                │
    // │      currency: settings.checkout_currency,                         │
    // │      description: `${course.name} - ${order.order_number}`,        │
    // │      reference: order.order_number,                                │
    // │      callback_url: `${BASE_URL}/checkout/webhook/paggo`,           │
    // │      return_url: `${BASE_URL}/checkout/success/${order.order_number}`│
    // │    }                                                               │
    // │                                                                    │
    // │ 2. Paggo will return a payment URL or payment token                │
    // │    Redirect the user to Paggo's payment page, OR                   │
    // │    Return the payment link for the frontend to handle              │
    // │                                                                    │
    // │ 3. Paggo sends a webhook to /checkout/webhook/paggo on completion  │
    // │    Update order status to 'paid' or 'failed'                       │
    // └─────────────────────────────────────────────────────────────────────┘

    // For now: return the order info so the admin can manually process
    // or connect to Paggo later
    res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        currency: order.currency
      },
      // When Paggo is integrated, this will be the payment URL:
      payment_url: null,
      message: 'Order created. Payment integration pending.'
    });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ success: false, error: 'Payment processing failed' });
  }
};

// ── Paggo webhook handler ───────────────────────────────────────────────────
exports.paggoWebhook = async (req, res) => {
  try {
    // ┌─────────────────────────────────────────────────────────────────────┐
    // │ PAGGO WEBHOOK PLACEHOLDER                                          │
    // │                                                                    │
    // │ Paggo will POST to this endpoint when payment status changes.      │
    // │                                                                    │
    // │ 1. Verify webhook signature using paggo_api_key                    │
    // │ 2. Extract transaction_id and status from Paggo payload            │
    // │ 3. Find order by reference (order_number)                          │
    // │ 4. Update order payment status accordingly                         │
    // │ 5. Update registration status if payment succeeded                 │
    // └─────────────────────────────────────────────────────────────────────┘

    const { reference, status, transaction_id } = req.body;

    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    const order = await Order.getByOrderNumber(reference);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const paymentStatus = status === 'approved' ? 'paid' : (status === 'declined' ? 'failed' : 'pending');

    await Order.updatePaymentStatus(order.id, paymentStatus, {
      paggo_transaction_id: transaction_id,
      payment_method: 'paggo',
      paggo_response: req.body
    });

    // Update registration status if paid
    if (paymentStatus === 'paid') {
      await Registration.updateStatus(order.registration_id, 'confirmed');
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ── Success page ────────────────────────────────────────────────────────────
exports.showSuccess = async (req, res) => {
  try {
    const order = await Order.getByOrderNumber(req.params.orderNumber);
    if (!order) return res.status(404).send('Order not found');

    const course = await CourseDb.getById(order.course_id);
    const settings = await SiteSettings.getCheckoutSettings();

    res.render('checkout/success', {
      title: 'Order Confirmed - Kanban.UNO',
      order,
      course,
      successMessage: settings.checkout_success_message
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};
