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
      currentPage: '',
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

    // ── Call Paggo API to generate a payment link ──────────────────────────
    const apiKey = settings.paggo_api_key;
    const apiUrl = (settings.paggo_api_url || 'https://api.paggoapp.com/api').replace(/\/$/, '');

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const paggoRes = await fetch(`${apiUrl}/center/transactions/create-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({
        concept: `${course ? course.name : registration.course_selected} - ${order.order_number}`,
        amount: total,
        customerName: registration.full_name,
        email: registration.email,
        metadata: {
          redirectUrl: `${baseUrl}/checkout/success/${order.order_number}`,
          custom: {
            orderId: order.order_number,
            registrationId: String(registrationId)
          }
        }
      })
    });

    const paggoData = await paggoRes.json();

    if (!paggoRes.ok || !paggoData.result?.link) {
      console.error('Paggo API error:', paggoData);
      await Order.updatePaymentStatus(order.id, 'failed', { paggo_response: paggoData });
      return res.status(502).json({ success: false, error: 'Payment gateway error. Please try again.' });
    }

    // Store Paggo link ID so the webhook can match it back to this order
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

    if (!event || !data) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log(`Paggo webhook received: ${event}`, data.linkId);

    // Find our order using the Paggo link ID stored at payment creation
    const order = await Order.getByPaggoLinkId(String(data.linkId));
    if (!order) {
      console.warn('Paggo webhook: no order found for linkId', data.linkId);
      // Return 200 so Paggo doesn't keep retrying for unknown links
      return res.json({ received: true });
    }

    if (event === 'LINK_PAYED_SUCCESS') {
      await Order.updatePaymentStatus(order.id, 'paid', {
        paggo_transaction_id: String(data.linkId),
        payment_method: `paggo${data.paymentMethod?.brand ? '_' + data.paymentMethod.brand.toLowerCase() : ''}`,
        paggo_response: req.body
      });
      await Registration.updateStatus(order.registration_id, 'confirmed');

    } else if (event === 'LINK_WRONG_PAYMENT') {
      await Order.updatePaymentStatus(order.id, 'failed', {
        paggo_response: req.body
      });

    } else if (event === 'LINK_REVERSED_SUCCESS') {
      await Order.updatePaymentStatus(order.id, 'refunded', {
        paggo_response: req.body
      });
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
