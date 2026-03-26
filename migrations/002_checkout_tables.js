/**
 * Migration: 002_checkout_tables.js
 * Creates orders table and site_settings table for checkout/payment flow
 * Run with: node migrations/002_checkout_tables.js
 */
require('dotenv').config();
const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  console.log('🚀 Starting migration 002_checkout_tables...');

  try {
    await client.query('BEGIN');

    // ── 1. site_settings ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ site_settings table created');

    // Seed default checkout settings
    const defaults = [
      ['checkout_enabled', 'false', 'Enable/disable the checkout payment flow'],
      ['checkout_currency', 'GTQ', 'Currency code (GTQ for Guatemalan Quetzal)'],
      ['checkout_tax_rate', '0.12', 'Tax rate as decimal (0.12 = 12% IVA)'],
      ['paggo_api_url', '', 'Paggo API base URL'],
      ['paggo_api_key', '', 'Paggo API key (secret)'],
      ['paggo_merchant_id', '', 'Paggo merchant ID'],
      ['checkout_success_message', 'Your payment has been processed successfully. You will receive a confirmation email shortly.', 'Message shown after successful payment'],
      ['checkout_terms', 'By completing this purchase, you agree to our terms and conditions. Cancellations must be made at least 7 days before the course start date for a full refund.', 'Terms shown on checkout page'],
    ];
    for (const [key, value, description] of defaults) {
      await client.query(
        `INSERT INTO site_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [key, value, description]
      );
    }
    console.log('✅ Default checkout settings seeded');

    // ── 2. orders ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(20) UNIQUE NOT NULL,
        registration_id INTEGER REFERENCES registrations(id) ON DELETE SET NULL,
        course_id VARCHAR(10) REFERENCES courses(course_id) ON DELETE SET NULL,
        course_date_id INTEGER REFERENCES course_dates(id) ON DELETE SET NULL,

        -- Customer info (denormalized for order history)
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        customer_company VARCHAR(255),

        -- Pricing
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
        tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'GTQ',

        -- Payment
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        paggo_transaction_id VARCHAR(255),
        paggo_response JSONB,

        -- Meta
        notes TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
      );
    `);
    console.log('✅ orders table created');

    // Index for quick lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
    `);
    console.log('✅ orders indexes created');

    await client.query('COMMIT');
    console.log('\n🎉 Migration 002 complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 002 failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
