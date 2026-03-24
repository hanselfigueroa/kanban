/**
 * Migration: 001_admin_tables.js
 * Creates all admin-related tables and seeds initial data from hardcoded config
 * Run with: node migrations/001_admin_tables.js
 */
require('dotenv').config();
const { pool } = require('../config/database');
const hardcodedCourses = require('../config/courses');

async function migrate() {
  const client = await pool.connect();
  console.log('🚀 Starting migration 001_admin_tables...');

  try {
    await client.query('BEGIN');

    // ── 1. admin_users ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);
    console.log('✅ admin_users table ready');

    // ── 2. courses ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        course_id VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        acronym VARCHAR(10) NOT NULL,
        tagline VARCHAR(255),
        level VARCHAR(50),
        duration VARCHAR(50),
        short_description TEXT,
        full_description TEXT,
        who_should_attend TEXT,
        learning_objectives TEXT,
        prerequisites TEXT,
        certification_info TEXT,
        price DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ courses table ready');

    // ── 3. course_curriculum ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_curriculum (
        id SERIAL PRIMARY KEY,
        course_id VARCHAR(10) REFERENCES courses(course_id) ON DELETE CASCADE,
        module_number INTEGER,
        module_title VARCHAR(255),
        module_description TEXT,
        topics TEXT,
        duration VARCHAR(50),
        display_order INTEGER DEFAULT 0
      );
    `);
    console.log('✅ course_curriculum table ready');

    // ── 4. course_dates ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_dates (
        id SERIAL PRIMARY KEY,
        course_id VARCHAR(10) REFERENCES courses(course_id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE,
        format VARCHAR(50) DEFAULT 'Live Virtual',
        location VARCHAR(255),
        timezone VARCHAR(50) DEFAULT 'UTC',
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'upcoming',
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ course_dates table ready');

    // ── 5. page_content ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_content (
        id SERIAL PRIMARY KEY,
        section_key VARCHAR(100) UNIQUE NOT NULL,
        section_title VARCHAR(255),
        content TEXT,
        content_type VARCHAR(50) DEFAULT 'text',
        page VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES admin_users(id)
      );
    `);
    console.log('✅ page_content table ready');

    // ── 6. testimonials ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_title VARCHAR(255),
        client_company VARCHAR(255),
        testimonial_text TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        photo_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ testimonials table ready');

    // ── 7. Update registrations table ─────────────────────────────────────
    await client.query(`
      ALTER TABLE registrations
        ADD COLUMN IF NOT EXISTS course_date_id INTEGER REFERENCES course_dates(id),
        ADD COLUMN IF NOT EXISTS admin_notes TEXT,
        ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    // Update status default if needed
    await client.query(`
      ALTER TABLE registrations
        ALTER COLUMN status SET DEFAULT 'pending';
    `).catch(() => {}); // ignore if already set
    console.log('✅ registrations table updated');

    // ── 8. Seed courses from hardcoded config ────────────────────────────────
    const existing = await client.query('SELECT COUNT(*) FROM courses');
    if (parseInt(existing.rows[0].count) === 0) {
      console.log('📦 Seeding courses from config...');
      let order = 0;
      for (const [key, course] of Object.entries(hardcodedCourses)) {
        await client.query(
          `INSERT INTO courses
            (course_id, name, acronym, level, duration, short_description,
             full_description, who_should_attend, learning_objectives, is_active, display_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
           ON CONFLICT (course_id) DO NOTHING`,
          [
            course.id, course.name, course.acronym, course.level, course.duration,
            course.shortDescription, course.description,
            JSON.stringify(course.audience), JSON.stringify(course.outcomes),
            order++
          ]
        );

        // Seed curriculum modules
        for (let i = 0; i < course.curriculum.length; i++) {
          const mod = course.curriculum[i];
          await client.query(
            `INSERT INTO course_curriculum (course_id, module_number, module_title, topics, display_order)
             VALUES ($1,$2,$3,$4,$5)`,
            [course.id, i + 1, mod.title.replace(/^Module \d+:\s*/, ''),
             mod.topics.join('\n'), i]
          );
        }
        console.log(`  ✅ Seeded course: ${course.name}`);
      }

      // Seed sample testimonials
      const testimonials = [
        ['Marcus Chen', 'VP of Engineering', 'CloudScale', '"Kanban.UNO transformed our engineering department. We reduced our lead time by 40% in just two months."', 5, 1],
        ['Elena Rodriguez', 'Product Manager', 'FinTech', '"Finally, a course that treats productivity as a science rather than a list of hacks. Worth every penny."', 5, 2],
        ['David Wu', 'Founder', 'DesignLab', '"The methodology is crystal clear. I\'ve implemented these boards across my entire agency with measurable results."', 5, 3],
        ['Anika Patel', 'Senior Consultant', 'AgileWorks', '"After completing KSI, I was able to coach multiple teams through their Kanban maturity journey. Truly advanced."', 5, 4],
      ];
      for (const [name, title, company, text, rating, order] of testimonials) {
        await client.query(
          `INSERT INTO testimonials (client_name, client_title, client_company, testimonial_text, rating, display_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [name, title, company, text, rating, order]
        );
      }
      console.log('✅ Seeded sample testimonials');
    } else {
      console.log('ℹ️  Courses already seeded — skipping');
    }

    await client.query('COMMIT');
    console.log('\n🎉 Migration 001 completed successfully!');
    console.log('\nNext step: Create your admin user:');
    console.log('  node scripts/create-admin.js\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
