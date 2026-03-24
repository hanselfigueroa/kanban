const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const AdminUser = {
  async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, created_at, last_login FROM admin_users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create({ username, email, password }) {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO admin_users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, password_hash]
    );
    return result.rows[0];
  },

  async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  },

  async updateLastLogin(id) {
    await pool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
      [id]
    );
  }
};

module.exports = AdminUser;
