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
        title: 'Checkout Unavailable - Kanban.UNO',
        currentPage: ''
      });
    }

    const course = await CourseDb.getById(req.params.courseId);
    if (!course) return res.status(404).send('Course not found');

    let courseDate = null;
    if (req.query.date_id) {
      courseDate = await CourseDate.getById(req.query.date_id);
    }

    const settings = await SiteSettings.getCheckoutSettings();
    const price = parseFloat(course.price) || 0;
    const taxRate = parseFloat(settings.checkout_tax_rate) || 0;
    const taxAmount = Math.round(price * taxRate * 100) / 100;
    const total = Math.round((price + taxAmount) * 100) / 100;

    res.render('checkout/index', {
      title: 'Checkout - Kanban.UNO',
      currentPage: '',
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

    const course = await CourseDb.getById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    // Customer info submitted from checkout form
    const full_name  = xss((req.body.full_name  || '').trim());
    const email      = xss((req.body.email      || '').trim().toLowerCase());
    const phone      = req.body.phone    ? xss(req.body.phone.trim())    : null;
    const company    = req.body.company  ? xss(req.body.company.trim())  : null;
    const message    = req.body.message  ? xss(req.body.message.trim())  : null;
    const course_date_id = req.body.course_date_id ? parseInt(req.body.course_date_id) || null : null;

    if (!full_name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const settings = await SiteSettings.getCheckoutSettings();
    const price    = parseFloat(course.price) || 0;
    const taxRate  = parseFloat(settings.checkout_tax_rate) || 0;
    const taxAmount = Math.round(price * taxRate * 100) / 100;
    const total    = Math.round((price + taxAmount) * 100) / 100;

    // Create order — registration created later on payment success
    const order = await Order.create({
      registration_id: null,
      course_id: course.course_id,
      course_date_id,
      customer_name: full_name,
      customer_email: email,
      customer_phone: phone,
      customer_company: company,
      subtotal: price,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      currency: settings.checkout_currency || 'GTQ'
    });

    // ── Free enrollment (no payment needed) ──────────────────────────────────
    if (total <= 0) {
      const registration = await Registration.create({
        full_name,
        email,
        phone,
        company,
        course_selected: course.course_id,
        course_date_id: course_date_id || null,
        preferred_format: null,
        message: null
      });
      await Registration.updateStatus(registration.id, 'confirmed');
      await Order.updateRegistrationId(order.id, registration.id);
      await Order.updatePaymentStatus(order.id, 'paid', { payment_method: 'free' });
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      return res.json({
        success: true,
        redirect_url: `${baseUrl}/checkout/success/${order.order_number}`,
        order: { id: order.id, order_number: order.order_number }
      });
    }

    // ── Call Paggo API ────────────────────────────────────────────────────────
    const apiKey = settings.paggo_api_key;
    const apiUrl = (settings.paggo_api_url || 'https://api.paggoapp.com/api').replace(/\/$/, '');

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const paggoRes = await fetch(`${apiUrl}/center/transactions/create-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        concept: `${course.name} - ${order.order_number}`,
        amount: total,
        customerName: full_name,
        email,
        metadata: {
          redirectUrl: `${baseUrl}/checkout/success/${order.order_number}`,
          custom: { orderId: order.order_number }
        }
      })
    });

    const paggoData = await paggoRes.json();

    if (!paggoRes.ok || !paggoData.result?.link) {
      console.error('Paggo API error:', paggoData);
      await Order.updatePaymentStatus(order.id, 'failed', { paggo_response: paggoData });
      return res.status(502).json({ success: false, error: 'Payment gateway error. Please try again.' });
    }

    await Order.updatePaymentStatus(order.id, 'pending', {
      paggo_transaction_id: String(paggoData.result.id),
      payment_method: 'paggo',
      paggo_response: paggoData
    });

    res.json({
      success: true,
      payment_url: paggoData.result.link,
      order: { id: order.id, order_number: order.order_number }
    });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ success: false, error: 'Payment processing failed' });
  }
};

// ── Paggo webhook handler ───────────────────────────────────────────────────
exports.paggoWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) return res.status(400).json({ error: 'Invalid webhook payload' });

    console.log(`Paggo webhook received: ${event}`, data.linkId);

    const order = await Order.getByPaggoLinkId(String(data.linkId));
    if (!order) {
      console.warn('Paggo webhook: no order found for linkId', data.linkId);
      return res.json({ received: true });
    }

    if (event === 'LINK_PAYED_SUCCESS') {
      // Create registration now that payment is confirmed
      const registration = await Registration.create({
        full_name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        company: order.customer_company,
        course_selected: order.course_id,
        course_date_id: order.course_date_id || null,
        preferred_format: null,
        message: null
      });

      await Registration.updateStatus(registration.id, 'confirmed');
      await Order.updateRegistrationId(order.id, registration.id);
      await Order.updatePaymentStatus(order.id, 'paid', {
        paggo_transaction_id: String(data.linkId),
        payment_method: `paggo${data.paymentMethod?.brand ? '_' + data.paymentMethod.brand.toLowerCase() : ''}`,
        paggo_response: req.body
      });

    } else if (event === 'LINK_WRONG_PAYMENT') {
      await Order.updatePaymentStatus(order.id, 'failed', { paggo_response: req.body });

    } else if (event === 'LINK_REVERSED_SUCCESS') {
      await Order.updatePaymentStatus(order.id, 'refunded', { paggo_response: req.body });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Paggo webhook error:', err);
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
      currentPage: '',
      order,
      course,
      successMessage: settings.checkout_success_message
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};
