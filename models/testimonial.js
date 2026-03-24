const { pool } = require('../config/database');

const Testimonial = {
  async getAll({ includeInactive = false } = {}) {
    const where = includeInactive ? '' : 'WHERE is_active = true';
    const result = await pool.query(
      `SELECT * FROM testimonials ${where} ORDER BY display_order ASC, id ASC`
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query('SELECT * FROM testimonials WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { client_name, client_title, client_company, testimonial_text, rating = 5, photo_url, is_active = true, display_order = 0 } = data;
    const result = await pool.query(
      `INSERT INTO testimonials (client_name, client_title, client_company, testimonial_text, rating, photo_url, is_active, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [client_name, client_title, client_company, testimonial_text, rating, photo_url, is_active, display_order]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { client_name, client_title, client_company, testimonial_text, rating, photo_url, is_active, display_order } = data;
    const result = await pool.query(
      `UPDATE testimonials SET client_name=$1, client_title=$2, client_company=$3,
       testimonial_text=$4, rating=$5, photo_url=$6, is_active=$7, display_order=$8
       WHERE id=$9 RETURNING *`,
      [client_name, client_title, client_company, testimonial_text, rating, photo_url, is_active, display_order, id]
    );
    return result.rows[0];
  },

  async toggleActive(id, isActive) {
    await pool.query('UPDATE testimonials SET is_active = $1 WHERE id = $2', [isActive, id]);
  },

  async delete(id) {
    await pool.query('DELETE FROM testimonials WHERE id = $1', [id]);
  },

  async reorder(orderedIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, display_order } of orderedIds) {
        await client.query('UPDATE testimonials SET display_order = $1 WHERE id = $2', [display_order, id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

module.exports = Testimonial;
