const express     = require('express');
const router      = express.Router();
const hardcoded   = require('../config/courses');
const CourseDb    = require('../models/courseDb');
const PageContent = require('../models/pageContent');
const Testimonial = require('../models/testimonial');

async function getCourses() {
  try {
    const dbCourses = await CourseDb.getAll();
    if (dbCourses.length > 0) {
      const map = {};
      for (const c of dbCourses) {
        map[c.course_id] = {
          id: c.course_id, name: c.name, acronym: c.acronym,
          level: c.level, duration: c.duration,
          shortDescription: c.short_description || c.tagline || '',
          color: hardcoded[c.course_id]?.color || '#6b46c1',
          icon:  hardcoded[c.course_id]?.icon  || 'fa-book'
        };
      }
      return map;
    }
  } catch { /* DB not ready */ }
  return hardcoded;
}

router.get('/', async (req, res) => {
  const [courses, content, testimonials] = await Promise.all([
    getCourses(),
    PageContent.getAll().catch(() => PageContent.defaults),
    Testimonial.getAll().catch(() => [])
  ]);

  res.render('index', {
    title: 'Kanban.UNO - Master the Kanban Method',
    currentPage: 'home',
    courses,
    content,
    testimonials
  });
});

router.get('/about', async (req, res) => {
  const content = await PageContent.getAll().catch(() => PageContent.defaults);
  res.render('about', {
    title: 'About Us - Kanban.UNO',
    currentPage: 'about',
    content
  });
});

router.get('/debug-dates', async (req, res) => {
  const { pool } = require('../config/database');
  const r1 = await pool.query('SELECT id, course_id, start_date, status, is_active FROM course_dates');
  const r2 = await pool.query("SELECT id, course_id, start_date, status, is_active FROM course_dates WHERE course_id = 'tkp' AND start_date >= CURRENT_DATE AND status = 'upcoming' AND is_active = true");
  res.json({ all: r1.rows, filtered: r2.rows });
});

router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us - Kanban.UNO',
    currentPage: 'contact'
  });
});

module.exports = router;
