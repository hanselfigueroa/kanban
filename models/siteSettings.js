const { pool } = require('../config/database');

module.exports = {
  async get(key) {
    const result = await pool.query('SELECT value FROM site_settings WHERE key = $1', [key]);
    return result.rows[0] ? result.rows[0].value : null;
  },

  async getMultiple(keys) {
    const result = await pool.query(
      'SELECT key, value FROM site_settings WHERE key = ANY($1)',
      [keys]
    );
    const map = {};
    result.rows.forEach(r => { map[r.key] = r.value; });
    return map;
  },

  async getAll() {
    const result = await pool.query(
      'SELECT key, value, description, updated_at FROM site_settings ORDER BY key'
    );
    return result.rows;
  },

  async set(key, value) {
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
  },

  async setMultiple(settings) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async isCheckoutEnabled() {
    const val = await this.get('checkout_enabled');
    return val === 'true';
  },

  async getCheckoutSettings() {
    return this.getMultiple([
      'checkout_enabled',
      'checkout_currency',
      'checkout_tax_rate',
      'paggo_api_url',
      'paggo_api_key',
      'paggo_merchant_id',
      'checkout_success_message',
      'checkout_terms',
      'show_registration_form'
    ]);
  }
};
