const { pool } = require('../config/database');

const Registration = {
  // Create a new registration
  async create({ full_name, email, phone, company, course_selected, course_date_id, preferred_format, message }) {
    const query = `
      INSERT INTO registrations (full_name, email, phone, company, course_selected, course_date_id, preferred_format, message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [full_name, email, phone, company, course_selected, course_date_id || null, preferred_format, message];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Get all registrations (admin)
  async getAll() {
    const query = 'SELECT * FROM registrations ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  },

  // Get registration by ID
  async getById(id) {
    const query = 'SELECT * FROM registrations WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Update registration status
  async updateStatus(id, status) {
    const query = 'UPDATE registrations SET status = $1 WHERE id = $2 RETURNING *;';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
};

module.exports = Registration;
