const Order = require('../../models/order');
const CourseDb = require('../../models/courseDb');

exports.listOrders = async (req, res) => {
  try {
    const filters = {
      payment_status: req.query.status || '',
      course_id: req.query.course || '',
      search: req.query.search || ''
    };
    const [orders, courses, stats] = await Promise.all([
      Order.getAll(filters),
      CourseDb.getAll(),
      Order.getStats()
    ]);
    res.render('admin/orders/index', {
      title: 'Orders - Admin',
      currentPage: 'orders',
      pageTitle: 'Orders',
      adminUsername: req.session.adminUsername,
      orders,
      courses,
      stats,
      filters
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading orders');
  }
};

exports.showOrder = async (req, res) => {
  try {
    const order = await Order.getById(req.params.id);
    if (!order) return res.status(404).send('Order not found');
    res.render('admin/orders/detail', {
      title: `Order ${order.order_number} - Admin`,
      currentPage: 'orders',
      pageTitle: `Order ${order.order_number}`,
      adminUsername: req.session.adminUsername,
      order
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { payment_status, admin_notes } = req.body;
    if (payment_status) {
      await Order.updatePaymentStatus(req.params.id, payment_status);
    }
    if (admin_notes !== undefined) {
      await Order.updateAdminNotes(req.params.id, admin_notes);
    }
    res.redirect(`/admin/orders/${req.params.id}?success=updated`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/orders/${req.params.id}?error=failed`);
  }
};
