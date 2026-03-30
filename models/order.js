const { pool } = require('../config/database');

// Generate a unique order number like ORD-20260325-XXXX
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}

module.exports = {
  async create(data) {
    const orderNumber = generateOrderNumber();
    const result = await pool.query(
      `INSERT INTO orders
        (order_number, registration_id, course_id, course_date_id,
         customer_name, customer_email, customer_phone, customer_company,
         subtotal, tax_rate, tax_amount, total, currency, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        orderNumber, data.registration_id, data.course_id, data.course_date_id || null,
        data.customer_name, data.customer_email, data.customer_phone || null, data.customer_company || null,
        data.subtotal, data.tax_rate, data.tax_amount, data.total, data.currency || 'GTQ',
        'pending'
      ]
    );
    return result.rows[0];
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0];
  },

  async getByOrderNumber(orderNumber) {
    const result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    return result.rows[0];
  },

  async getByRegistrationId(registrationId) {
    const result = await pool.query('SELECT * FROM orders WHERE registration_id = $1', [registrationId]);
    return result.rows[0];
  },

  async getAll(filters = {}) {
    let query = `
      SELECT o.*, c.name AS course_name, c.acronym
      FROM orders o
      LEFT JOIN courses c ON o.course_id = c.course_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filters.payment_status) {
      query += ` AND o.payment_status = $${idx++}`;
      params.push(filters.payment_status);
    }
    if (filters.course_id) {
      query += ` AND o.course_id = $${idx++}`;
      params.push(filters.course_id);
    }
    if (filters.search) {
      query += ` AND (o.customer_name ILIKE $${idx} OR o.customer_email ILIKE $${idx} OR o.order_number ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    query += ' ORDER BY o.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${idx++}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  },

  async updatePaymentStatus(id, status, paymentData = {}) {
    const result = await pool.query(
      `UPDATE orders SET
        payment_status = $1,
        payment_method = COALESCE($2, payment_method),
        payment_reference = COALESCE($3, payment_reference),
        paggo_transaction_id = COALESCE($4, paggo_transaction_id),
        paggo_response = COALESCE($5::jsonb, paggo_response),
        paid_at = CASE WHEN $6 = 'paid' THEN NOW() ELSE paid_at END,
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        status,
        paymentData.payment_method || null,
        paymentData.payment_reference || null,
        paymentData.paggo_transaction_id || null,
        paymentData.paggo_response ? JSON.stringify(paymentData.paggo_response) : null,
        status,
        id
      ]
    );
    return result.rows[0];
  },

  async updateRegistrationId(id, registrationId) {
    await pool.query(
      'UPDATE orders SET registration_id = $1, updated_at = NOW() WHERE id = $2',
      [registrationId, id]
    );
  },

  async getByPaggoLinkId(paggoLinkId) {
    const result = await pool.query(
      'SELECT * FROM orders WHERE paggo_transaction_id = $1 LIMIT 1',
      [String(paggoLinkId)]
    );
    return result.rows[0];
  },

  async updateCustomerInfo(id, info) {
    await pool.query(
      `UPDATE orders SET
        customer_name  = COALESCE($1, customer_name),
        customer_email = COALESCE($2, customer_email),
        customer_phone = COALESCE($3, customer_phone),
        updated_at = NOW()
       WHERE id = $4`,
      [info.customer_name || null, info.customer_email || null, info.customer_phone || null, id]
    );
  },

  async updateAdminNotes(id, notes) {
    const result = await pool.query(
      'UPDATE orders SET admin_notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [notes, id]
    );
    return result.rows[0];
  },

  async getStats() {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid_orders,
        COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_orders,
        COUNT(*) FILTER (WHERE payment_status = 'failed') AS failed_orders,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS total_revenue
      FROM orders
    `);
    return result.rows[0];
  }
};
