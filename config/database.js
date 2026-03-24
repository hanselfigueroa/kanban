const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create registrations table if it doesn't exist
async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      company VARCHAR(255),
      course_selected VARCHAR(10) NOT NULL,
      preferred_format VARCHAR(50),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending'
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('Database initialized: registrations table ready');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

module.exports = { pool, initializeDatabase };
