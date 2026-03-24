/**
 * Create Admin User Script
 * Run: node scripts/create-admin.js
 * Or with env vars: ADMIN_USERNAME=admin ADMIN_EMAIL=admin@kanban.uno ADMIN_PASSWORD=secret node scripts/create-admin.js
 */
require('dotenv').config();
const readline = require('readline');
const { pool } = require('../config/database');
const AdminUser = require('../models/adminUser');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n🔐 Kanban.UNO — Create Admin User\n');

  try {
    const username = process.env.ADMIN_USERNAME || await ask('Username: ');
    const email    = process.env.ADMIN_EMAIL    || await ask('Email: ');
    const password = process.env.ADMIN_PASSWORD || await ask('Password (min 8 chars): ');

    if (!username || !email || !password) {
      console.error('❌ All fields are required.');
      process.exit(1);
    }
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters.');
      process.exit(1);
    }

    const admin = await AdminUser.create({ username, email, password });
    console.log(`\n✅ Admin user created:`);
    console.log(`   Username : ${admin.username}`);
    console.log(`   Email    : ${admin.email}`);
    console.log(`   ID       : ${admin.id}`);
    console.log('\n🚀 Login at: /admin/login\n');
  } catch (err) {
    if (err.code === '23505') {
      console.error('❌ Username or email already exists.');
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
